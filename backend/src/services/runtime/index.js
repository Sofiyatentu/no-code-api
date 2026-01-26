import express from "express"
import { executeFlow } from "./executor.js"
import { Flow } from "../flows/models.js"
import { authenticate, asyncHandler } from "../../middleware/auth.js"

const router = express.Router()

// Execute flow endpoint (internal use)
router.post(
  "/execute/:flowId",
  authenticate,
  asyncHandler(async (req, res) => {
    const flow = await Flow.findById(req.params.flowId)
    if (!flow) {
      return res.status(404).json({ error: "Flow not found" })
    }

    const result = await executeFlow(flow, {
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
    })

    res.status(result.status).json(result.body)
  }),
)

export default router
