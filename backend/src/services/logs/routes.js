import express from "express"
import { Log } from "./models.js"
import { authenticate, asyncHandler } from "../../middleware/auth.js"

const router = express.Router()

// Get logs for project
router.get(
  "/project/:projectId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { limit = 100, skip = 0, status, method } = req.query

    const filter = {
      projectId: req.params.projectId,
    }

    if (status) filter.status = Number.parseInt(status)
    if (method) filter.method = method

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .skip(Number.parseInt(skip))
      .limit(Number.parseInt(limit))

    const total = await Log.countDocuments(filter)

    res.json({ logs, total, limit, skip })
  }),
)

// Get log detail
router.get(
  "/:logId",
  authenticate,
  asyncHandler(async (req, res) => {
    const log = await Log.findById(req.params.logId)

    if (!log) {
      return res.status(404).json({ error: "Log not found" })
    }

    res.json(log)
  }),
)

export default router
