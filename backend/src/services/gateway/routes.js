import express from "express";
import { query } from "../../config/db.js";
import { executeFlow } from "../runtime/executor.js";
import { apiKeyAuth } from "../../middleware/auth.js";
import logger from "../../utils/logger.js";
import { logRequest } from "../logs/logger.js";
import { executeUserFlow } from "../flowExecutor.js";
import { rateLimiter } from "../../middleware/rateLimiter.js";
const router = express.Router({ mergeParams: true });

// Helper: check if a URL path matches a route pattern (e.g. /users/:id matches /users/123)
const pathMatches = (pattern, actual) => {
  const patternParts = pattern.split("/").filter(Boolean);
  const actualParts = actual.split("/").filter(Boolean);

  if (patternParts.length !== actualParts.length) return false;

  return patternParts.every((part, i) => {
    if (part.startsWith(":")) return true;
    return part === actualParts[i];
  });
};

// Helper: find the deployed flow that matches the incoming request method + path
const findMatchingFlow = (flows, method, path) => {
  for (const flow of flows) {
    const nodes =
      typeof flow.nodes === "string" ? JSON.parse(flow.nodes) : flow.nodes;
    if (!nodes || nodes.length === 0) continue;

    const httpNode = nodes.find(
      (n) => (n.data?.nodeType || n.type) === "httpMethod",
    );
    if (!httpNode) continue;

    const nodeMethod = httpNode.data?.method || httpNode.data?.config?.method;
    const nodePath = httpNode.data?.path || httpNode.data?.config?.path || "/";

    // Method must match
    if (nodeMethod && nodeMethod.toUpperCase() !== method.toUpperCase())
      continue;

    // Path pattern must match
    if (pathMatches(nodePath, path)) return flow;
  }
  return null;
};

// Apply security middlewares
router.use(apiKeyAuth); // Validate API key
router.use(rateLimiter); // 100 req/15min per project

// Main API Gateway Logic
router.use(async (req, res) => {
  const { username, projectSlug, path: pathParam } = req.params;
  // In Express 5, wildcard *path params are arrays — join with "/"
  const pathAfterSlug = Array.isArray(pathParam)
    ? pathParam.join("/")
    : pathParam || "";
  const fullPath = `/${pathAfterSlug}`.replace(/\/+/g, "/");

  console.log(
    `[Gateway] Request: ${req.method} /${username}/${projectSlug}${fullPath}`,
  );

  const startTime = Date.now();

  try {
    // 1. Resolve User
    const userResult = await query("SELECT id FROM users WHERE username = $1", [
      username,
    ]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: "Not found",
        message: "User not found",
      });
    }
    const user = userResult.rows[0];

    // 2. Resolve Project + Encrypted MongoDB URI
    const projectResult = await query(
      "SELECT id, user_id, name, slug, mongo_uri, settings FROM projects WHERE user_id = $1 AND slug = $2 AND status = 'active'",
      [user.id, projectSlug],
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        error: "Not found",
        message: "Project not found or not active",
      });
    }
    const project = projectResult.rows[0];

    // 3. Get ALL deployed flows for this project and match by method + path
    const flowResult = await query(
      "SELECT * FROM flows WHERE project_id = $1 AND deployed = true ORDER BY deployed_at DESC",
      [project.id],
    );

    if (flowResult.rows.length === 0) {
      return res.status(400).json({
        error: "No flow defined",
        message: "This project has no active API flow",
      });
    }

    const matchingFlow = findMatchingFlow(
      flowResult.rows,
      req.method,
      fullPath,
    );

    if (!matchingFlow) {
      return res.status(404).json({
        error: "No matching endpoint",
        message: `No deployed flow matches ${req.method} ${fullPath}`,
      });
    }

    console.log(
      `[Gateway] Matched flow - ID: ${matchingFlow.id}, Name: ${matchingFlow.name}, Nodes: ${matchingFlow.nodes?.length || 0}`,
    );

    const result = await executeUserFlow(
      {
        ...project,
        flow: {
          nodes: matchingFlow.nodes,
          edges: matchingFlow.edges,
        },
      },
      {
        method: req.method,
        path: fullPath,
        headers: req.headers,
        body: req.body || {},
        params: req.params,
        query: req.query,
      },
    );

    const duration = Date.now() - startTime;

    // 5. Log request
    logger.info("API Request", {
      projectId: project.id,
      userId: user.id,
      username,
      projectSlug,
      method: req.method,
      path: fullPath,
      status: result.status,
      duration,
      ip: req.ip,
    });

    // Save to database
    await logRequest({
      projectId: project.id,
      flowId: matchingFlow.id,
      userId: user.id,
      method: req.method,
      path: fullPath,
      status: result.status || 200,
      duration,
      requestBody: req.body,
      responseBody: result.body,
      error: null,
    });

    // 6. Send response
    return res
      .status(result.status || 200)
      .set({
        "Content-Type": "application/json",
        "X-Response-Time": `${duration}ms`,
        ...result.headers,
      })
      .json(result.body);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error("API Gateway Error", {
      username,
      projectSlug,
      path: fullPath,
      error: error.message,
      stack: error.stack,
      duration,
    });

    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to process request",
    });
  }
});

export default router;
