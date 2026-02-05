// routes/projects.js
import express from "express";
import { query } from "../../config/db.js";
import { authenticate, asyncHandler } from "../../middleware/auth.js";
import { body, validationResult } from "express-validator";
import crypto from "crypto";

const router = express.Router();

// ==================== SECURITY CONFIG ====================
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ||
  "04df90367f90da7e60dcf230fcbd310dba5f769a3aa17f6c3ddbd0613a11fa0f"; // Must be 32 bytes (64 hex chars)
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    "ENCRYPTION_KEY must be 64 hex chars (32 bytes). Run: Generate with: node -e \"console.log(crypto.randomBytes(32).toString('hex'))\"",
  );
}

const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "hex"),
      iv,
    );
    const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString("hex"),
      content: encrypted.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  } catch (err) {
    throw new Error("Encryption failed: " + err.message);
  }
};

const decrypt = ({ iv, content, authTag }) => {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "hex"),
      Buffer.from(iv, "hex"),
    );
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    return Buffer.concat([
      decipher.update(content, "hex"),
      decipher.final(),
    ]).toString("utf8");
  } catch (err) {
    throw new Error("Invalid or corrupted mongoUri encryption data");
  }
};

// ==================== VALIDATION MIDDLEWARE ====================
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((e) => ({ field: e.param, message: e.msg })),
    });
  }
  next();
};

// ==================== ROUTES ====================

/**
 * GET /api/projects
 */
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const result = await query(
        "SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC",
        [req.userId],
      );
      res.json(result.rows);
    } catch (err) {
      console.error("GET /projects error:", err);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  }),
);

/**
 * POST /api/projects — WITH ENCRYPTION
 */
router.post(
  "/",
  authenticate,
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be 2–100 characters"),
    body("mongoUri")
      .trim()
      .matches(/^mongodb(\+srv)?:\/\//i)
      .withMessage("Invalid MongoDB URI"),
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description too long"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    try {
      const { name, mongoUri, description = "" } = req.body;

      // Generate unique slug
      let baseSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-+|-+$)/g, "");

      if (!baseSlug) baseSlug = "project";

      let counter = 0;
      let finalSlug = baseSlug;
      while (true) {
        const existsResult = await query(
          "SELECT 1 FROM projects WHERE user_id = $1 AND slug = $2",
          [req.userId, finalSlug],
        );
        if (existsResult.rows.length === 0) break;
        finalSlug = `${baseSlug}-${++counter}`;
      }

      // Encrypt MongoDB URI
      const encryptedUri = encrypt(mongoUri.trim());
      const insertResult = await query(
        `INSERT INTO projects (user_id, name, slug, mongo_uri, description, base_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          req.userId,
          name.trim(),
          finalSlug,
          JSON.stringify(encryptedUri),
          description.trim(),
          `${process.env.API_GATEWAY_URL?.replace(/\/+$/, "")}/${req.user.username}/${finalSlug}`,
        ],
      );
      res.status(201).json(insertResult.rows[0]);
    } catch (err) {
      console.error("Create project error:", err);
      res
        .status(500)
        .json({ error: "Failed to create project. Please try again." });
    }
  }),
);

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
      const updates = { ...req.body };

      // Re-generate slug if name changed
      if (updates.name) {
        let newSlug = updates.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-+|-+$)/g, "");
        if (!newSlug) newSlug = "project";
        let counter = 0;
        let finalSlug = newSlug;
        while (true) {
          const existsResult = await query(
            "SELECT 1 FROM projects WHERE user_id = $1 AND slug = $2 AND id != $3",
            [req.userId, finalSlug, req.params.projectId],
          );
          if (existsResult.rows.length === 0) break;
          finalSlug = `${newSlug}-${++counter}`;
        }
        updates.slug = finalSlug;
        updates.baseUrl = `${process.env.API_GATEWAY_URL?.replace(/\/+$/, "")}/${req.user.username}/${finalSlug}`;
      }

      // Build SQL update statement
      const fields = [];
      const values = [];
      let idx = 1;
      for (const key in updates) {
        fields.push(
          `${key === "name" ? "name" : key === "description" ? "description" : key === "status" ? "status" : key === "slug" ? "slug" : key === "baseUrl" ? "base_url" : key} = $${idx}`,
        );
        values.push(updates[key]);
        idx++;
      }
      values.push(req.params.projectId, req.userId);
      const updateResult = await query(
        `UPDATE projects SET ${fields.join(", ")} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
        values,
      );
      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(updateResult.rows[0]);
    } catch (err) {
      console.error("Update project error:", err);
      res.status(500).json({ error: "Failed to update project" });
    }
  }),
);

/**
 * DELETE /api/projects/:projectId
 */
router.delete(
  "/:projectId",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const deleteResult = await query(
        "DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *",
        [req.params.projectId, req.userId],
      );
      if (deleteResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Project not found or already deleted" });
      }
      res.json({ message: "Project deleted successfully" });
    } catch (err) {
      console.error("Delete project error:", err);
      res.status(500).json({ error: "Failed to delete project" });
    }
  }),
);

export default router;
