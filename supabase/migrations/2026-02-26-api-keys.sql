-- Tabela e funções para chaves de API por usuário
create extension if not exists pgcrypto;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked boolean not null default false,
  expires_at timestamptz
);

create index if not exists api_keys_user_id_idx on public.api_keys(user_id);
create index if not exists api_keys_hash_idx on public.api_keys(key_hash);

alter table public.api_keys enable row level security;

drop policy if exists api_keys_sel on public.api_keys;
drop policy if exists api_keys_ins on public.api_keys;
drop policy if exists api_keys_upd on public.api_keys;
drop policy if exists api_keys_del on public.api_keys;

create policy api_keys_sel on public.api_keys for select using (user_id = auth.uid());
create policy api_keys_ins on public.api_keys for insert with check (user_id = auth.uid());
create policy api_keys_upd on public.api_keys for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy api_keys_del on public.api_keys for delete using (user_id = auth.uid());

-- Cria uma nova chave e retorna o plaintext uma única vez
drop function if exists public.api_create_key(p_name text, p_ttl_days int);
create or replace function public.api_create_key(p_name text, p_ttl_days int default 365)
returns table(api_key text, id uuid, name text, expires_at timestamptz)
language plpgsql
security definer
as $$
declare
  v_key text;
  v_hash text;
  v_id uuid;
  v_exp timestamptz;
begin
  v_key := encode(gen_random_bytes(24), 'hex');
  v_hash := encode(digest(v_key, 'sha256'), 'hex');
  v_exp := now() + make_interval(days => p_ttl_days);
  insert into public.api_keys (user_id, name, key_hash, expires_at)
  values (auth.uid(), p_name, v_hash, v_exp)
  returning api_keys.id into v_id;
  return query select v_key, v_id, p_name, v_exp;
end
$$;

-- Revoga uma chave do usuário
drop function if exists public.api_revoke_key(p_id uuid);
create or replace function public.api_revoke_key(p_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.api_keys set revoked = true where id = p_id and user_id = auth.uid();
end
$$;

-- Lista chaves (sem retornar hash)
drop function if exists public.api_list_keys();
create or replace function public.api_list_keys()
returns table(id uuid, name text, created_at timestamptz, last_used_at timestamptz, revoked boolean, expires_at timestamptz)
language sql
security definer
as $$
  select id, name, created_at, last_used_at, revoked, expires_at
  from public.api_keys
  where user_id = auth.uid()
  order by created_at desc;
$$;

-- Resolve user_id a partir da chave (usada pelas funções públicas de API)
drop function if exists public.api_resolve_user(p_api_key text);
create or replace function public.api_resolve_user(p_api_key text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_hash text;
  v_user uuid;
begin
  v_hash := encode(digest(p_api_key, 'sha256'), 'hex');
  select user_id into v_user
  from public.api_keys
  where key_hash = v_hash
    and revoked = false
    and (expires_at is null or expires_at > now())
  limit 1;
  if v_user is null then
    raise exception 'invalid api key' using errcode = '28000';
  end if;
  update public.api_keys set last_used_at = now() where key_hash = v_hash;
  return v_user;
end
$$;

-- Funções de API (retornam dados do usuário dono da chave)
drop function if exists public.api_products(p_api_key text);
create or replace function public.api_products(p_api_key text)
returns setof public.products
language sql
security definer
as $$
  select *
  from public.products
  where user_id = public.api_resolve_user(p_api_key);
$$;

drop function if exists public.api_sales(p_api_key text, p_from date, p_to date);
create or replace function public.api_sales(p_api_key text, p_from date, p_to date)
returns setof public.sales
language sql
security definer
as $$
  select *
  from public.sales
  where user_id = public.api_resolve_user(p_api_key)
    and "date"::date between p_from and p_to
  order by "date";
$$;

drop function if exists public.api_sales_summary(p_api_key text, p_from date, p_to date);
create or replace function public.api_sales_summary(p_api_key text, p_from date, p_to date)
returns table(total_revenue numeric, total_items numeric, orders bigint, avg_ticket numeric)
language sql
security definer
as $$
  with base as (
    select coalesce(sum(total),0) as total_revenue,
           coalesce(sum(quantity),0) as total_items,
           count(*) as orders
    from public.sales
    where user_id = public.api_resolve_user(p_api_key)
      and "date"::date between p_from and p_to
  )
  select total_revenue, total_items, orders,
         case when orders > 0 then total_revenue/orders else 0 end as avg_ticket
  from base;
$$;

drop function if exists public.api_sales_daily(p_api_key text, p_from date, p_to date);
create or replace function public.api_sales_daily(p_api_key text, p_from date, p_to date)
returns table(day date, total numeric, items numeric)
language sql
security definer
as $$
  select s."date"::date as day,
         coalesce(sum(s.total),0) as total,
         coalesce(sum(s.quantity),0) as items
  from public.sales s
  where s.user_id = public.api_resolve_user(p_api_key)
    and s."date"::date between p_from and p_to
  group by s."date"::date
  order by day;
$$;

drop function if exists public.api_product_performance(p_api_key text, p_from date, p_to date);
create or replace function public.api_product_performance(p_api_key text, p_from date, p_to date)
returns table(product_id integer, name text, barcode text, qty numeric, revenue numeric)
language sql
security definer
as $$
  select p.id, p.name, p.barcode,
         coalesce(sum(s.quantity),0) as qty,
         coalesce(sum(s.total),0) as revenue
  from public.products p
  left join public.sales s
    on s.product_id = p.id
   and s."date"::date between p_from and p_to
  where p.user_id = public.api_resolve_user(p_api_key)
  group by p.id, p.name, p.barcode
  order by revenue desc;
$$;

drop function if exists public.api_low_stock(p_api_key text, threshold integer);
create or replace function public.api_low_stock(p_api_key text, threshold integer default 5)
returns table(product_id integer, name text, barcode text, quantity numeric)
language sql
security definer
as $$
  select id, name, barcode, coalesce(quantity,0) as quantity
  from public.products
  where user_id = public.api_resolve_user(p_api_key)
    and coalesce(quantity,0) <= threshold
  order by quantity asc;
$$;
