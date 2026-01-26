// middleware/rateLimiter.js
import rateLimit from "express-rate-limit"

export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.params.username}:${req.params.slug}`,
    handler: (_, res) => {
        res.status(429).json({
            error: "Too many requests",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter: 900,
        })
    },
})