/**
 * Configuração do cliente Supabase
 * Inicializa a conexão com o banco de dados e serviços de autenticação
 */
import { createClient } from '@supabase/supabase-js'

// Configurações do Supabase obtidas das variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = (() => {
  if (!supabaseUrl || !supabaseAnonKey) return false
  if (typeof supabaseUrl !== 'string') return false
  if (!supabaseUrl.startsWith('https://')) return false
  if (!supabaseUrl.includes('.supabase.co')) return false
  return true
})()

// Cliente Supabase configurado para uso em toda a aplicação
export const supabase = createClient(supabaseUrl || 'https://invalid.supabase.co', supabaseAnonKey || 'invalid', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Configurações adicionais para evitar redirecionamentos incorretos
    flowType: 'pkce'
  }
})
