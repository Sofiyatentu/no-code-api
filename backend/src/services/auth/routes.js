import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { query } from "../../config/db.js";
import { authenticate, asyncHandler } from "../../middleware/auth.js";

const router = express.Router();

/* ============================
      SIGNUP
============================= */
router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    try {
      const { email, username, password, firstName, lastName } = req.body;
      console.log("BODY RECEIVED:", req.body);

      if (!email || !username || !password) {
        return res
          .status(400)
          .json({ error: "Email, username, and password are required" });
      }

      // Check if user exists
      const existingUserResult = await query(
        "SELECT * FROM users WHERE email = $1 OR username = $2",
        [email, username],
      );
      if (existingUserResult.rows.length > 0) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const bcrypt = await import("bcryptjs");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insert user
      const insertResult = await query(
        `INSERT INTO users (email, username, password, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [email, username, hashedPassword, firstName, lastName],
      );
      const user = insertResult.rows[0];

      const token = jwt.sign(
        { userId: user.id, email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE },
      );

      return res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      });
    } catch (err) {
      console.error("SIGNUP GENERAL ERROR:", err);
      return res
        .status(500)
        .json({ error: "Signup failed", details: err.message });
    }
  }),
);

/* ============================
      LOGIN
============================= */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      // Find user by email
      const userResult = await query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: "Invalid credentials" });
      }
      const user = userResult.rows[0];

      // Compare password
      const bcrypt = await import("bcryptjs");
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      // Check if user is admin
      const adminResult = await query(
        "SELECT role FROM admins WHERE user_id = $1 AND is_active = true",
        [user.id]
      );
      const admin = adminResult.rows.length > 0 ? adminResult.rows[0] : null;

      const token = jwt.sign(
        { userId: user.id, email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE },
      );

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          role: admin?.role || "user",
        },
      });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      return res
        .status(500)
        .json({ error: "Login failed", details: err.message });
    }
  }),
);

/* ============================
      CURRENT USER
============================= */
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const userResult = await query("SELECT * FROM users WHERE id = $1", [
        req.userId,
      ]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = userResult.rows[0];

      const adminResult = await query(
        "SELECT role FROM admins WHERE user_id = $1 AND is_active = true",
        [req.userId]
      );
      const admin = adminResult.rows.length > 0 ? adminResult.rows[0] : null;

      return res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: admin?.role || "user",
      });
    } catch (err) {
      console.error("ME ERROR:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch user", details: err.message });
    }
  }),
);

/* ============================
      CREATE API KEY
============================= */
router.post(
  "/api-keys",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const { name, projectId } = req.body;
      const key = crypto.randomBytes(32).toString("hex");

      const insertResult = await query(
        `INSERT INTO api_keys (user_id, project_id, name, key) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [req.userId, projectId || null, name, key]
      );
      const apiKey = insertResult.rows[0];

      return res.status(201).json({
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key,
        createdAt: apiKey.created_at,
      });
    } catch (err) {
      console.error("API KEY CREATE ERROR:", err);
      return res
        .status(500)
        .json({ error: "Failed to create API key", details: err.message });
    }
  }),
);

/* ============================
      LIST API KEYS
============================= */
router.get(
  "/api-keys",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const result = await query(
        "SELECT id, user_id, project_id, name, key, active, created_at FROM api_keys WHERE user_id = $1",
        [req.userId]
      );
      return res.json(result.rows);
    } catch (err) {
      console.error("LIST API KEYS ERROR:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch API keys", details: err.message });
    }
  }),
);

/* ============================
      REVOKE API KEY
============================= */
router.delete(
  "/api-keys/:keyId",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const result = await query(
        "UPDATE api_keys SET active = false WHERE id = $1 AND user_id = $2 RETURNING *",
        [req.params.keyId, req.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "API key not found" });
      }

      return res.json({ message: "API key revoked" });
    } catch (err) {
      console.error("REVOKE API KEY ERROR:", err);
      return res
        .status(500)
        .json({ error: "Failed to revoke API key", details: err.message });
    }
  }),
);

export default router;
