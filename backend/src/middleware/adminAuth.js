import jwt from "jsonwebtoken"
import { Admin } from "../services/admin/models.js"

export const adminAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token) {
      return res.status(401).json({ error: "No token provided" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId

    const admin = await Admin.findOne({ userId: decoded.userId, isActive: true })
    if (!admin) {
      return res.status(403).json({ error: "Not authorized as admin" })
    }

    req.admin = admin
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
