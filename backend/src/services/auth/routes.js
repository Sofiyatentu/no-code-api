import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User, ApiKey } from "./models.js";
import { Admin } from "../admin/models.js";
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
        return res.status(400).json({ error: "Email, username, and password are required" });
      }

      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const user = new User({
        email,
        username,
        password,
        firstName,
        lastName,
      });

      try {
        await user.save();
      } catch (saveErr) {
        console.error("USER SAVE ERROR:", saveErr);
        return res.status(500).json({
          error: "Failed to create user",
          details: saveErr.message,
        });
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      return res.status(201).json({
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (err) {
      console.error("SIGNUP GENERAL ERROR:", err);
      return res.status(500).json({ error: "Signup failed", details: err.message });
    }
  })
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

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      const admin = await Admin.findOne({ userId: user._id });

      return res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: admin?.role || "user",
        },
      });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      return res.status(500).json({ error: "Login failed", details: err.message });
    }
  })
);

/* ============================
      CURRENT USER
============================= */
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      const admin = await Admin.findOne({ userId: req.userId });

      return res.json({
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: admin?.role || "user",
      });
    } catch (err) {
      console.error("ME ERROR:", err);
      return res.status(500).json({ error: "Failed to fetch user", details: err.message });
    }
  })
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

      const apiKey = new ApiKey({
        userId: req.userId,
        projectId,
        name,
        key,
      });

      await apiKey.save();

      return res.status(201).json({
        id: apiKey._id,
        name: apiKey.name,
        key,
        createdAt: apiKey.createdAt,
      });
    } catch (err) {
      console.error("API KEY CREATE ERROR:", err);
      return res.status(500).json({ error: "Failed to create API key", details: err.message });
    }
  })
);

/* ============================
      LIST API KEYS
============================= */
router.get(
  "/api-keys",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const keys = await ApiKey.find({ userId: req.userId });
      return res.json(keys);
    } catch (err) {
      console.error("LIST API KEYS ERROR:", err);
      return res.status(500).json({ error: "Failed to fetch API keys", details: err.message });
    }
  })
);

/* ============================
      REVOKE API KEY
============================= */
router.delete(
  "/api-keys/:keyId",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const key = await ApiKey.findOneAndUpdate(
        { _id: req.params.keyId, userId: req.userId },
        { active: false },
        { new: true }
      );

      if (!key) {
        return res.status(404).json({ error: "API key not found" });
      }

      return res.json({ message: "API key revoked" });
    } catch (err) {
      console.error("REVOKE API KEY ERROR:", err);
      return res.status(500).json({ error: "Failed to revoke API key", details: err.message });
    }
  })
);

export default router;
