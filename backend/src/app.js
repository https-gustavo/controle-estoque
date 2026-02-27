import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import fs from 'fs'
import path from 'path'
import url from 'url'
import routes from './routes/index.js'
import { requestId } from './middleware/requestId.js'
import { logger } from './middleware/logger.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

export function buildApp() {
  const app = express()
  const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
  app.use(cors({ origin: CORS_ORIGIN }))
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(express.json())
  app.use(requestId)
  app.use(logger)

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } })
  })
  app.use('/api', routes)

  const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
  const openapiPath = path.join(__dirname, 'docs', 'openapi.json')
  if (fs.existsSync(openapiPath)) {
    const spec = JSON.parse(fs.readFileSync(openapiPath, 'utf-8'))
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec))
  }

  app.use(notFound)
  app.use(errorHandler)
  return app
}
