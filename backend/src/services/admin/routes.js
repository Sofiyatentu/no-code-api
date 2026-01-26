import express from "express"
import { adminAuthenticate, requireAdminRole, checkPermission } from "../../middleware/adminAuth.js"
import { User } from "../auth/models.js"
import { AuditLog, UserStatus, RateLimitConfig, SystemConfig, UsageAnalytics } from "./models.js"
import { Project } from "../projects/models.js"
import { Flow } from "../flows/models.js"
import { Log } from "../logs/models.js"

const router = express.Router()

// Helper function to create audit log
const createAuditLog = async (adminId, action, targetType, targetId, targetEmail, changes, reason) => {
  await AuditLog.create({
    adminId,
    action,
    targetType,
    targetId,
    targetEmail,
    changes,
    reason,
  })
}

// Get system analytics dashboard
router.get("/dashboard/analytics", adminAuthenticate, requireAdminRole(["super_admin", "admin"]), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const totalProjects = await Project.countDocuments()
    const totalFlows = await Flow.countDocuments()
    const totalRequests = await Log.countDocuments()

    const activeUsers = await UserStatus.countDocuments({ status: "active" })
    const suspendedUsers = await UserStatus.countDocuments({ status: "suspended" })
    const bannedUsers = await UserStatus.countDocuments({ status: "banned" })

    const recentLogs = await Log.find().sort({ timestamp: -1 }).limit(10).populate("userId", "email username")

    const dailyStats = await UsageAnalytics.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          totalRequests: { $sum: "$totalRequests" },
          avgResponseTime: { $avg: "$avgResponseTime" },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ])

    res.json({
      summary: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        bannedUsers,
        totalProjects,
        totalFlows,
        totalRequests,
      },
      recentLogs,
      dailyStats,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get all users with status
router.get(
  "/users",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  checkPermission("manage_users"),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, status } = req.query

      let query = {}
      if (search) {
        query = {
          $or: [{ email: new RegExp(search, "i") }, { username: new RegExp(search, "i") }],
        }
      }

      const users = await User.find(query)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-password")

      const userStatuses = await UserStatus.find({ userId: { $in: users.map((u) => u._id) } })

      const enrichedUsers = users.map((user) => ({
        ...user.toObject(),
        status: userStatuses.find((s) => s.userId.toString() === user._id.toString())?.status || "active",
      }))

      const total = await User.countDocuments(query)

      res.json({
        users: enrichedUsers,
        pagination: { total, pages: Math.ceil(total / limit), currentPage: page },
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

// Ban/Suspend user
router.post(
  "/users/:userId/ban",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  checkPermission("manage_users"),
  async (req, res) => {
    try {
      const { userId } = req.params
      const { reason, duration } = req.body

      const user = await User.findById(userId)
      if (!user) return res.status(404).json({ error: "User not found" })

      const suspendedUntil = duration ? new Date(Date.now() + duration * 60000) : null

      await UserStatus.findOneAndUpdate(
        { userId },
        {
          status: suspendedUntil ? "suspended" : "banned",
          reason,
          bannedAt: new Date(),
          bannedBy: req.admin._id,
          suspendedUntil,
        },
        { upsert: true },
      )

      await createAuditLog(
        req.admin._id,
        suspendedUntil ? "user_suspended" : "user_banned",
        "User",
        userId,
        user.email,
        { reason, duration },
        reason,
      )

      res.json({ message: "User action applied successfully" })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

// Unban user
router.post(
  "/users/:userId/unban",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  checkPermission("manage_users"),
  async (req, res) => {
    try {
      const { userId } = req.params

      const user = await User.findById(userId)
      if (!user) return res.status(404).json({ error: "User not found" })

      await UserStatus.findOneAndUpdate({ userId }, { status: "active", bannedAt: null })

      await createAuditLog(req.admin._id, "user_updated", "User", userId, user.email, { status: "active" })

      res.json({ message: "User unbanned successfully" })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

// Get user projects and flows
router.get(
  "/users/:userId/projects",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  async (req, res) => {
    try {
      const { userId } = req.params

      const projects = await Project.find({ userId }).populate("userId", "email username")

      const projectsWithFlows = await Promise.all(
        projects.map(async (project) => {
          const flows = await Flow.find({ projectId: project._id }).select("name deployed deployedAt")
          return { ...project.toObject(), flows }
        }),
      )

      res.json(projectsWithFlows)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

// Get audit logs
router.get("/audit-logs", adminAuthenticate, requireAdminRole(["super_admin", "admin"]), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, targetEmail } = req.query

    const query = {}
    if (action) query.action = action
    if (targetEmail) query.targetEmail = new RegExp(targetEmail, "i")

    const logs = await AuditLog.find(query)
      .populate("adminId", "userId")
      .populate("userId", "email")
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await AuditLog.countDocuments(query)

    res.json({
      logs,
      pagination: { total, pages: Math.ceil(total / limit), currentPage: page },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Set rate limits for user
router.post(
  "/rate-limits",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  checkPermission("manage_quotas"),
  async (req, res) => {
    try {
      const { userId, projectId, requestsPerMinute, requestsPerHour, requestsPerDay, tier } = req.body

      const config = await RateLimitConfig.findOneAndUpdate(
        { userId, projectId },
        {
          requestsPerMinute,
          requestsPerHour,
          requestsPerDay,
          tier,
        },
        { upsert: true, new: true },
      )

      await createAuditLog(req.admin._id, "rate_limit_set", "RateLimit", config._id, null, req.body)

      res.json(config)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

// Get system configuration
router.get("/system-config", adminAuthenticate, requireAdminRole(["super_admin"]), async (req, res) => {
  try {
    const configs = await SystemConfig.find()
    res.json(configs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update system configuration
router.post(
  "/system-config",
  adminAuthenticate,
  requireAdminRole(["super_admin"]),
  checkPermission("manage_system"),
  async (req, res) => {
    try {
      const { key, value, description } = req.body

      const config = await SystemConfig.findOneAndUpdate(
        { key },
        { value, description, updatedBy: req.admin._id, updatedAt: new Date() },
        { upsert: true, new: true },
      )

      await createAuditLog(req.admin._id, "system_config_changed", "SystemConfig", config._id, null, { key, value })

      res.json(config)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

// Get usage analytics
router.get("/analytics/usage", adminAuthenticate, requireAdminRole(["super_admin", "admin"]), async (req, res) => {
  try {
    const { userId, projectId, startDate, endDate } = req.query

    const query = {}
    if (userId) query.userId = userId
    if (projectId) query.projectId = projectId

    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = new Date(startDate)
      if (endDate) query.date.$lte = new Date(endDate)
    }

    const analytics = await UsageAnalytics.find(query).sort({ date: -1 }).limit(100)

    res.json(analytics)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete user (hard delete)
router.delete(
  "/users/:userId",
  adminAuthenticate,
  requireAdminRole(["super_admin"]),
  checkPermission("manage_users"),
  async (req, res) => {
    try {
      const { userId } = req.params
      const { reason } = req.body

      const user = await User.findById(userId)
      if (!user) return res.status(404).json({ error: "User not found" })

      // Delete user data
      await User.deleteOne({ _id: userId })
      await UserStatus.deleteOne({ userId })
      await Project.deleteMany({ userId })
      await Flow.deleteMany({ userId })

      await createAuditLog(req.admin._id, "user_deleted", "User", userId, user.email, { action: "hard_delete" }, reason)

      res.json({ message: "User and all associated data deleted" })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

export default router
