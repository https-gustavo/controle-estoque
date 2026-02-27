import { z } from 'zod'
import { listProdutos, getProduto, createProduto, updateProduto, deleteProduto } from '../services/produtosService.js'
import { ok, created, noContent, error as jsonError } from '../lib/response.js'

const produtoSchema = z.object({
  name: z.string().min(2).max(120),
  barcode: z.string().min(3).max(64).optional().nullable(),
  quantity: z.number().int().min(0).optional().default(0),
  cost_price: z.number().min(0).optional().default(0),
  sale_price: z.number().min(0).optional().default(0),
})
const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  sort: z.enum(['name', 'created_at']).optional().default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
})

export async function index(req, res) {
  try {
    const q = querySchema.safeParse(req.query)
    if (!q.success) return jsonError(res, 400, 'BAD_REQUEST', 'Invalid query params', q.error.issues)
    const { data, meta } = await listProdutos(req.userId, q.data)
    return ok(res, data, meta)
  } catch (e) {
    return jsonError(res, 500, 'INTERNAL_ERROR', e.message)
  }
}

export async function show(req, res) {
  try {
    const data = await getProduto(req.userId, req.params.id)
    if (!data) return jsonError(res, 404, 'NOT_FOUND', 'Not found')
    return ok(res, data)
  } catch (e) {
    return jsonError(res, 500, 'INTERNAL_ERROR', e.message)
  }
}

export async function store(req, res) {
  try {
    const parse = produtoSchema.safeParse(req.body)
    if (!parse.success) return jsonError(res, 400, 'BAD_REQUEST', 'Invalid body', parse.error.issues)
    const data = await createProduto(req.userId, parse.data)
    return created(res, data)
  } catch (e) {
    return jsonError(res, 500, 'INTERNAL_ERROR', e.message)
  }
}

export async function update(req, res) {
  try {
    const schema = produtoSchema.partial()
    const parse = schema.safeParse(req.body)
    if (!parse.success) return jsonError(res, 400, 'BAD_REQUEST', 'Invalid body', parse.error.issues)
    const data = await updateProduto(req.userId, req.params.id, parse.data)
    if (!data) return jsonError(res, 404, 'NOT_FOUND', 'Not found')
    return ok(res, data)
  } catch (e) {
    return jsonError(res, 500, 'INTERNAL_ERROR', e.message)
  }
}

export async function destroy(req, res) {
  try {
    await deleteProduto(req.userId, req.params.id)
    return noContent(res)
  } catch (e) {
    return jsonError(res, 500, 'INTERNAL_ERROR', e.message)
  }
}
