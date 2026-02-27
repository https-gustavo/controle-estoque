CREATE TABLE IF NOT EXISTS public.products (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  barcode TEXT,
  quantity INTEGER DEFAULT 0,
  cost_price NUMERIC(10,2) DEFAULT 0,
  sale_price NUMERIC(10,2) DEFAULT 0,
  last_purchase_value NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, barcode)
);

CREATE TABLE IF NOT EXISTS public.sales (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT,
  barcode TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.store_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  logo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_sel ON public.products;
DROP POLICY IF EXISTS products_ins ON public.products;
DROP POLICY IF EXISTS products_upd ON public.products;
DROP POLICY IF EXISTS products_del ON public.products;

CREATE POLICY products_sel ON public.products
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY products_ins ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY products_upd ON public.products
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY products_del ON public.products
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sales_sel ON public.sales;
DROP POLICY IF EXISTS sales_ins ON public.sales;
DROP POLICY IF EXISTS sales_upd ON public.sales;
DROP POLICY IF EXISTS sales_del ON public.sales;

CREATE POLICY sales_sel ON public.sales
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sales_ins ON public.sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sales_upd ON public.sales
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY sales_del ON public.sales
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS store_settings_sel ON public.store_settings;
DROP POLICY IF EXISTS store_settings_ins ON public.store_settings;
DROP POLICY IF EXISTS store_settings_upd ON public.store_settings;
DROP POLICY IF EXISTS store_settings_del ON public.store_settings;

CREATE POLICY store_settings_sel ON public.store_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY store_settings_ins ON public.store_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY store_settings_upd ON public.store_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY store_settings_del ON public.store_settings
  FOR DELETE USING (auth.uid() = user_id);

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos','logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY logos_read ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY logos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');
CREATE POLICY logos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos')
  WITH CHECK (bucket_id = 'logos');
CREATE POLICY logos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos');
