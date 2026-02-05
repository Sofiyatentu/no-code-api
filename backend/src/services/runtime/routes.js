import express from "express";
import { query } from "../../config/db.js";
import { executeFlow } from "./executor.js";
import { asyncHandler } from "../../middleware/auth.js";

const router = express.Router();

// Internal endpoint to execute a flow
router.post(
  "/execute/:flowId",
  asyncHandler(async (req, res) => {
    const flowResult = await query("SELECT * FROM flows WHERE id = $1", [
      req.params.flowId,
    ]);
    if (flowResult.rows.length === 0) {
      return res.status(404).json({ error: "Flow not found" });
    }
    const flow = flowResult.rows[0];
    if (!flow.deployed) {
      return res.status(400).json({ error: "Flow not deployed" });
    }
    const requestContext = {
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
    };
    const result = await executeFlow(flow, requestContext);
    res.status(result.status).json(result.body);
  }),
);

export default router;
