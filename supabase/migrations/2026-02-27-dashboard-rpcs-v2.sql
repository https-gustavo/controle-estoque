-- Reescreve RPCs do Dashboard para usar COALESCE entre colunas novas e legadas
-- Usa sale_date/total_price quando existirem; senão date/total; itens usa quantity ou 1.

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
      coalesce(sum(coalesce(total_price, total)), 0) as revenue,
      count(*) as orders,
      coalesce(sum(coalesce(quantity, 1)), 0) as items
    from sales
    where user_id = p_user_id
      and coalesce(sale_date::timestamptz, date::timestamptz, created_at) >= from_date
      and coalesce(sale_date::timestamptz, date::timestamptz, created_at) < (to_date + interval '1 day')
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
    s.items,
    case when s.orders > 0 then s.revenue / s.orders else 0 end as avg_ticket,
    p.products,
    p.stock_value
  from s, p;
$$;

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
    date_trunc('day', coalesce(sale_date::timestamptz, date::timestamptz, created_at))::date as day,
    coalesce(sum(coalesce(total_price, total)), 0) as total,
    coalesce(sum(coalesce(quantity, 1)), 0) as items
  from sales
  where user_id = p_user_id
    and coalesce(sale_date::timestamptz, date::timestamptz, created_at) >= from_date
    and coalesce(sale_date::timestamptz, date::timestamptz, created_at) < (to_date + interval '1 day')
  group by 1
  order by 1 asc;
$$;

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
      coalesce(sum(coalesce(s.quantity, 1)), count(*))::int as qty,
      coalesce(sum(coalesce(s.total_price, s.total)), 0) as revenue
    from sales s
    where s.user_id = p_user_id
      and coalesce(s.sale_date::timestamptz, s.date::timestamptz, s.created_at) >= from_date
      and coalesce(s.sale_date::timestamptz, s.date::timestamptz, s.created_at) < (to_date + interval '1 day')
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

