import mongoose from "mongoose"

const nodeSchema = new mongoose.Schema(
  {
    id: String,
    type: String,
    position: { x: Number, y: Number },
    data: mongoose.Schema.Types.Mixed,
  },
  { _id: false },
)

const edgeSchema = new mongoose.Schema(
  {
    id: String,
    source: String,
    target: String,
    sourceHandle: String,
    targetHandle: String,
  },
  { _id: false },
)

const flowSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  nodes: [nodeSchema],
  edges: [edgeSchema],
  version: {
    type: Number,
    default: 1,
  },
  deployed: {
    type: Boolean,
    default: false,
  },
  deployedAt: Date,
  compiledFlow: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

export const Flow = mongoose.model("Flow", flowSchema)
