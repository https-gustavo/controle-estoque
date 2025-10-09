-- 1) Adicionar user_id em products e fazer backfill
alter table public.products add column if not exists user_id uuid;
update public.products set user_id = '5a9d9a1a-e39c-4f62-b850-f248d2443595' where user_id is null;

-- 2) Criar tabela sales
create table if not exists public.sales (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  product_id bigint not null,
  quantity numeric not null,
  total numeric not null,
  unit_price numeric not null,
  channel text,
  date timestamptz default now()
);

-- 3) Habilitar RLS e políticas por user_id (products)
alter table public.products enable row level security;
create policy "select own products" on public.products for select using (user_id = auth.uid());
create policy "insert own products" on public.products for insert with check (user_id = auth.uid());
create policy "update own products" on public.products for update using (user_id = auth.uid());
create policy "delete own products" on public.products for delete using (user_id = auth.uid());

-- 4) Habilitar RLS e políticas por user_id (sales)
alter table public.sales enable row level security;
create policy "select own sales" on public.sales for select using (user_id = auth.uid());
create policy "insert own sales" on public.sales for insert with check (user_id = auth.uid());
create policy "update own sales" on public.sales for update using (user_id = auth.uid());
create policy "delete own sales" on public.sales for delete using (user_id = auth.uid());

-- 5) Índices úteis
create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists products_user_name_idx on public.products(user_id, name);
create index if not exists sales_user_date_idx on public.sales(user_id, date);