import rateLimit from 'express-rate-limit'

export function makeRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const key = req.userId ? `u:${req.userId}` : 'anon'
      return `${key}|ip:${req.ip}`
    },
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests' }
      })
    }
  })
}
