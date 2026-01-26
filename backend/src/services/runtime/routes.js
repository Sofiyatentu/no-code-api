import express from "express"
import { Flow } from "../flows/models.js"
import { executeFlow } from "./executor.js"
import { asyncHandler } from "../../middleware/auth.js"

const router = express.Router()

// Internal endpoint to execute a flow
router.post(
  "/execute/:flowId",
  asyncHandler(async (req, res) => {
    const flow = await Flow.findById(req.params.flowId)

    if (!flow) {
      return res.status(404).json({ error: "Flow not found" })
    }

    if (!flow.deployed) {
      return res.status(400).json({ error: "Flow not deployed" })
    }

    const requestContext = {
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
    }

    const result = await executeFlow(flow, requestContext)

    res.status(result.status).json(result.body)
  }),
)

export default router
