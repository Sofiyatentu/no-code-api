import logger from "../utils/logger.js"


export const errorHandler = (err, req, res, next) => {
  logger.error("Unhandled Error", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  })

  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      details: Object.values(err.errors).map((e) => e.message),
    })
  }

  // Duplicate key
  if (err.code === 11000) {
    return res.status(409).json({
      error: "Conflict",
      message: "Resource already exists",
    })
  }

  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message,
  })
}

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
