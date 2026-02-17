import express from "express";
import { query } from "../../config/db.js";
import { executeFlow } from "../runtime/executor.js";
import { apiKeyAuth } from "../../middleware/auth.js";
import logger from "../../utils/logger.js";
import { executeUserFlow } from "../flowExecutor.js";
import { rateLimiter } from "../../middleware/rateLimiter.js";
const router = express.Router({ mergeParams: true });

// Apply security middlewares
router.use(apiKeyAuth); // Validate API key
router.use(rateLimiter); // 100 req/15min per project

// Main API Gateway Logic
router.use(async (req, res) => {
  const { username, projectSlug } = req.params;
  const pathAfterSlug = req.params[0] || "/";
  const fullPath = `/${pathAfterSlug}`.replace(/\/+/g, "/");

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

    // 3. Get active flow for this project
    const flowResult = await query(
      "SELECT * FROM flows WHERE project_id = $1 AND deployed = true ORDER BY deployed_at DESC LIMIT 1",
      [project.id],
    );

    if (
      flowResult.rows.length === 0 ||
      !flowResult.rows[0].nodes ||
      flowResult.rows[0].nodes.length === 0
    ) {
      return res.status(400).json({
        error: "No flow defined",
        message: "This project has no active API flow",
      });
    }

    const matchingFlow = flowResult.rows[0];

    // 4. Execute using USER'S OWN DATABASE
    const result = await executeUserFlow(project, {
      method: req.method,
      path: fullPath,
      headers: req.headers,
      body: req.body || {},
      params: req.params,
      query: req.query,
    });

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
    await query(
      `INSERT INTO request_logs (project_id, user_id, method, path, status, duration) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        project.id,
        user.id,
        req.method,
        fullPath,
        result.status || 200,
        duration,
      ],
    );

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
