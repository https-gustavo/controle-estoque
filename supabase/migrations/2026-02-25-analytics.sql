create or replace function public.sales_daily(p_from date, p_to date)
returns table(day date, total numeric, items numeric)
language sql
security definer
as $$
  select s."date"::date as day,
         coalesce(sum(s.total),0) as total,
         coalesce(sum(s.quantity),0) as items
  from public.sales s
  where s.user_id = auth.uid()
    and s."date"::date between p_from and p_to
  group by s."date"::date
  order by day;
$$;

create or replace function public.product_performance(p_from date, p_to date)
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
  where p.user_id = auth.uid()
  group by p.id, p.name, p.barcode
  order by revenue desc;
$$;

create or replace function public.low_stock(threshold integer default 5)
returns table(product_id integer, name text, barcode text, quantity numeric)
language sql
security definer
as $$
  select id, name, barcode, coalesce(quantity,0) as quantity
  from public.products
  where user_id = auth.uid()
    and coalesce(quantity,0) <= threshold
  order by quantity asc;
$$;

create or replace function public.sales_summary(p_from date, p_to date)
returns table(total_revenue numeric, total_items numeric, orders bigint, avg_ticket numeric)
language sql
security definer
as $$
  with base as (
    select coalesce(sum(s.total),0) as total_revenue,
           coalesce(sum(s.quantity),0) as total_items,
           count(*) as orders
    from public.sales s
    where s.user_id = auth.uid()
      and s."date"::date between p_from and p_to
  )
  select total_revenue,
         total_items,
         orders,
         case when orders > 0 then total_revenue / orders else 0 end as avg_ticket
  from base;
$$;
