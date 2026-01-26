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
    const { ApiKey } = await import("../services/auth/models.js")
    const keyDoc = await ApiKey.findOne({ key: apiKey, active: true })

    if (!keyDoc) {
      return res.status(401).json({ error: "Invalid API key" })
    }

    req.userId = keyDoc.userId
    req.projectId = keyDoc.projectId
    next()
  } catch (err) {
    next(err)
  }
}
