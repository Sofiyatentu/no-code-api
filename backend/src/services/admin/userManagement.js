import { query } from "../../config/db.js"

// Get comprehensive user profile
export const getUserProfile = async (userId) => {
  try {
    const userResult = await query(
      "SELECT id, email, username, first_name, last_name, created_at, updated_at FROM users WHERE id = $1",
      [userId]
    )
    if (userResult.rows.length === 0) throw new Error("User not found")
    const user = userResult.rows[0]

    const statusResult = await query("SELECT status FROM user_statuses WHERE user_id = $1", [userId])
    const status = statusResult.rows[0]?.status || "active"

    const rateLimitsResult = await query("SELECT * FROM rate_limit_configs WHERE user_id = $1", [userId])
    const rateLimits = rateLimitsResult.rows[0] || null

    const projectsResult = await query("SELECT COUNT(*) FROM projects WHERE user_id = $1", [userId])
    const totalProjects = Number(projectsResult.rows[0].count)

    const flowsResult = await query("SELECT COUNT(*) FROM flows WHERE user_id = $1", [userId])
    const totalFlows = Number(flowsResult.rows[0].count)

    const requestsResult = await query("SELECT COUNT(*) FROM logs WHERE user_id = $1", [userId])
    const totalRequests = Number(requestsResult.rows[0].count)

    return {
      user,
      status,
      tier: rateLimits?.tier || "free",
      stats: {
        totalProjects,
        totalFlows,
        totalRequests,
        accountAge: Math.floor((Date.now() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)) + " days",
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
    const logsResult = await query(
      "SELECT * FROM logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2",
      [userId, limit]
    )
    return logsResult.rows
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
    const checkResult = await query(
      "SELECT id FROM rate_limit_configs WHERE user_id = $1",
      [userId]
    )
    
    let result
    if (checkResult.rows.length > 0) {
      result = await query(
        `UPDATE rate_limit_configs 
         SET requests_per_minute = COALESCE($1, requests_per_minute),
             requests_per_hour = COALESCE($2, requests_per_hour),
             requests_per_day = COALESCE($3, requests_per_day),
             tier = COALESCE($4, tier)
         WHERE user_id = $5 RETURNING *`,
        [quotaData.requests_per_minute, quotaData.requests_per_hour, 
         quotaData.requests_per_day, quotaData.tier, userId]
      )
    } else {
      result = await query(
        `INSERT INTO rate_limit_configs (user_id, requests_per_minute, requests_per_hour, requests_per_day, tier)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, quotaData.requests_per_minute || 60, quotaData.requests_per_hour || 1000,
         quotaData.requests_per_day || 10000, quotaData.tier || 'free']
      )
    }
    return result.rows[0]
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
