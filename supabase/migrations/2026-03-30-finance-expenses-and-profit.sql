create extension if not exists pgcrypto;

alter table public.products add column if not exists margin numeric;

alter table public.sales add column if not exists cost_total numeric;
alter table public.sales add column if not exists profit numeric;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric not null check (amount >= 0),
  category text not null default 'Geral',
  date date not null default (now()::date),
  recurring boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_id_date_idx on public.expenses(user_id, date desc);
create index if not exists expenses_user_id_category_idx on public.expenses(user_id, category);

alter table public.expenses enable row level security;

drop policy if exists expenses_sel on public.expenses;
drop policy if exists expenses_ins on public.expenses;
drop policy if exists expenses_upd on public.expenses;
drop policy if exists expenses_del on public.expenses;

create policy expenses_sel on public.expenses for select using (user_id = auth.uid());
create policy expenses_ins on public.expenses for insert with check (user_id = auth.uid());
create policy expenses_upd on public.expenses for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy expenses_del on public.expenses for delete using (user_id = auth.uid());

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'stock_movements') then
    alter table public.stock_movements add column if not exists cost_unit numeric;
    alter table public.stock_movements add column if not exists occurred_at timestamptz;
    update public.stock_movements set occurred_at = coalesce(occurred_at, created_at) where occurred_at is null;
  end if;
end $$;
