import express from "express"
import { query } from "../../config/db.js"
import { authenticate, asyncHandler } from "../../middleware/auth.js"
import { publishEvent } from "../../queue/eventBus.js"

const router = express.Router()

// List flows for project
router.get(
  "/project/:projectId",
  authenticate,
  asyncHandler(async (req, res) => {
    const projectResult = await query(
      "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
      [req.params.projectId, req.userId]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    const flowsResult = await query(
      "SELECT * FROM flows WHERE project_id = $1 ORDER BY created_at DESC",
      [req.params.projectId]
    )
    res.json(flowsResult.rows)
  }),
)

// Create flow
router.post(
  "/project/:projectId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, description } = req.body

    const projectResult = await query(
      "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
      [req.params.projectId, req.userId]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    const flowResult = await query(
      `INSERT INTO flows (project_id, user_id, name, description, nodes, edges) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.projectId, req.userId, name, description || null, JSON.stringify([]), JSON.stringify([])]
    )

    res.status(201).json(flowResult.rows[0])
  }),
)

// Get flow
router.get(
  "/:flowId",
  authenticate,
  asyncHandler(async (req, res) => {
    const flowResult = await query(
      "SELECT * FROM flows WHERE id = $1 AND user_id = $2",
      [req.params.flowId, req.userId]
    )

    if (flowResult.rows.length === 0) {
      return res.status(404).json({ error: "Flow not found" })
    }

    res.json(flowResult.rows[0])
  }),
)

// Update flow
router.patch(
  "/:flowId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, description, nodes, edges } = req.body

    const flowResult = await query(
      `UPDATE flows 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description),
           nodes = COALESCE($3, nodes),
           edges = COALESCE($4, edges),
           version = version + 1
       WHERE id = $5 AND user_id = $6 
       RETURNING *`,
      [
        name || null, 
        description || null, 
        nodes ? JSON.stringify(nodes) : null,
        edges ? JSON.stringify(edges) : null,
        req.params.flowId, 
        req.userId
      ]
    )

    if (flowResult.rows.length === 0) {
      return res.status(404).json({ error: "Flow not found" })
    }

    const flow = flowResult.rows[0]

    // Publish event for potential deployment
    await publishEvent("FLOW_UPDATED", {
      flowId: flow.id,
      projectId: flow.project_id,
      version: flow.version,
    })

    res.json(flow)
  }),
)

// Deploy flow
router.post(
  "/:flowId/deploy",
  authenticate,
  asyncHandler(async (req, res) => {
    const flowResult = await query(
      `UPDATE flows 
       SET deployed = true, deployed_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [req.params.flowId, req.userId]
    )

    if (flowResult.rows.length === 0) {
      return res.status(404).json({ error: "Flow not found" })
    }

    const flow = flowResult.rows[0]

    // Publish deployment event
    await publishEvent("FLOW_DEPLOYED", {
      flowId: flow.id,
      projectId: flow.project_id,
      version: flow.version,
    })

    res.json({ message: "Flow deployed", flow })
  }),
)

// Delete flow
router.delete(
  "/:flowId",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await query(
      "DELETE FROM flows WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.flowId, req.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flow not found" })
    }

    res.json({ message: "Flow deleted" })
  }),
)

export default router
