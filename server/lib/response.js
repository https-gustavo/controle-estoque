export function ok(res, data, meta) {
  const payload = { success: true, data }
  if (meta) payload.meta = meta
  return res.json(payload)
}

export function created(res, data, meta) {
  const payload = { success: true, data }
  if (meta) payload.meta = meta
  return res.status(201).json(payload)
}

export function noContent(res) {
  return res.status(204).send()
}

export function error(res, status, code, message, details) {
  return res.status(status).json({
    success: false,
    error: { code, message, details }
  })
}
