import jwt from "jsonwebtoken"

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({ error: "No token provided" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ error: "Invalid token" })
  }
}

export const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"]

    if (!apiKey) {
      return next()
    }

    // Validate API key against database
    const { query } = await import("../config/db.js")
    const result = await query(
      "SELECT user_id, project_id FROM api_keys WHERE key = $1 AND active = true",
      [apiKey]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid API key" })
    }

    const keyDoc = result.rows[0]
    req.userId = keyDoc.user_id
    req.projectId = keyDoc.project_id
    next()
  } catch (err) {
    next(err)
  }
}
