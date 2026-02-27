import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!URL || !KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
}

export const supabase = createClient(URL, KEY)
