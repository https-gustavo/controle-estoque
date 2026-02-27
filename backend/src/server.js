import 'dotenv/config'
import { buildApp } from './app.js'
import { SUPABASE_AVAILABLE } from './lib/supabase.js'
import dotenv from 'dotenv'
dotenv.config()
const app = buildApp()
const PORT = process.env.PORT || 5773
app.listen(PORT, () => {
  process.stdout.write(`Backend on http://localhost:${PORT}\n`)
  process.stdout.write(`Supabase: ${SUPABASE_AVAILABLE ? 'AVAILABLE' : 'NOT CONFIGURED'}\n`)
})
