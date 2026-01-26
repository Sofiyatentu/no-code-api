import { Admin, AuditLog } from "./models.js"

// Create admin user
export const createAdmin = async (userId, role = "admin", permissions = []) => {
  const admin = new Admin({
    userId,
    role,
    permissions,
  })
  return await admin.save()
}

// Get admin by user ID
export const getAdminByUserId = async (userId) => {
  return await Admin.findOne({ userId })
}

// Update admin permissions
export const updateAdminPermissions = async (adminId, permissions) => {
  return await Admin.findByIdAndUpdate(adminId, { permissions }, { new: true })
}

// Get audit logs with pagination
export const getAuditLogs = async (filter = {}, page = 1, limit = 50) => {
  const skip = (page - 1) * limit
  const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit)
  const total = await AuditLog.countDocuments(filter)

  return {
    logs,
    pagination: { total, pages: Math.ceil(total / limit), currentPage: page },
  }
}
