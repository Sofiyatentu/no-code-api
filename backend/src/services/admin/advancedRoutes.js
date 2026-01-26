import express from "express"
import { adminAuthenticate, requireAdminRole, checkPermission } from "../../middleware/adminAuth.js"
import {
  getUserProfile,
  getUserActivityHistory,
  getUserProjects,
  getUserFlows,
  calculateUserUsage,
  updateUserQuota,
} from "./userManagement.js"

const router = express.Router()

// Get detailed user profile
router.get(
  "/users/:userId/profile",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  checkPermission("manage_users"),
  async (req, res) => {
    try {
      const profile = await getUserProfile(req.params.userId)
      res.json(profile)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

// Get user activity history
router.get(
  "/users/:userId/activity",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  checkPermission("manage_users"),
  async (req, res) => {
    try {
      const { limit = 50 } = req.query
      const activity = await getUserActivityHistory(req.params.userId, Number.parseInt(limit))
      res.json(activity)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

// Get user projects with stats
router.get(
  "/users/:userId/projects-stats",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  checkPermission("manage_users"),
  async (req, res) => {
    try {
      const projects = await getUserProjects(req.params.userId)
      res.json(projects)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

// Get user flows with stats
router.get(
  "/users/:userId/flows-stats",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  checkPermission("manage_users"),
  async (req, res) => {
    try {
      const flows = await getUserFlows(req.params.userId)
      res.json(flows)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

// Get user usage metrics
router.get(
  "/users/:userId/usage",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  checkPermission("manage_users"),
  async (req, res) => {
    try {
      const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = req.query

      const usage = await calculateUserUsage(req.params.userId, new Date(startDate), new Date(endDate))
      res.json(usage)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

// Update user quota and tier
router.put(
  "/users/:userId/quota",
  adminAuthenticate,
  requireAdminRole(["super_admin", "admin"]),
  checkPermission("manage_quotas"),
  async (req, res) => {
    try {
      const config = await updateUserQuota(req.params.userId, req.body)
      res.json(config)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  },
)

export default router
