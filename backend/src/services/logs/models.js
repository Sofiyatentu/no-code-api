import mongoose from "mongoose"

const logSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  flowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Flow",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  method: String,
  path: String,
  status: Number,
  duration: Number,
  requestBody: mongoose.Schema.Types.Mixed,
  responseBody: mongoose.Schema.Types.Mixed,
  error: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
})

export const Log = mongoose.model("Log", logSchema)
