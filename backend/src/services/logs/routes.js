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

    let query = "SELECT * FROM logs WHERE project_id = $1";
    const params = [req.params.projectId];
    let idx = 2;
    if (status) {
      query += ` AND status = $${idx}`;
      params.push(Number.parseInt(status));
      idx++;
    }
    if (method) {
      query += ` AND method = $${idx}`;
      params.push(method);
      idx++;
    }
    query += " ORDER BY timestamp DESC LIMIT $" + idx + " OFFSET $" + (idx + 1);
    params.push(Number.parseInt(limit), Number.parseInt(skip));
    const logsResult = await query(query, params);
    const countResult = await query(
      "SELECT COUNT(*) FROM logs WHERE project_id = $1" +
        (status ? " AND status = $2" : "") +
        (method ? (status ? " AND method = $3" : " AND method = $2") : ""),
      [req.params.projectId].concat(
        status ? [Number.parseInt(status)] : [],
        method ? [method] : [],
      ),
    );
    res.json({
      logs: logsResult.rows,
      total: Number(countResult.rows[0].count),
      limit,
      skip,
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
