// runtime/flowEngine.js
import vm from "vm";
import { performance } from "perf_hooks";
import { ObjectId } from "mongodb";

// === SECURITY & PERFORMANCE CONFIG ===
const MAX_EXECUTION_TIME_MS = 5000; // 5s max per flow
const MAX_MEMORY_MB = 100; // Memory limit
const MAX_QUERY_LIMIT = 100; // Max MongoDB query results
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
  console: { log: () => {} }, // No-op logging
};

// Helper: resolve actual node type (React Flow uses type:"custom" with nodeType in data)
const getNodeType = (node) => node.data?.nodeType || node.type;

// Helper: Extract path parameters from URL based on pattern
// e.g., pattern: "/users/:id", path: "/users/123" => { id: "123" }
const extractPathParams = (pattern, path) => {
  const params = {};
  if (!pattern || !path) return params;

  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  patternParts.forEach((part, index) => {
    if (part.startsWith(":")) {
      const paramName = part.slice(1);
      if (pathParts[index]) {
        params[paramName] = pathParts[index];
      }
    }
  });

  return params;
};

// Helper: Convert _id string to ObjectId in filter objects
const convertObjectIds = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  const result = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (
      key === "_id" &&
      typeof value === "string" &&
      /^[a-f\d]{24}$/i.test(value)
    ) {
      result[key] = new ObjectId(value);
    } else if (typeof value === "object" && value !== null) {
      result[key] = convertObjectIds(value);
    } else {
      result[key] = value;
    }
  }

  return result;
};

// === MAIN EXECUTION ===
export const executeFlow = async (
  flow,
  requestContext,
  userMongoConnection,
) => {
  const startTime = performance.now();
  const { method, path, headers, body, params, query } = requestContext;

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
  };

  let timeoutId;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Flow execution timed out after 5 seconds"));
      }, MAX_EXECUTION_TIME_MS);
    });

    const executionPromise = (async () => {
      const startNode = flow.nodes.find((n) => getNodeType(n) === "httpMethod");
      if (!startNode) {
        throw Object.assign(new Error("No HTTP method start node found"), {
          status: 400,
        });
      }

      const nodeMethod =
        startNode.data?.method || startNode.data?.config?.method;
      if (nodeMethod && nodeMethod.toUpperCase() !== method.toUpperCase()) {
        throw Object.assign(new Error(`Method Not Allowed: ${method}`), {
          status: 405,
        });
      }

      // Attach user-specific MongoDB connection
      context.mongoConnection = userMongoConnection;

      await traverseFlow(flow, startNode, context, startTime);

      if (!context.response) {
        throw Object.assign(new Error("No response node reached"), {
          status: 500,
        });
      }

      return {
        status: context.response.status || 200,
        headers: {
          "Content-Type": "application/json",
          ...context.response.headers,
        },
        body: context.response.body ?? { success: true },
      };
    })();

    return await Promise.race([executionPromise, timeoutPromise]);
  } catch (error) {
    console.error("[Flow Engine] Execution failed:", {
      flowId: flow.flowId,
      error: error.message,
      stack: error.stack,
    });
    return {
      status: error.status || 500,
      headers: { "Content-Type": "application/json" },
      body: {
        error: error.message || "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && {
          details: context.errors,
        }),
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

// === TRAVERSAL ===
const traverseFlow = async (flow, node, context, startTime) => {
  if (!node) return;

  console.log(
    `[Traverse] Visiting node: ${node.id} (type: ${getNodeType(node)})`,
  );

  if (context.visited.has(node.id)) {
    throw Object.assign(
      new Error(
        `Infinite loop detected at node: ${node.data?.label || node.id}`,
      ),
      {
        status: 500,
      },
    );
  }
  context.visited.add(node.id);

  if (performance.now() - startTime > MAX_EXECUTION_TIME_MS) {
    throw Object.assign(new Error("Flow execution exceeded time limit"), {
      status: 500,
    });
  }

  try {
    switch (getNodeType(node)) {
      case "httpMethod": {
        // Extract path params based on configured path pattern
        const pathPattern = node.data?.config?.path || node.data?.path || "/";
        const extractedParams = extractPathParams(
          pathPattern,
          context.request.path,
        );

        // Merge extracted params into request.params
        context.request.params = {
          ...context.request.params,
          ...extractedParams,
        };
        context.variables.request = structuredClone(context.request);

        console.log(
          `[httpMethod] Path pattern: ${pathPattern}, Actual path: ${context.request.path}`,
        );
        console.log(`[httpMethod] Extracted params:`, extractedParams);
        break;
      }

      case "mongoFind":
        await executeMongoFind(node, context);
        break;
      case "mongoInsert":
        await executeMongoInsert(node, context);
        break;
      case "mongoUpdate":
        await executeMongoUpdate(node, context);
        break;
      case "mongoDelete":
        await executeMongoDelete(node, context);
        break;
      case "mongodb": {
        const operation =
          node.data?.config?.operation || node.data?.operation || "find";
        if (operation === "find") {
          await executeMongoFind(node, context);
        } else if (operation === "insert") {
          await executeMongoInsert(node, context);
        } else if (operation === "update") {
          await executeMongoUpdate(node, context);
        } else if (operation === "delete") {
          await executeMongoDelete(node, context);
        } else {
          context.errors.push(`Unknown mongodb operation: ${operation}`);
        }
        break;
      }
      case "dbNode": {
        const action =
          node.data?.config?.action || node.data?.action || "findOne";
        if (action === "findOne" || action === "findMany") {
          await executeMongoFind(node, context);
        } else if (action === "insertOne") {
          await executeMongoInsert(node, context);
        } else if (action === "updateOne") {
          await executeMongoUpdate(node, context);
        } else if (action === "deleteOne") {
          await executeMongoDelete(node, context);
        } else {
          context.errors.push(`Unknown dbNode action: ${action}`);
        }
        break;
      }
      case "condition":
        return await executeCondition(flow, node, context, startTime);
      case "tryCatch":
        return await executeTryCatch(flow, node, context, startTime);
      case "transform":
        await executeTransform(node, context);
        break;
      case "response": {
        const rawBody = node.data?.body ?? node.data?.config?.body ?? {};
        let evaluatedBody = safeEvaluate(rawBody, context);

        // If body is a string, try to parse it as JSON
        if (typeof evaluatedBody === "string") {
          try {
            evaluatedBody = JSON.parse(evaluatedBody);
          } catch (e) {
            // Keep as string if not valid JSON
          }
        }

        context.response = {
          status: node.data?.statusCode ?? node.data?.config?.statusCode ?? 200,
          headers: safeEvaluate(
            node.data?.headers ?? node.data?.config?.headers ?? {},
            context,
          ),
          body: evaluatedBody,
        };
        return;
      }
      case "logging":
        await executeLogging(node, context);
        break;
      case "assign":
        await executeAssign(node, context);
        break;
      case "delay":
        await executeDelay(node, context);
        break;
      default:
        context.errors.push(`Unsupported node type: ${getNodeType(node)}`);
    }

    const edges = flow.edges.filter((e) => e.source === node.id);
    if (
      edges.length > 1 &&
      !["condition", "tryCatch"].includes(getNodeType(node))
    ) {
      throw Object.assign(
        new Error(`Node "${getNodeType(node)}" cannot have multiple outputs`),
        {
          status: 500,
        },
      );
    }

    for (const edge of edges) {
      const nextNode = flow.nodes.find((n) => n.id === edge.target);
      if (nextNode) {
        await traverseFlow(flow, nextNode, context, startTime);
      }
    }
  } catch (err) {
    context.errors.push(err.message);
    throw err;
  }
};

// === SAFE EVALUATOR ===
const safeEvaluate = (expr, context) => {
  if (expr === null || expr === undefined) return expr;
  if (typeof expr !== "object" && typeof expr !== "string") return expr;

  if (typeof expr === "string") {
    // If the entire string is a single {{expression}}, return the raw value (preserves type)
    const singleExprMatch = expr.match(/^\{\{(.+?)\}\}$/);
    if (singleExprMatch) {
      try {
        const sandbox = {
          ...ALLOWED_GLOBALS,
          ...context.variables,
          $: context.variables,
          variables: context.variables,
          req: context.request,
          request: context.request,
        };

        const script = new vm.Script(`(${singleExprMatch[1].trim()})`, {
          filename: "expression.vm",
          timeout: 1000,
        });

        return script.runInNewContext(sandbox, { timeout: 1000 });
      } catch (e) {
        context.errors.push(
          `Expression error: ${singleExprMatch[1]} → ${e.message}`,
        );
        return null;
      }
    }

    // For strings with embedded expressions, do string replacement
    return expr.replace(/\{\{(.+?)\}\}/g, (_, code) => {
      try {
        const sandbox = {
          ...ALLOWED_GLOBALS,
          ...context.variables, // Spread variables directly so {{users}} works
          $: context.variables,
          variables: context.variables,
          req: context.request,
          request: context.request,
        };

        const script = new vm.Script(`(${code.trim()})`, {
          filename: "expression.vm",
          timeout: 1000,
        });

        const result = script.runInNewContext(sandbox, { timeout: 1000 });
        // Handle arrays/objects by JSON stringifying them
        if (typeof result === "object" && result !== null) {
          return JSON.stringify(result);
        }
        return result;
      } catch (e) {
        context.errors.push(`Expression error: ${code} → ${e.message}`);
        return null;
      }
    });
  }

  if (expr && typeof expr === "object") {
    const result = Array.isArray(expr) ? [] : {};
    for (const [key, val] of Object.entries(expr)) {
      result[key] = safeEvaluate(val, context);
    }
    return result;
  }

  return expr;
};

// === NODE EXECUTORS ===

// Helper to parse JSON strings into objects
const parseIfJsonString = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        // Try to evaluate as JS object literal
        try {
          return new Function(`return (${trimmed})`)();
        } catch (e2) {
          return value;
        }
      }
    }
  }
  return value;
};

const executeMongoFind = async (node, context) => {
  const {
    collection = "items",
    query = {},
    limit = 50,
    projection = {},
    outputVar,
  } = node.data?.config || {};
  const evaluatedQuery = convertObjectIds(
    parseIfJsonString(safeEvaluate(query, context)),
  );
  const evaluatedProjection = parseIfJsonString(
    safeEvaluate(projection, context),
  );

  console.log(
    `[MongoFind] Collection: ${collection}, Query:`,
    evaluatedQuery,
    `OutputVar: ${outputVar || node.id}`,
  );

  try {
    if (!context.mongoConnection) {
      console.log("[MongoFind] ERROR: No database connection available");
      throw new Error("No database connection available");
    }

    const db = context.mongoConnection.db();
    const col = db.collection(collection);

    // Validate collection name to prevent injection
    if (!/^[a-zA-Z0-9_-]+$/.test(collection)) {
      throw new Error(`Invalid collection name: ${collection}`);
    }

    const results = await col
      .find(evaluatedQuery)
      .project(evaluatedProjection)
      .limit(Math.min(limit, MAX_QUERY_LIMIT))
      .toArray();

    console.log(`[MongoFind] Found ${results.length} documents`);

    // Store in outputVar if provided, otherwise use node ID
    const varName = outputVar || node.id;
    context.variables[varName] = results;
  } catch (err) {
    console.log(`[MongoFind] ERROR: ${err.message}`);
    throw new Error(`Find failed in "${collection}": ${err.message}`);
  }
};

const executeMongoInsert = async (node, context) => {
  const {
    collection = "items",
    document = {},
    outputVar,
  } = node.data?.config || {};
  const evaluatedDoc = parseIfJsonString(safeEvaluate(document, context));

  console.log(
    `[MongoInsert] Collection: ${collection}, Document:`,
    evaluatedDoc,
  );

  try {
    if (!context.mongoConnection) {
      throw new Error("No database connection available");
    }

    const db = context.mongoConnection.db();
    const col = db.collection(collection);

    if (!/^[a-zA-Z0-9_-]+$/.test(collection)) {
      throw new Error(`Invalid collection name: ${collection}`);
    }

    // Ensure evaluatedDoc is an object
    const docToInsert =
      typeof evaluatedDoc === "object" && evaluatedDoc !== null
        ? evaluatedDoc
        : { value: evaluatedDoc };

    const result = await col.insertOne({
      ...docToInsert,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const varName = outputVar || node.id;
    context.variables[varName] = { insertedId: result.insertedId };
  } catch (err) {
    throw new Error(`Insert failed in "${collection}": ${err.message}`);
  }
};

const executeMongoUpdate = async (node, context) => {
  const {
    collection = "items",
    filter = {},
    update = {},
    action = "updateOne",
    outputVar,
  } = node.data?.config || {};

  console.log(`[MongoUpdate] Raw filter from config:`, filter);
  console.log(`[MongoUpdate] Context request.params:`, context.request.params);
  console.log(
    `[MongoUpdate] Context variables:`,
    Object.keys(context.variables),
  );

  const evaluatedFilter = convertObjectIds(
    parseIfJsonString(safeEvaluate(filter, context)),
  );
  const evaluatedUpdate = parseIfJsonString(safeEvaluate(update, context));

  console.log(
    `[MongoUpdate] Collection: ${collection}, Evaluated Filter:`,
    JSON.stringify(evaluatedFilter),
    `Update:`,
    JSON.stringify(evaluatedUpdate),
  );

  try {
    if (!context.mongoConnection) {
      throw new Error("No database connection available");
    }

    const db = context.mongoConnection.db();
    const col = db.collection(collection);

    if (!/^[a-zA-Z0-9_-]+$/.test(collection)) {
      throw new Error(`Invalid collection name: ${collection}`);
    }

    let result;
    // Check if user already provided update operators like $set, $inc, etc.
    const hasUpdateOperator =
      evaluatedUpdate &&
      Object.keys(evaluatedUpdate).some((k) => k.startsWith("$"));
    const updateDoc = hasUpdateOperator
      ? {
          ...evaluatedUpdate,
          $set: { ...(evaluatedUpdate.$set || {}), updatedAt: new Date() },
        }
      : { $set: { ...evaluatedUpdate, updatedAt: new Date() } };

    if (action === "updateOne") {
      result = await col.updateOne(evaluatedFilter, updateDoc);
    } else {
      result = await col.updateMany(evaluatedFilter, updateDoc);
    }

    const varName = outputVar || node.id;
    context.variables[varName] = {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  } catch (err) {
    throw new Error(`Update failed in "${collection}": ${err.message}`);
  }
};

const executeMongoDelete = async (node, context) => {
  const {
    collection = "items",
    filter = {},
    action = "deleteOne",
    outputVar,
  } = node.data?.config || {};
  const evaluatedFilter = convertObjectIds(
    parseIfJsonString(safeEvaluate(filter, context)),
  );

  console.log(
    `[MongoDelete] Collection: ${collection}, Filter:`,
    evaluatedFilter,
  );

  try {
    if (!context.mongoConnection) {
      throw new Error("No database connection available");
    }

    const db = context.mongoConnection.db();
    const col = db.collection(collection);

    if (!/^[a-zA-Z0-9_-]+$/.test(collection)) {
      throw new Error(`Invalid collection name: ${collection}`);
    }

    let result;
    if (action === "deleteOne") {
      result = await col.deleteOne(evaluatedFilter);
    } else {
      result = await col.deleteMany(evaluatedFilter);
    }

    const varName = outputVar || node.id;
    context.variables[varName] = { deletedCount: result.deletedCount };
  } catch (err) {
    throw new Error(`Delete failed in "${collection}": ${err.message}`);
  }
};

const executeCondition = async (flow, node, context, startTime) => {
  const { condition = "true" } = node.data?.config || {};
  const evaluatedCondition = safeEvaluate(condition, context);

  const edgeHandle = evaluatedCondition ? "if" : "else";
  const edge = flow.edges.find(
    (e) => e.source === node.id && e.sourceHandle === edgeHandle,
  );
  const nextNode = edge ? flow.nodes.find((n) => n.id === edge.target) : null;

  if (nextNode) {
    await traverseFlow(flow, nextNode, context, startTime);
  }
};

const executeTryCatch = async (flow, node, context, startTime) => {
  const tryEdge = flow.edges.find(
    (e) => e.source === node.id && e.sourceHandle === "try",
  );
  const catchEdge = flow.edges.find(
    (e) => e.source === node.id && e.sourceHandle === "catch",
  );
  const tryNode = tryEdge
    ? flow.nodes.find((n) => n.id === tryEdge.target)
    : null;

  try {
    if (tryNode) {
      await traverseFlow(flow, tryNode, context, startTime);
    }
  } catch (error) {
    context.variables.error = error.message;
    const catchNode = catchEdge
      ? flow.nodes.find((n) => n.id === catchEdge.target)
      : null;
    if (catchNode) {
      await traverseFlow(flow, catchNode, context, startTime);
    }
  }
};

const executeTransform = async (node, context) => {
  const { transformation = "null" } = node.data?.config || {};
  try {
    const sandbox = {
      ...ALLOWED_GLOBALS,
      $: context.variables,
      req: context.request,
    };

    const result = new vm.Script(`(${transformation})`, {
      filename: "transform.vm",
      timeout: 2000,
    }).runInNewContext(sandbox, { timeout: 2000 });

    context.variables[node.id] = result;
  } catch (err) {
    throw new Error(`Transform script error: ${err.message}`);
  }
};

const executeLogging = async (node, context) => {
  const { level = "info", message = "" } = node.data?.config || {};
  const evaluatedMessage = safeEvaluate(message, context);

  // In production, use a real logger (e.g., Winston)
  console[level](`[Flow Log] ${evaluatedMessage}`);
  context.variables[node.id] = { logged: true };
};

const executeAssign = async (node, context) => {
  const { variable = "", value = "" } = node.data?.config || {};
  if (!variable) throw new Error("Variable name required for assign node");

  const evaluatedValue = safeEvaluate(value, context);
  context.variables[variable] = evaluatedValue;
  context.variables[node.id] = evaluatedValue;
};

const executeDelay = async (node, context) => {
  const { delay = 1000 } = node.data?.config || {};
  if (delay < 0 || delay > 10000) {
    throw new Error("Delay must be between 0 and 10000ms");
  }

  await new Promise((resolve) => setTimeout(resolve, delay));
  context.variables[node.id] = { delayed: delay };
};

// === COMPILATION ===
export const compileFlow = (flow) => {
  if (!flow.nodes || !flow.edges) {
    throw new Error("Invalid flow: missing nodes or edges");
  }

  return {
    flowId: flow.id,
    version: flow.version || 1,
    nodes: flow.nodes,
    edges: flow.edges,
    compiledAt: new Date().toISOString(),
  };
};
