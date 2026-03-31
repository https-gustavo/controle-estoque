-- Dashboard RPCs (public schema)
-- These functions are conservative and avoid referencing optional columns.
-- Adjust if your schema contains more detailed fact tables.

-- 1) Sales summary
create or replace function public.api_sales_summary(
  from_date date,
  to_date date,
  p_user_id uuid
)
returns table (
  revenue numeric,
  orders int,
  items int,
  avg_ticket numeric,
  products int,
  stock_value numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select
      coalesce(sum(total), 0) as revenue,
      count(*) as orders
    from sales
    where user_id = p_user_id
      and date >= from_date
      and date < (to_date + interval '1 day')
  ),
  p as (
    select
      count(*) as products,
      coalesce(sum(coalesce(cost_price,0) * coalesce(quantity,0)), 0) as stock_value
    from products
    where user_id = p_user_id
  )
  select
    s.revenue,
    s.orders,
    0::int as items, -- ajustável se existir uma coluna/items table
    case when s.orders > 0 then s.revenue / s.orders else 0 end as avg_ticket,
    p.products,
    p.stock_value
  from s, p;
$$;

comment on function public.api_sales_summary(date, date, uuid)
  is 'Resumo de vendas por período: receita, pedidos, ticket médio, total de produtos e valor em estoque';

-- 2) Sales daily series
create or replace function public.api_sales_daily(
  from_date date,
  to_date date,
  p_user_id uuid
)
returns table (
  day date,
  total numeric,
  items int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    date::date as day,
    coalesce(sum(total), 0) as total,
    0::int as items -- ajustável se houver contagem de itens por venda
  from sales
  where user_id = p_user_id
    and date >= from_date
    and date < (to_date + interval '1 day')
  group by date::date
  order by day asc;
$$;

comment on function public.api_sales_daily(date, date, uuid)
  is 'Série diária de vendas (receita por dia)';

-- 3) Product performance (top products)
create or replace function public.api_product_performance(
  from_date date,
  to_date date,
  p_user_id uuid
)
returns table (
  product_id bigint,
  name text,
  barcode text,
  qty int,
  revenue numeric,
  margin numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select
      s.product_id,
      count(*)::int as qty,
      coalesce(sum(s.total), 0) as revenue
    from sales s
    where s.user_id = p_user_id
      and s.date >= from_date
      and s.date < (to_date + interval '1 day')
      and s.product_id is not null
    group by s.product_id
  )
  select
    b.product_id,
    p.name,
    p.barcode,
    b.qty,
    b.revenue,
    null::numeric as margin
  from base b
  left join products p
    on p.id = b.product_id and p.user_id = p_user_id
  order by b.revenue desc, p.name asc nulls last;
$$;

comment on function public.api_product_performance(date, date, uuid)
  is 'Desempenho de produtos no período (receita e quantidade), baseado em sales.product_id';

-- 4) Low stock list
create or replace function public.api_low_stock(
  threshold int,
  p_user_id uuid
)
returns table (
  id bigint,
  name text,
  barcode text,
  quantity int
)
language sql
stable
security definer
set search_path = public
as $$
  select id, name, barcode, quantity
  from products
  where user_id = p_user_id
    and coalesce(quantity, 0) < threshold
  order by quantity asc, name asc
  limit 100;
$$;

comment on function public.api_low_stock(int, uuid)
  is 'Lista de produtos com estoque abaixo do limite informado';

-- Optional: revoke/ grant rely on RLS; functions run as definer.
-- Ensure RLS and policies are aligned with user_id scoping within the functions.

