// routes/projects.js
import express from "express"
import { Project } from "./models.js"
import { authenticate, asyncHandler } from "../../middleware/auth.js"
import { body, validationResult } from "express-validator"
import crypto from "crypto"

const router = express.Router()

// ==================== SECURITY CONFIG ====================
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "04df90367f90da7e60dcf230fcbd310dba5f769a3aa17f6c3ddbd0613a11fa0f" // Must be 32 bytes (64 hex chars)
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // GCM recommended

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes). Run: Generate with: node -e \"console.log(crypto.randomBytes(32).toString('hex'))\"")
}


const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, "hex"), iv)
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()])
    const authTag = cipher.getAuthTag()

    return {
      iv: iv.toString("hex"),
      content: encrypted.toString("hex"),
      authTag: authTag.toString("hex"),
    }
  } catch (err) {
    throw new Error("Encryption failed: " + err.message)
  }
}

const decrypt = ({ iv, content, authTag }) => {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "hex"),
      Buffer.from(iv, "hex")
    )
    decipher.setAuthTag(Buffer.from(authTag, "hex"))

    return Buffer.concat([
      decipher.update(content, "hex"),
      decipher.final(),
    ]).toString("utf8")
  } catch (err) {
    throw new Error("Invalid or corrupted mongoUri encryption data")
  }
}

// ==================== VALIDATION MIDDLEWARE ====================
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map(e => ({ field: e.param, message: e.msg }))
    })
  }
  next()
}

// ==================== ROUTES ====================

/**
 * GET /api/projects
 */
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const projects = await Project.find({ userId: req.userId })
        .select("-mongoUri -__v")
        .sort({ createdAt: -1 })
        .lean()

      res.json(projects.map(p => p.toClient ? p.toClient() : p))
    } catch (err) {
      console.error("GET /projects error:", err)
      res.status(500).json({ error: "Failed to fetch projects" })
    }
  })
)

/**
 * POST /api/projects — WITH ENCRYPTION
 */
router.post(
  "/",
  authenticate,
  [
    body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must be 2–100 characters"),
    body("mongoUri").trim().matches(/^mongodb(\+srv)?:\/\//i).withMessage("Invalid MongoDB URI"),
    body("description").optional().isLength({ max: 500 }).withMessage("Description too long"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    try {
      const { name, mongoUri, description = "" } = req.body

      // Generate unique slug
      let baseSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-+|-+$)/g, "")

      if (!baseSlug) baseSlug = "project"

      let counter = 0
      let finalSlug = baseSlug
      while (true) {
        const exists = await Project.exists({
          userId: req.userId,
          slug: finalSlug
        })
        if (!exists) break
        finalSlug = `${baseSlug}-${++counter}`
      }

      // Encrypt MongoDB URI
      const encryptedUri = encrypt(mongoUri.trim())

      const project = await Project.create({
        userId: req.userId,
        name: name.trim(),
        slug: finalSlug,
        mongoUri: encryptedUri,
        description: description.trim(),
        baseUrl: `${process.env.API_GATEWAY_URL?.replace(/\/+$/, "")}/${req.user.username}/${finalSlug}`,
      })

      res.status(201).json(project.toClient())
    } catch (err) {
      console.error("Create project error:", err)
      res.status(500).json({ error: "Failed to create project. Please try again." })
    }
  })
)

/**
 * GET single project
router.get(
  "/:projectId",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const project = await Project.findOne({
        _id: req.params.projectId,
        userId: req.userId,
      }).lean()

      if (!project) {
        return res.status(404).json({ error: "Project not found" })
      }

      res.json(project.toClient ? project.toClient() : project)
    } catch (err) {
      console.error("Get project error:", err)
      res.status(500).json({ error: "Failed to load project" })
    }
  })
)

/**
 * PATCH /api/projects/:projectId
 */
router.patch(
  "/:projectId",
  authenticate,
  [
    body("name").optional().trim().isLength({ min: 2, max: 100 }),
    body("description").optional().isLength({ max: 500 }),
    body("status").optional().isIn(["draft", "active", "archived"]),
  ],
  validate,
  asyncHandler(async (req, res) => {
    try {
      const updates = { ...req.body }

      // Re-generate slug if name changed
      if (updates.name) {
        let newSlug = updates.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-+|-+$)/g, "")

        if (!newSlug) newSlug = "project"

        let counter = 0
        let finalSlug = newSlug
        while (true) {
          const exists = await Project.exists({
            userId: req.userId,
            slug: finalSlug,
            _id: { $ne: req.params.projectId }
          })
          if (!exists) break
          finalSlug = `${newSlug}-${++counter}`
        }

        updates.slug = finalSlug
        updates.baseUrl = `${process.env.API_GATEWAY_URL?.replace(/\/+$/, "")}/${req.user.username}/${finalSlug}`
      }

      const project = await Project.findOneAndUpdate(
        { _id: req.params.projectId, userId: req.userId },
        { $set: updates },
        { new: true, runValidators: true }
      )

      if (!project) {
        return res.status(404).json({ error: "Project not found" })
      }

      res.json(project.toClient())
    } catch (err) {
      console.error("Update project error:", err)
      res.status(500).json({ error: "Failed to update project" })
    }
  })
)

/**
 * DELETE /api/projects/:projectId
 */
router.delete(
  "/:projectId",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const project = await Project.findOneAndDelete({
        _id: req.params.projectId,
        userId: req.userId,
      })

      if (!project) {
        return res.status(404).json({ error: "Project not found or already deleted" })
      }

      // Future: cascade delete endpoints, logs, etc.
      // await Endpoint.deleteMany({ projectId: project._id })

      res.json({ message: "Project deleted successfully" })
    } catch (err) {
      console.error("Delete project error:", err)
      res.status(500).json({ error: "Failed to delete project" })
    }
  })
)

export default router