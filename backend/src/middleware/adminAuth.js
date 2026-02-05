import jwt from "jsonwebtoken"
import { query } from "../config/db.js"

export const adminAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token) {
      return res.status(401).json({ error: "No token provided" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId

    const result = await query(
      "SELECT id, user_id, role, permissions, is_active FROM admins WHERE user_id = $1 AND is_active = true",
      [decoded.userId]
    )
    if (result.rows.length === 0) {
      return res.status(403).json({ error: "Not authorized as admin" })
    }

    req.admin = result.rows[0]
    next()
  } catch (error) {
    res.status(401).json({ error: "Invalid token" })
  }
}

export const requireAdminRole =
  (allowedRoles = []) =>
  (req, res, next) => {
    if (!req.admin) {
      return res.status(403).json({ error: "Admin access required" })
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ error: "Insufficient permissions" })
    }

    next()
  }

export const checkPermission = (permission) => (req, res, next) => {
  if (!req.admin.permissions.includes(permission) && req.admin.role !== "super_admin") {
    return res.status(403).json({ error: "Permission denied" })
  }
  next()
}
