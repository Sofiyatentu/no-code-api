import mongoose from "mongoose"

const requestLogSchema = new mongoose.Schema({
  projectId: mongoose.Schema.Types.ObjectId,
  flowId: mongoose.Schema.Types.ObjectId,
  userId: mongoose.Schema.Types.ObjectId,
  method: String,
  path: String,
  status: Number,
  duration: Number,
  timestamp: { type: Date, default: Date.now },
})

export const RequestLog = mongoose.model("RequestLog", requestLogSchema)
