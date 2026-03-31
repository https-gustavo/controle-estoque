-- Adds category to products and creates stock_movements table for entradas/saidas

create extension if not exists pgcrypto;

alter table public.products add column if not exists category text;

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  type text not null check (type in ('entrada', 'saida')),
  quantity int not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_user_id_idx on public.stock_movements(user_id);
create index if not exists stock_movements_product_id_idx on public.stock_movements(product_id);
create index if not exists stock_movements_created_at_idx on public.stock_movements(created_at desc);

alter table public.stock_movements enable row level security;

drop policy if exists stock_movements_sel on public.stock_movements;
drop policy if exists stock_movements_ins on public.stock_movements;
drop policy if exists stock_movements_del on public.stock_movements;

create policy stock_movements_sel on public.stock_movements
  for select using (user_id = auth.uid());
create policy stock_movements_ins on public.stock_movements
  for insert with check (user_id = auth.uid());
create policy stock_movements_del on public.stock_movements
  for delete using (user_id = auth.uid());
