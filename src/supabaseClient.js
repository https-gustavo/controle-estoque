/**
 * Configuração do cliente Supabase
 * Inicializa a conexão com o banco de dados e serviços de autenticação
 */
import { createClient } from '@supabase/supabase-js'

// Configurações do Supabase obtidas das variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Cliente Supabase configurado para uso em toda a aplicação
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
