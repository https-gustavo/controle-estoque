import { z } from 'zod'

export const produtoSchema = z.object({
  name: z.string().min(2).max(120),
  barcode: z.string().min(3).max(64).optional().nullable(),
  quantity: z.number().int().min(0).optional().default(0),
  cost_price: z.number().min(0).optional().default(0),
  sale_price: z.number().min(0).optional().default(0),
})

export const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  sort: z.enum(['name', 'created_at']).optional().default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc')
})
