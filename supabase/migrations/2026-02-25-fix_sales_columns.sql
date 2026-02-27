-- Ajusta a tabela sales para os nomes esperados pelo app
-- Alinha colunas: total (numérico) e date (timestamptz)
-- Torna product_id INTEGER referenciando products(id)

DO $$
BEGIN
  -- Garantir que a coluna "date" exista
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'date'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN "date" TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Se existir "sale_date" e "date" estiver nula, migra valores
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'sale_date'
  ) THEN
    UPDATE public.sales SET "date" = COALESCE("date", sale_date);
    ALTER TABLE public.sales DROP COLUMN sale_date;
  END IF;

  -- Garantir que a coluna "total" exista
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'total'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN total NUMERIC;
  END IF;

  -- Se existir "total_price", migra os dados e remove
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'total_price'
  ) THEN
    UPDATE public.sales SET total = COALESCE(total, total_price);
    ALTER TABLE public.sales DROP COLUMN total_price;
  END IF;

  -- Ajusta o tipo de product_id para INTEGER caso necessário
  -- Nota: Apenas se products.id for INTEGER (SERIAL). Caso já seja INTEGER, este bloco será ignorado.
  BEGIN
    ALTER TABLE public.sales
      ALTER COLUMN product_id TYPE INTEGER USING product_id::INTEGER,
      DROP CONSTRAINT IF EXISTS sales_product_id_fkey,
      ADD CONSTRAINT sales_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  EXCEPTION WHEN others THEN
    -- Ignora se a conversão não for necessária
    NULL;
  END;
END $$;

-- Índices úteis
CREATE INDEX IF NOT EXISTS sales_user_id_idx ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS sales_date_idx ON public.sales("date");
