API do Estoque

Autenticação
- Use a Publishable Key do Supabase no header Authorization: Bearer <key> e apikey: <key>.
- As políticas RLS limitam os dados ao usuário autenticado.

Endpoints (REST RPC)
- Resumo no período
  - POST /rest/v1/rpc/sales_summary
  - Body: { "p_from": "2026-02-01", "p_to": "2026-02-28" }
  - Retorna: total_revenue, total_items, orders, avg_ticket
- Receita diária
  - POST /rest/v1/rpc/sales_daily
  - Body: { "p_from": "2026-02-01", "p_to": "2026-02-28" }
  - Retorna: [ { day, total, items } ]
- Performance de produtos
  - POST /rest/v1/rpc/product_performance
  - Body: { "p_from": "2026-02-01", "p_to": "2026-02-28" }
  - Retorna: [ { product_id, name, barcode, qty, revenue } ]
- Estoque baixo
  - POST /rest/v1/rpc/low_stock
  - Body: { "threshold": 5 }
  - Retorna: [ { product_id, name, barcode, quantity } ]

Exemplo curl
curl -X POST "https://<project>.supabase.co/rest/v1/rpc/sales_summary" \
  -H "apikey: <PUBLISHABLE_KEY>" \
  -H "Authorization: Bearer <PUBLISHABLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{ "p_from": "2026-02-01", "p_to": "2026-02-28" }'
