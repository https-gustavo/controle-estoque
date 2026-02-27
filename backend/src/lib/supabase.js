import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

let client = null

export const SUPABASE_AVAILABLE =
  Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

export function getSupabase() {
  if (!SUPABASE_AVAILABLE) {
    const err = new Error('Supabase not configured')
    err.code = 'SUPABASE_NOT_CONFIGURED'
    throw err
  }
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })
  }
  return client
}
