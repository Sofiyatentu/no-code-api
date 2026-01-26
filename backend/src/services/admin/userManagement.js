import { User, UserStatus, RateLimitConfig } from "./models.js"
import { Project } from "../projects/models.js"
import { Flow } from "../flows/models.js"
import { Log } from "../logs/models.js"

// Get comprehensive user profile
export const getUserProfile = async (userId) => {
  try {
    const user = await User.findById(userId).select("-password")
    const status = await UserStatus.findOne({ userId })
    const rateLimits = await RateLimitConfig.findOne({ userId })
    const projects = await Project.find({ userId })
    const flows = await Flow.find({ userId })
    const requestCount = await Log.countDocuments({ userId })

    return {
      user,
      status: status?.status || "active",
      tier: rateLimits?.tier || "free",
      stats: {
        totalProjects: projects.length,
        totalFlows: flows.length,
        totalRequests: requestCount,
        accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)) + " days",
      },
      rateLimits,
    }
  } catch (error) {
    throw error
  }
}

// Get user activity history
export const getUserActivityHistory = async (userId, limit = 50) => {
  try {
    const logs = await Log.find({ userId }).sort({ timestamp: -1 }).limit(limit)
    return logs
  } catch (error) {
    throw error
  }
}

// Get user project details
export const getUserProjects = async (userId) => {
  try {
    const projects = await Project.find({ userId })

    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const flows = await Flow.find({ projectId: project._id })
        const requests = await Log.find({ projectId: project._id })

        return {
          ...project.toObject(),
          flowCount: flows.length,
          deployedFlows: flows.filter((f) => f.deployed).length,
          totalRequests: requests.length,
          lastRequest: requests.sort({ timestamp: -1 }).limit(1)[0]?.timestamp,
        }
      }),
    )

    return projectsWithStats
  } catch (error) {
    throw error
  }
}

// Get user flows with detailed stats
export const getUserFlows = async (userId) => {
  try {
    const flows = await Flow.find({ userId }).select("name deployed deployedAt version")

    const flowsWithStats = await Promise.all(
      flows.map(async (flow) => {
        const requests = await Log.find({ flowId: flow._id })
        const lastRun = requests.sort({ timestamp: -1 }).limit(1)[0]?.timestamp

        return {
          ...flow.toObject(),
          totalRuns: requests.length,
          successfulRuns: requests.filter((r) => r.status === 200).length,
          failedRuns: requests.filter((r) => r.status !== 200).length,
          avgResponseTime:
            requests.length > 0 ? Math.round(requests.reduce((sum, r) => sum + r.duration, 0) / requests.length) : 0,
          lastRun,
        }
      }),
    )

    return flowsWithStats
  } catch (error) {
    throw error
  }
}

// Calculate user usage metrics
export const calculateUserUsage = async (userId, startDate, endDate) => {
  try {
    const logs = await Log.find({
      userId,
      timestamp: { $gte: startDate, $lte: endDate },
    })

    const totalRequests = logs.length
    const successfulRequests = logs.filter((l) => l.status === 200).length
    const failedRequests = logs.filter((l) => l.status !== 200).length
    const avgResponseTime = logs.length > 0 ? Math.round(logs.reduce((sum, l) => sum + l.duration, 0) / logs.length) : 0
    const totalDataProcessed = logs.reduce((sum, l) => sum + JSON.stringify(l.requestBody || "").length, 0)

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: logs.length > 0 ? ((successfulRequests / logs.length) * 100).toFixed(2) : 0,
      avgResponseTime,
      totalDataProcessed: (totalDataProcessed / 1024).toFixed(2) + " KB",
      period: { startDate, endDate },
    }
  } catch (error) {
    throw error
  }
}

// Update user quota
export const updateUserQuota = async (userId, quotaData) => {
  try {
    const config = await RateLimitConfig.findOneAndUpdate(
      { userId },
      {
        ...quotaData,
        updatedAt: new Date(),
      },
      { upsert: true, new: true },
    )
    return config
  } catch (error) {
    throw error
  }
}

// Send user notification (placeholder)
export const sendUserNotification = async (userId, message) => {
  // Implement notification service integration
  console.log(`Notification to user ${userId}: ${message}`)
  return true
}
