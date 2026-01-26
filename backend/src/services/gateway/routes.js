import express from "express"
import { Flow } from "../flows/models.js"
import { Project } from "../projects/models.js"
import { User } from "../auth/models.js"
import { executeFlow } from "../runtime/executor.js"
import { apiKeyAuth } from "../../middleware/auth.js"
import { Log } from "../logs/models.js"
import logger from "../../utils/logger.js"
import { executeUserFlow } from "../flowExecutor.js"
import { rateLimiter } from "../../middleware/rateLimiter.js"
const router = express.Router({ mergeParams: true })

// Apply security middlewares
router.use(apiKeyAuth)        // Validate API key
router.use(rateLimiter)       // 100 req/15min per project

// Main API Gateway Logic
router.use(async (req, res) => {
  const { username, projectSlug } = req.params
  const pathAfterSlug = req.params[0] || "/"
  const fullPath = `/${pathAfterSlug}`.replace(/\/+/g, "/")

  const startTime = Date.now()

  try {
    // 1. Resolve User
    const user = await User.findOne({ username }).select("_id").lean()
    if (!user) {
      return res.status(404).json({
        error: "Not found",
        message: "User not found",
      })
    }

    // 2. Resolve Project + Encrypted MongoDB URI
    const project = await Project.findOne({
      userId: user._id,
      slug: projectSlug,
      status: "active",
    })
      .select("+mongoUri +flow") // Critical: include encrypted URI
      .lean()

    if (!project) {
      return res.status(404).json({
        error: "Not found",
        message: "Project not found or not active",
      })
    }

    if (!project.flow?.nodes?.length) {
      return res.status(400).json({
        error: "No flow defined",
        message: "This project has no active API flow",
      })
    }

    // 3. Find matching flow by path + method (supports wildcards later)
    const matchingFlow = project.flow

    // Optional: Add path matching logic later
    // const matchingFlow = findBestFlow(project.flows, req.method, fullPath)
    // if (!matchingFlow) return res.status(404).json({ error: "Endpoint not found" })

    // 4. Execute using USER'S OWN DATABASE
    const result = await executeUserFlow(project, {
      method: req.method,
      path: fullPath,
      headers: req.headers,
      body: req.body || {},
      params: req.params,
      query: req.query,
    })

    const duration = Date.now() - startTime

    // 5. Log request
    logger.info("API Request", {
      projectId: project._id,
      userId: user._id,
      username,
      projectSlug,
      method: req.method,
      path: fullPath,
      status: result.status,
      duration,
      ip: req.ip,
    })

    // 6. Send response
    return res
      .status(result.status || 200)
      .set({
        "Content-Type": "application/json",
        "X-Response-Time": `${duration}ms`,
        ...result.headers,
      })
      .json(result.body)

  } catch (error) {
    const duration = Date.now() - startTime

    logger.error("API Gateway Error", {
      username,
      projectSlug,
      path: fullPath,
      error: error.message,
      stack: error.stack,
      duration,
    })

    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to process request",
    })
  }
})

export default router