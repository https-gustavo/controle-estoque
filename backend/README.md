# Backend - API do Estoque

## Requisitos
- Node 18+
- Variáveis de ambiente (ver `.env.example`)

## Instalação
```
cd backend
npm i
cp .env.example .env
```
Edite `.env` com:
- PORT (default 5773)
- CORS_ORIGIN (ex.: http://localhost:5173)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

## Rodar
```
npm run dev
```
API: http://localhost:5773  
Docs: http://localhost:5773/docs  
Health: http://localhost:5773/api/health

## Proxy sugerido no Vite
```
server: {
  proxy: { '/api': { target: 'http://localhost:5773', changeOrigin: true } }
}
```

## Endpoint de Produtos
Auth: `Authorization: Bearer <API_KEY>`

### Listar
```
GET /api/produtos?page=1&limit=20&search=nome&sort=name&order=asc
```
Respuesta:
```
{ "success": true, "data": [...], "meta": { "page":1,"limit":20,"total":0,"total_pages":1 } }
```

### Criar
```
POST /api/produtos
Content-Type: application/json
Authorization: Bearer <API_KEY>
{
  "name": "Teclado",
  "barcode": "123",
  "quantity": 10,
  "cost_price": 50,
  "sale_price": 80
}
```

## Exemplo curl
```
curl -H "Authorization: Bearer <API_KEY>" http://localhost:5773/api/produtos
```

## Testes
```
npm test
```
