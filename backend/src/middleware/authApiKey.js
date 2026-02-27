import { getSupabase } from '../lib/supabase.js'
import { sha256Hex } from '../lib/crypto.js'
import { error as jsonError } from '../lib/response.js'

export async function authApiKey(req, res, next) {
  try {
    const supabase = getSupabase()
    const DEBUG = String(process.env.DEBUG_API_AUTH).toLowerCase() === 'true'
    if (DEBUG) {
      try {
        req.log?.info({ tag: 'auth.debug.hit' }, 'auth middleware executed')
        req.log?.info(
          {
            tag: 'auth.debug.env',
            supabaseUrl: process.env.SUPABASE_URL,
            serviceRoleKeySet: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
          },
          'auth.debug.env'
        )
      } catch {}
    }
    const auth = req.headers.authorization || ''
    const raw = auth.startsWith('Bearer ') ? auth.slice(7) : null
    const token = raw ? String(raw).trim() : null
    if (!token) return jsonError(res, 401, 'UNAUTHORIZED', 'Invalid credentials')
    const hash = sha256Hex(token)
    const { data, error } = await supabase
      .from('api_keys')
      .select('id,user_id,revoked,expires_at,key_hash')
      .eq('key_hash', hash)
      .maybeSingle()
    if (DEBUG) {
      try {
        req.log?.info(
          {
            keyLen: String(token.length),
            hashPrefix: hash.slice(0, 8),
            found: Boolean(data && !error),
            errorMessage: error?.message
          },
          'auth.debug.lookup'
        )
        req.log?.info(
          { present: Boolean(data), revoked: data?.revoked, expires_at: data?.expires_at },
          'auth.debug.record'
        )
      } catch {}
    }
    if (error) {
      if (DEBUG) req.log?.info({ errorMessage: error?.message }, 'auth.debug.decision=INTERNAL_ERROR:query_error')
      return jsonError(res, 500, 'DB_QUERY_ERROR', 'Internal error', error?.message)
    }
    if (!data) {
      if (DEBUG) req.log?.info('auth.debug.decision=UNAUTHORIZED:not_found')
    }
    // Suporte a modelos com 'active' ou 'revoked' (defensivo)
    if (Object.prototype.hasOwnProperty.call(data, 'revoked') && data.revoked === true) {
      return jsonError(res, 401, 'UNAUTHORIZED', 'Invalid credentials')
    }
    if (Object.prototype.hasOwnProperty.call(data, 'active') && data.active === false) {
      const exp = new Date(data.expires_at)
      const now = new Date()
      if (Number.isFinite(exp.getTime()) && exp <= now) {
        if (DEBUG) req.log?.info({ expires_at: data.expires_at }, 'auth.debug.decision=UNAUTHORIZED:expired')
        return jsonError(res, 401, 'UNAUTHORIZED', 'Invalid credentials')
        return jsonError(res, 401, 'UNAUTHORIZED', 'Invalid credentials')
      }
    }
    try {
      await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
    } catch (e) {
      req.log?.warn({ err: e, apiKeyId: data.id }, 'auth.debug.lastUsedUpdateFailed')
    }
    req.userId = data.user_id
    req.apiKeyId = data.id
    if (DEBUG) req.log?.info({ apiKeyId: data.id }, 'auth.debug.decision=AUTHORIZED')
    return next()
  } catch {
    return jsonError(res, 401, 'UNAUTHORIZED', 'Invalid credentials')
  }
}
