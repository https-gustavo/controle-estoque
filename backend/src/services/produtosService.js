import { getSupabase } from '../lib/supabase.js'

export async function listProdutos(userId, { page = 1, limit = 20, search, sort = 'name', order = 'asc' } = {}) {
  const supabase = getSupabase()
  const from = (page - 1) * limit
  const to = from + limit - 1
  let query = supabase.from('products').select('*', { count: 'exact' }).eq('user_id', userId)
  if (search && search.trim()) {
    const term = search.trim()
    query = query.or(`name.ilike.%${term}%,barcode.ilike.%${term}%`)
  }
  if (!['name', 'created_at'].includes(sort)) sort = 'name'
  if (!['asc', 'desc'].includes(order)) order = 'asc'
  query = query.order(sort, { ascending: order === 'asc' }).range(from, to)
  const { data, error, count } = await query
  if (error) throw error
  return {
    data: data || [],
    meta: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.max(1, Math.ceil((count || 0) / limit))
    }
  }
}

export async function getProduto(userId, id) {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('products').select('*').eq('user_id', userId).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createProduto(userId, payload) {
  const supabase = getSupabase()
  const row = { ...payload, user_id: userId }
  const { data, error } = await supabase.from('products').insert([row]).select('*').maybeSingle()
  if (error) throw error
  return data
}

export async function updateProduto(userId, id, payload) {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('products').update(payload).eq('user_id', userId).eq('id', id).select('*').maybeSingle()
  if (error) throw error
  return data
}

export async function deleteProduto(userId, id) {
  const supabase = getSupabase()
  const { error } = await supabase.from('products').delete().eq('user_id', userId).eq('id', id)
  if (error) throw error
  return true
}
