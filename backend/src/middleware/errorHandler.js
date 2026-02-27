import { error as jsonError } from '../lib/response.js'

export function notFound(_req, res, _next) {
  return jsonError(res, 404, 'NOT_FOUND', 'Route not found')
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500
  const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR')
  const message = err.message || 'Internal server error'
  return jsonError(res, status, code, message, err.details)
}
