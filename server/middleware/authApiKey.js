import { supabase } from '../services/supabaseClient.js'
import { error as jsonError } from '../lib/response.js'

export async function authApiKey(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return jsonError(res, 401, 'UNAUTHORIZED', 'Invalid credentials')
    const { data, error } = await supabase.rpc('api_resolve_user', { p_api_key: token })
    if (error || !data) return jsonError(res, 401, 'UNAUTHORIZED', 'Invalid credentials')
    req.userId = data
    return next()
  } catch {
    return jsonError(res, 401, 'UNAUTHORIZED', 'Invalid credentials')
  }
}
