import mongoose from "mongoose"

// Admin User Model with roles
const adminSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ["super_admin", "admin", "moderator"],
    default: "admin",
  },
  permissions: [String],
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLoginAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Audit Log Model
const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  action: {
    type: String,
    enum: [
      "user_created",
      "user_updated",
      "user_deleted",
      "user_banned",
      "flow_reviewed",
      "flow_approved",
      "flow_rejected",
      "project_deleted",
      "system_config_changed",
      "rate_limit_set",
    ],
    required: true,
  },
  targetType: String,
  targetId: mongoose.Schema.Types.ObjectId,
  targetEmail: String,
  changes: mongoose.Schema.Types.Mixed,
  reason: String,
  ipAddress: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
})

// User Status Model
const userStatusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["active", "suspended", "banned", "deleted"],
    default: "active",
  },
  reason: String,
  bannedAt: Date,
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
  },
  suspendedUntil: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Rate Limit Config Model
const rateLimitConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },
  requestsPerMinute: {
    type: Number,
    default: 60,
  },
  requestsPerHour: {
    type: Number,
    default: 1000,
  },
  requestsPerDay: {
    type: Number,
    default: 10000,
  },
  tier: {
    type: String,
    enum: ["free", "pro", "enterprise"],
    default: "free",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// System Config Model
const systemConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: mongoose.Schema.Types.Mixed,
  description: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Usage Analytics Model
const usageAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },
  flowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Flow",
  },
  date: {
    type: Date,
    required: true,
  },
  totalRequests: {
    type: Number,
    default: 0,
  },
  successfulRequests: {
    type: Number,
    default: 0,
  },
  failedRequests: {
    type: Number,
    default: 0,
  },
  avgResponseTime: {
    type: Number,
    default: 0,
  },
  totalDataProcessed: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export const Admin = mongoose.model("Admin", adminSchema)
export const AuditLog = mongoose.model("AuditLog", auditLogSchema)
export const UserStatus = mongoose.model("UserStatus", userStatusSchema)
export const RateLimitConfig = mongoose.model("RateLimitConfig", rateLimitConfigSchema)
export const SystemConfig = mongoose.model("SystemConfig", systemConfigSchema)
export const UsageAnalytics = mongoose.model("UsageAnalytics", usageAnalyticsSchema)
