import express from "express";
import {
  adminAuthenticate,
  requireAdminRole,
  checkPermission,
} from "../../middleware/adminAuth.js";
import { query } from "../../config/db.js";

const router = express.Router();

// Helper function to create audit log (SQL)
const createAuditLog = async (
  adminId,
  action,
  targetType,
  targetId,
  targetEmail,
  changes,
  reason,
) => {
  await query(
    `INSERT INTO audit_logs (admin_id, action, target_type, target_id, target_email, changes, reason) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      adminId,
      action,
      targetType,
      targetId,
      targetEmail,
      JSON.stringify(changes),
      reason,
    ],
  );
};

// Get system analytics dashboard
router.get(
  "/dashboard/analytics",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  async (req, res) => {
    try {
      const totalUsers = Number(
        (await query(`SELECT COUNT(*) FROM users`)).rows[0].count,
      );
      const totalProjects = Number(
        (await query(`SELECT COUNT(*) FROM projects`)).rows[0].count,
      );
      const totalFlows = Number(
        (await query(`SELECT COUNT(*) FROM flows`)).rows[0].count,
      );
      const totalRequests = Number(
        (await query(`SELECT COUNT(*) FROM logs`)).rows[0].count,
      );

      // Get user statuses from user_statuses table
      const activeUsers = Number(
        (
          await query(
            `SELECT COUNT(*) FROM user_statuses WHERE status = 'active'`,
          )
        ).rows[0].count,
      );
      const suspendedUsers = Number(
        (
          await query(
            `SELECT COUNT(*) FROM user_statuses WHERE status = 'suspended'`,
          )
        ).rows[0].count,
      );
      const bannedUsers = Number(
        (
          await query(
            `SELECT COUNT(*) FROM user_statuses WHERE status = 'banned'`,
          )
        ).rows[0].count,
      );

      const recentLogs = (
        await query(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT 10`)
      ).rows;

      // Get daily usage analytics
      const dailyStats = (
        await query(
          `SELECT date, SUM(total_requests) as total_requests, SUM(successful_requests) as successful_requests, SUM(failed_requests) as failed_requests, AVG(avg_response_time) as avg_response_time FROM usage_analytics GROUP BY date ORDER BY date DESC LIMIT 30`,
        )
      ).rows;

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
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get all users with status
router.get(
  "/users",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  checkPermission("manage_users"),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, status } = req.query;

      let where = [];
      let params = [];
      let idx = 1;
      if (search) {
        where.push(`(email ILIKE $${idx} OR username ILIKE $${idx})`);
        params.push(`%${search}%`);
        idx++;
      }
      const whereClause = where.length
        ? `WHERE u.${where.join(" AND u.")}`
        : "";
      // Get paginated users with their statuses
      const usersResult = await query(
        `SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.created_at, u.updated_at, COALESCE(us.status, 'active') as status FROM users u LEFT JOIN user_statuses us ON u.id = us.user_id ${whereClause} ORDER BY u.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        params.concat([
          parseInt(limit),
          (parseInt(page) - 1) * parseInt(limit),
        ]),
      );
      // Get total count for pagination
      const totalResult = await query(
        `SELECT COUNT(*) FROM users u LEFT JOIN user_statuses us ON u.id = us.user_id ${whereClause}`,
        params,
      );
      const total = Number(totalResult.rows[0].count);
      // Map users with their statuses
      const enrichedUsers = usersResult.rows;
      res.json({
        users: enrichedUsers,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get user projects and flows
router.get(
  "/users/:userId/projects",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Get all projects for the user
      const projectsResult = await query(
        `SELECT id, name, description, created_at, updated_at FROM projects WHERE user_id = $1`,
        [userId],
      );
      const projects = projectsResult.rows;
      // Get all flows for these projects
      const projectIds = projects.map((p) => p.id);
      let flowsByProject = {};
      if (projectIds.length > 0) {
        const flowsResult = await query(
          `SELECT id, name, deployed, deployed_at, project_id FROM flows WHERE project_id = ANY($1::uuid[])`,
          [projectIds],
        );
        flowsByProject = flowsResult.rows.reduce((acc, flow) => {
          if (!acc[flow.project_id]) acc[flow.project_id] = [];
          acc[flow.project_id].push({
            id: flow.id,
            name: flow.name,
            deployed: flow.deployed,
            deployedAt: flow.deployed_at,
          });
          return acc;
        }, {});
      }
      // Attach flows to each project
      const projectsWithFlows = projects.map((project) => ({
        ...project,
        flows: flowsByProject[project.id] || [],
      }));
      res.json(projectsWithFlows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get audit logs
router.get(
  "/audit-logs",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, action, targetEmail } = req.query;

      let where = [];
      let params = [];
      let idx = 1;
      if (action) {
        where.push(`action = $${idx}`);
        params.push(action);
        idx++;
      }
      if (targetEmail) {
        where.push(`target_email ILIKE $${idx}`);
        params.push(`%${targetEmail}%`);
        idx++;
      }
      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const logsResult = await query(
        `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        params.concat([
          parseInt(limit),
          (parseInt(page) - 1) * parseInt(limit),
        ]),
      );
      const totalResult = await query(
        `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
        params,
      );
      const total = Number(totalResult.rows[0].count);
      res.json({
        logs: logsResult.rows,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Set rate limits for user
router.post(
  "/rate-limits",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  checkPermission("manage_quotas"),
  async (req, res) => {
    try {
      const {
        userId,
        projectId,
        requestsPerMinute,
        requestsPerHour,
        requestsPerDay,
        tier,
      } = req.body;

      // Upsert into rate_limit_configs table
      const upsertResult = await query(
        `INSERT INTO rate_limit_configs (user_id, project_id, requests_per_minute, requests_per_hour, requests_per_day, tier)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, project_id)
         DO UPDATE SET requests_per_minute = $3, requests_per_hour = $4, requests_per_day = $5, tier = $6
         RETURNING *`,
        [
          userId,
          projectId,
          requestsPerMinute,
          requestsPerHour,
          requestsPerDay,
          tier,
        ],
      );
      const config = upsertResult.rows[0];

      await createAuditLog(
        req.admin._id,
        "rate_limit_set",
        "RateLimit",
        config.id,
        null,
        req.body,
      );

      res.json(config);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get system configuration
router.get(
  "/system-config",
  adminAuthenticate,
  requireAdminRole(["super_admin"]),
  async (req, res) => {
    try {
      const configsResult = await query("SELECT * FROM system_configs");
      res.json(configsResult.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update system configuration
router.post(
  "/system-config",
  adminAuthenticate,
  requireAdminRole(["super_admin"]),
  checkPermission("manage_system"),
  async (req, res) => {
    try {
      const { key, value, description } = req.body;

      // Upsert into system_configs table
      const upsertResult = await query(
        `INSERT INTO system_configs (key, value, description, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (key)
         DO UPDATE SET value = $2, description = $3, updated_by = $4, updated_at = NOW()
         RETURNING *`,
        [key, value, description, req.admin._id],
      );
      const config = upsertResult.rows[0];

      await createAuditLog(
        req.admin._id,
        "system_config_changed",
        "SystemConfig",
        config.id,
        null,
        { key, value },
      );

      res.json(config);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get usage analytics
router.get(
  "/analytics/usage",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  async (req, res) => {
    try {
      const { userId, projectId, startDate, endDate } = req.query;

      let where = [];
      let params = [];
      let idx = 1;
      if (userId) {
        where.push(`user_id = $${idx}`);
        params.push(userId);
        idx++;
      }
      if (projectId) {
        where.push(`project_id = $${idx}`);
        params.push(projectId);
        idx++;
      }
      if (startDate) {
        where.push(`date >= $${idx}`);
        params.push(startDate);
        idx++;
      }
      if (endDate) {
        where.push(`date <= $${idx}`);
        params.push(endDate);
        idx++;
      }
      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const analyticsResult = await query(
        `SELECT * FROM usage_analytics ${whereClause} ORDER BY date DESC LIMIT 100`,
        params,
      );
      res.json(analyticsResult.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Delete user (hard delete)
router.delete(
  "/users/:userId",
  adminAuthenticate,
  requireAdminRole(["super_admin"]),
  checkPermission("manage_users"),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      // Check if user exists
      const userResult = await query("SELECT * FROM users WHERE id = $1", [
        userId,
      ]);
      if (userResult.rows.length === 0)
        return res.status(404).json({ error: "User not found" });
      const user = userResult.rows[0];

      // Delete user data and related records
      await query("DELETE FROM user_statuses WHERE user_id = $1", [userId]);
      await query("DELETE FROM projects WHERE user_id = $1", [userId]);
      await query("DELETE FROM flows WHERE user_id = $1", [userId]);
      await query("DELETE FROM users WHERE id = $1", [userId]);

      await createAuditLog(
        req.admin._id,
        "user_deleted",
        "User",
        userId,
        user.email,
        { action: "hard_delete" },
        reason,
      );

      res.json({ message: "User and all associated data deleted" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
