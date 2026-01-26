import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import mongoose from "mongoose"
import authRoutes from "./src/services/auth/routes.js"
import projectRoutes from "./src/services/projects/routes.js"
import flowRoutes from "./src/services/flows/routes.js"
import apiGatewayRoutes from "./src/services/gateway/routes.js"
import logsRoutes from "./src/services/logs/routes.js"
import adminRoutes from "./src/services/admin/routes.js"
import { errorHandler } from "./src/middleware/errorHandler.js"

dotenv.config()

const app = express()

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
)
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ limit: "50mb", extended: true }))

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/api-builder")
  .then(async () => {
    console.log("MongoDB connected")
    // initialize cascading relationships after models are registered
    try {
      const { default: initCascade } = await import("./src/services/cascade/index.js")
      initCascade()
    } catch (err) {
      console.error("Failed to initialize cascade middleware:", err)
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err)
    process.exit(1)
  })

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/projects", projectRoutes)
app.use("/api/flows", flowRoutes)
app.use("/api/logs", logsRoutes)
app.use("/api/admin", adminRoutes)

// API Gateway (public endpoints)
app.use("/:username/:projectSlug", apiGatewayRoutes)

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

// Error handling
app.use(errorHandler)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`)
})
