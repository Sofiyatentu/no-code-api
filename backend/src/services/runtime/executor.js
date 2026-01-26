// runtime/flowEngine.js
import vm from "vm"
import { performance } from "perf_hooks"
import mongoose from "mongoose"

// === SECURITY & PERFORMANCE CONFIG ===
const MAX_EXECUTION_TIME_MS = 5000 // 5s max per flow
const MAX_MEMORY_MB = 100 // Memory limit
const MAX_QUERY_LIMIT = 100 // Max MongoDB query results
const ALLOWED_GLOBALS = {
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  console: { log: () => { } }, // No-op logging
}

// === MAIN EXECUTION ===
export const executeFlow = async (flow, requestContext, userMongoConnection) => {
  const startTime = performance.now()
  const { method, path, headers, body, params, query } = requestContext

  const context = {
    request: {
      method,
      path,
      headers: structuredClone(headers), // Prevent prototype pollution
      body: structuredClone(body),
      params,
      query,
    },
    response: null,
    variables: {},
    errors: [],
    visited: new Set(),
  }

  let timeoutId

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Flow execution timed out after 5 seconds"))
      }, MAX_EXECUTION_TIME_MS)
    })

    const executionPromise = (async () => {
      const startNode = flow.nodes.find((n) => n.type === "httpMethod")
      if (!startNode) {
        throw Object.assign(new Error("No HTTP method start node found"), { status: 400 })
      }

      if (startNode.data?.method && startNode.data.method !== method) {
        throw Object.assign(new Error(`Method Not Allowed: ${method}`), { status: 405 })
      }

      // Attach user-specific MongoDB connection
      context.mongoConnection = userMongoConnection

      await traverseFlow(flow, startNode, context, startTime)

      if (!context.response) {
        throw Object.assign(new Error("No response node reached"), { status: 500 })
      }

      return {
        status: context.response.status || 200,
        headers: {
          "Content-Type": "application/json",
          ...context.response.headers,
        },
        body: context.response.body ?? { success: true },
      }
    })()

    return await Promise.race([executionPromise, timeoutPromise])
  } catch (error) {
    console.error("[Flow Engine] Execution failed:", {
      flowId: flow.flowId,
      error: error.message,
      stack: error.stack,
    })
    return {
      status: error.status || 500,
      headers: { "Content-Type": "application/json" },
      body: {
        error: error.message || "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && { details: context.errors }),
      },
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

// === TRAVERSAL ===
const traverseFlow = async (flow, node, context, startTime) => {
  if (!node) return
  if (node.type === "response") return

  if (context.visited.has(node.id)) {
    throw Object.assign(new Error(`Infinite loop detected at node: ${node.data?.label || node.id}`), {
      status: 500,
    })
  }
  context.visited.add(node.id)

  if (performance.now() - startTime > MAX_EXECUTION_TIME_MS) {
    throw Object.assign(new Error("Flow execution exceeded time limit"), { status: 500 })
  }

  try {
    switch (node.type) {
      case "httpMethod":
        context.variables.request = structuredClone(context.request)
        break

      case "mongoFind":
        await executeMongoFind(node, context)
        break
      case "mongoInsert":
        await executeMongoInsert(node, context)
        break
      case "mongoUpdate":
        await executeMongoUpdate(node, context)
        break
      case "mongoDelete":
        await executeMongoDelete(node, context)
        break
      case "condition":
        return await executeCondition(flow, node, context, startTime)
      case "tryCatch":
        return await executeTryCatch(flow, node, context, startTime)
      case "transform":
        await executeTransform(node, context)
        break
      case "response":
        context.response = {
          status: node.data?.statusCode ?? 200,
          headers: safeEvaluate(node.data?.headers ?? {}, context),
          body: safeEvaluate(node.data?.body ?? {}, context),
        }
        return
      case "logging":
        await executeLogging(node, context)
        break
      case "assign":
        await executeAssign(node, context)
        break
      case "delay":
        await executeDelay(node, context)
        break
      default:
        context.errors.push(`Unsupported node type: ${node.type}`)
    }

    const edges = flow.edges.filter((e) => e.source === node.id)
    if (edges.length > 1 && !["condition", "tryCatch"].includes(node.type)) {
      throw Object.assign(new Error(`Node "${node.type}" cannot have multiple outputs`), {
        status: 500,
      })
    }

    for (const edge of edges) {
      const nextNode = flow.nodes.find((n) => n.id === edge.target)
      if (nextNode) {
        await traverseFlow(flow, nextNode, context, startTime)
      }
    }
  } catch (err) {
    context.errors.push(err.message)
    throw err
  }
}

// === SAFE EVALUATOR ===
const safeEvaluate = (expr, context) => {
  if (expr === null || expr === undefined) return expr
  if (typeof expr !== "object" && typeof expr !== "string") return expr

  if (typeof expr === "string") {
    return expr.replace(/\{\{(.+?)\}\}/g, (_, code) => {
      try {
        const sandbox = {
          ...ALLOWED_GLOBALS,
          $: context.variables,
          req: context.request,
          request: context.request,
        }

        const script = new vm.Script(`(${code.trim()})`, {
          filename: "expression.vm",
          timeout: 1000,
        })

        return script.runInNewContext(sandbox, { timeout: 1000 })
      } catch (e) {
        context.errors.push(`Expression error: ${code} → ${e.message}`)
        return null
      }
    })
  }

  if (expr && typeof expr === "object") {
    const result = Array.isArray(expr) ? [] : {}
    for (const [key, val] of Object.entries(expr)) {
      result[key] = safeEvaluate(val, context)
    }
    return result
  }

  return expr
}

// === NODE EXECUTORS ===
const executeMongoFind = async (node, context) => {
  const { collection = "items", query = {}, limit = 50, projection = {} } = node.data?.config || {}
  const evaluatedQuery = safeEvaluate(query, context)
  const evaluatedProjection = safeEvaluate(projection, context)

  try {
    if (!context.mongoConnection) {
      throw new Error("No database connection available")
    }

    const db = context.mongoConnection.db()
    const col = db.collection(collection)

    // Validate collection name to prevent injection
    if (!/^[a-zA-Z0-9_-]+$/.test(collection)) {
      throw new Error(`Invalid collection name: ${collection}`)
    }

    const results = await col
      .find(evaluatedQuery)
      .project(evaluatedProjection)
      .limit(Math.min(limit, MAX_QUERY_LIMIT))
      .toArray()

    context.variables[node.id] = results
  } catch (err) {
    throw new Error(`Find failed in "${collection}": ${err.message}`)
  }
}

const executeMongoInsert = async (node, context) => {
  const { collection = "items", document = {} } = node.data?.config || {}
  const evaluatedDoc = safeEvaluate(document, context)

  try {
    if (!context.mongoConnection) {
      throw new Error("No database connection available")
    }

    const db = context.mongoConnection.db()
    const col = db.collection(collection)

    if (!/^[a-zA-Z0-9_-]+$/.test(collection)) {
      throw new Error(`Invalid collection name: ${collection}`)
    }

    const result = await col.insertOne({
      ...evaluatedDoc,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    context.variables[node.id] = { insertedId: result.insertedId }
  } catch (err) {
    throw new Error(`Insert failed in "${collection}": ${err.message}`)
  }
}

const executeMongoUpdate = async (node, context) => {
  const { collection = "items", filter = {}, update = {}, action = "updateMany" } =
    node.data?.config || {}
  const evaluatedFilter = safeEvaluate(filter, context)
  const evaluatedUpdate = safeEvaluate(update, context)

  try {
    if (!context.mongoConnection) {
      throw new Error("No database connection available")
    }

    const db = context.mongoConnection.db()
    const col = db.collection(collection)

    if (!/^[a-zA-Z0-9_-]+$/.test(collection)) {
      throw new Error(`Invalid collection name: ${collection}`)
    }

    let result
    if (action === "updateOne") {
      result = await col.updateOne(evaluatedFilter, { $set: { ...evaluatedUpdate, updatedAt: new Date() } })
    } else {
      result = await col.updateMany(evaluatedFilter, { $set: { ...evaluatedUpdate, updatedAt: new Date() } })
    }

    context.variables[node.id] = {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    }
  } catch (err) {
    throw new Error(`Update failed in "${collection}": ${err.message}`)
  }
}

const executeMongoDelete = async (node, context) => {
  const { collection = "items", filter = {}, action = "deleteMany" } = node.data?.config || {}
  const evaluatedFilter = safeEvaluate(filter, context)

  try {
    if (!context.mongoConnection) {
      throw new Error("No database connection available")
    }

    const db = context.mongoConnection.db()
    const col = db.collection(collection)

    if (!/^[a-zA-Z0-9_-]+$/.test(collection)) {
      throw new Error(`Invalid collection name: ${collection}`)
    }

    let result
    if (action === "deleteOne") {
      result = await col.deleteOne(evaluatedFilter)
    } else {
      result = await col.deleteMany(evaluatedFilter)
    }

    context.variables[node.id] = { deletedCount: result.deletedCount }
  } catch (err) {
    throw new Error(`Delete failed in "${collection}": ${err.message}`)
  }
}

const executeCondition = async (flow, node, context, startTime) => {
  const { condition = "true" } = node.data?.config || {}
  const evaluatedCondition = safeEvaluate(condition, context)

  const edgeHandle = evaluatedCondition ? "if" : "else"
  const edge = flow.edges.find((e) => e.source === node.id && e.sourceHandle === edgeHandle)
  const nextNode = edge ? flow.nodes.find((n) => n.id === edge.target) : null

  if (nextNode) {
    await traverseFlow(flow, nextNode, context, startTime)
  }
}

const executeTryCatch = async (flow, node, context, startTime) => {
  const tryEdge = flow.edges.find((e) => e.source === node.id && e.sourceHandle === "try")
  const catchEdge = flow.edges.find((e) => e.source === node.id && e.sourceHandle === "catch")
  const tryNode = tryEdge ? flow.nodes.find((n) => n.id === tryEdge.target) : null

  try {
    if (tryNode) {
      await traverseFlow(flow, tryNode, context, startTime)
    }
  } catch (error) {
    context.variables.error = error.message
    const catchNode = catchEdge ? flow.nodes.find((n) => n.id === catchEdge.target) : null
    if (catchNode) {
      await traverseFlow(flow, catchNode, context, startTime)
    }
  }
}

const executeTransform = async (node, context) => {
  const { transformation = "null" } = node.data?.config || {}
  try {
    const sandbox = {
      ...ALLOWED_GLOBALS,
      $: context.variables,
      req: context.request,
    }

    const result = new vm.Script(`(${transformation})`, {
      filename: "transform.vm",
      timeout: 2000,
    }).runInNewContext(sandbox, { timeout: 2000 })

    context.variables[node.id] = result
  } catch (err) {
    throw new Error(`Transform script error: ${err.message}`)
  }
}

const executeLogging = async (node, context) => {
  const { level = "info", message = "" } = node.data?.config || {}
  const evaluatedMessage = safeEvaluate(message, context)

  // In production, use a real logger (e.g., Winston)
  console[level](`[Flow Log] ${evaluatedMessage}`)
  context.variables[node.id] = { logged: true }
}

const executeAssign = async (node, context) => {
  const { variable = "", value = "" } = node.data?.config || {}
  if (!variable) throw new Error("Variable name required for assign node")

  const evaluatedValue = safeEvaluate(value, context)
  context.variables[variable] = evaluatedValue
  context.variables[node.id] = evaluatedValue
}

const executeDelay = async (node, context) => {
  const { delay = 1000 } = node.data?.config || {}
  if (delay < 0 || delay > 10000) {
    throw new Error("Delay must be between 0 and 10000ms")
  }

  await new Promise((resolve) => setTimeout(resolve, delay))
  context.variables[node.id] = { delayed: delay }
}

// === COMPILATION ===
export const compileFlow = (flow) => {
  if (!flow.nodes || !flow.edges) {
    throw new Error("Invalid flow: missing nodes or edges")
  }

  return {
    flowId: flow._id,
    version: flow.version || 1,
    nodes: flow.nodes,
    edges: flow.edges,
    compiledAt: new Date().toISOString(),
  }
}