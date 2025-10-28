-- Criar tabela store_settings para configurações da loja
CREATE TABLE IF NOT EXISTS store_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  logo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Adicionar colunas product_name e barcode na tabela sales se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='product_name') THEN
        ALTER TABLE sales ADD COLUMN product_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='barcode') THEN
        ALTER TABLE sales ADD COLUMN barcode TEXT;
    END IF;
END $$;

-- Habilitar RLS (Row Level Security) para store_settings
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Criar política para store_settings - usuários só podem ver/editar seus próprios dados
CREATE POLICY "Users can view own store_settings" ON store_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own store_settings" ON store_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own store_settings" ON store_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own store_settings" ON store_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at na tabela store_settings
CREATE TRIGGER update_store_settings_updated_at 
    BEFORE UPDATE ON store_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();