import express from "express";
import { query } from "../../config/db.js";
import { authenticate, asyncHandler } from "../../middleware/auth.js";

const router = express.Router();

// Get logs for project
router.get(
  "/project/:projectId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { limit = 100, skip = 0, status, method } = req.query;

    let queryStr = "SELECT * FROM logs WHERE project_id = $1";
    const params = [req.params.projectId];
    let idx = 2;
    if (status) {
      queryStr += ` AND status = $${idx}`;
      params.push(Number.parseInt(status));
      idx++;
    }
    if (method) {
      queryStr += ` AND method = $${idx}`;
      params.push(method);
      idx++;
    }
    queryStr +=
      " ORDER BY timestamp DESC LIMIT $" + idx + " OFFSET $" + (idx + 1);
    params.push(Number.parseInt(limit), Number.parseInt(skip));
    const logsResult = await query(queryStr, params);

    // Build count query with same filters
    let countStr = "SELECT COUNT(*) FROM logs WHERE project_id = $1";
    const countParams = [req.params.projectId];
    let countIdx = 2;
    if (status) {
      countStr += ` AND status = $${countIdx}`;
      countParams.push(Number.parseInt(status));
      countIdx++;
    }
    if (method) {
      countStr += ` AND method = $${countIdx}`;
      countParams.push(method);
      countIdx++;
    }
    const countResult = await query(countStr, countParams);
    res.json({
      logs: logsResult.rows,
      total: Number(countResult.rows[0].count),
      limit: Number.parseInt(limit),
      skip: Number.parseInt(skip),
    });
  }),
);

// Get log detail
router.get(
  "/:logId",
  authenticate,
  asyncHandler(async (req, res) => {
    const logResult = await query("SELECT * FROM logs WHERE id = $1", [
      req.params.logId,
    ]);
    if (logResult.rows.length === 0) {
      return res.status(404).json({ error: "Log not found" });
    }
    res.json(logResult.rows[0]);
  }),
);

export default router;
