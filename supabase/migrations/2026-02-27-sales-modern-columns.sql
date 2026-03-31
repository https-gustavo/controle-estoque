-- Adiciona colunas "modernas" na tabela public.sales e faz backfill a partir do legado (date/total)
-- Seguro para rodar múltiplas vezes (usa IF NOT EXISTS e checagens em runtime)

-- 1) Colunas novas (se não existirem)
alter table public.sales add column if not exists sale_date timestamptz;
alter table public.sales add column if not exists unit_price numeric(10,2);
alter table public.sales add column if not exists total_price numeric(10,2);
alter table public.sales add column if not exists quantity integer;
alter table public.sales add column if not exists product_name text;
alter table public.sales add column if not exists barcode text;

-- 2) Backfill de sale_date a partir de "date" legado (se existir) ou created_at
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='sales' and column_name='date'
  ) then
    update public.sales
       set sale_date = coalesce(sale_date, (date)::timestamptz, created_at)
     where sale_date is null;
  else
    update public.sales
       set sale_date = coalesce(sale_date, created_at)
     where sale_date is null;
  end if;
end $$;

-- 3) Backfill de total_price a partir de "total" legado (se existir)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='sales' and column_name='total'
  ) then
    update public.sales
       set total_price = coalesce(total_price, total)
     where total_price is null;
  end if;
end $$;

-- 4) Índices úteis
create index if not exists sales_sale_date_idx on public.sales (sale_date);
create index if not exists sales_user_date_idx on public.sales (user_id, sale_date);

-- Observação: mantenha as RLS já existentes; estas colunas seguem o mesmo escopo.

