import express from "express"
import { Flow } from "./models.js"
import { Project } from "../projects/models.js"
import { authenticate, asyncHandler } from "../../middleware/auth.js"
import { publishEvent } from "../../queue/eventBus.js"

const router = express.Router()

// List flows for project
router.get(
  "/project/:projectId",
  authenticate,
  asyncHandler(async (req, res) => {
    const project = await Project.findOne({
      _id: req.params.projectId,
      userId: req.userId,
    })

    if (!project) {
      return res.status(404).json({ error: "Project not found" })
    }

    const flows = await Flow.find({ projectId: req.params.projectId })
    res.json(flows)
  }),
)

// Create flow
router.post(
  "/project/:projectId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, description } = req.body

    const project = await Project.findOne({
      _id: req.params.projectId,
      userId: req.userId,
    })

    if (!project) {
      return res.status(404).json({ error: "Project not found" })
    }

    const flow = new Flow({
      projectId: req.params.projectId,
      userId: req.userId,
      name,
      description,
      nodes: [],
      edges: [],
    })

    await flow.save()
    res.status(201).json(flow)
  }),
)

// Get flow
router.get(
  "/:flowId",
  authenticate,
  asyncHandler(async (req, res) => {
    const flow = await Flow.findOne({
      _id: req.params.flowId,
      userId: req.userId,
    })

    if (!flow) {
      return res.status(404).json({ error: "Flow not found" })
    }

    res.json(flow)
  }),
)

// Update flow
router.patch(
  "/:flowId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, description, nodes, edges } = req.body

    const flow = await Flow.findOneAndUpdate(
      { _id: req.params.flowId, userId: req.userId },
      {
        name,
        description,
        nodes: nodes || [],
        edges: edges || [],
        updatedAt: new Date(),
        version: (await Flow.findById(req.params.flowId)).version + 1,
      },
      { new: true },
    )

    if (!flow) {
      return res.status(404).json({ error: "Flow not found" })
    }

    // Publish event for potential deployment
    await publishEvent("FLOW_UPDATED", {
      flowId: flow._id,
      projectId: flow.projectId,
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
    const flow = await Flow.findOneAndUpdate(
      { _id: req.params.flowId, userId: req.userId },
      {
        deployed: true,
        deployedAt: new Date(),
      },
      { new: true },
    )

    if (!flow) {
      return res.status(404).json({ error: "Flow not found" })
    }

    // Publish deployment event
    await publishEvent("FLOW_DEPLOYED", {
      flowId: flow._id,
      projectId: flow.projectId,
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
    const flow = await Flow.findOneAndDelete({
      _id: req.params.flowId,
      userId: req.userId,
    })

    if (!flow) {
      return res.status(404).json({ error: "Flow not found" })
    }

    res.json({ message: "Flow deleted" })
  }),
)

export default router
