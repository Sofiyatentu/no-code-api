import express from "express";
import { executeFlow } from "./executor.js";
import { query } from "../../config/db.js";
import { authenticate, asyncHandler } from "../../middleware/auth.js";

const router = express.Router();

// Execute flow endpoint (internal use)
router.post(
  "/execute/:flowId",
  authenticate,
  asyncHandler(async (req, res) => {
    const flowResult = await query(
      "SELECT * FROM flows WHERE id = $1 AND user_id = $2",
      [req.params.flowId, req.userId],
    );
    if (flowResult.rows.length === 0) {
      return res.status(404).json({ error: "Flow not found" });
    }

    const flow = flowResult.rows[0];

    const result = await executeFlow(
      { nodes: flow.nodes, edges: flow.edges },
      {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body,
        params: req.params,
        query: req.query,
      },
    );

    res.status(result.status).json(result.body);
  }),
);

export default router;
