# Tech Estoque — Relatório Final (Projeto Integrador)

Autor: Gustavo Menezes  
Curso/Instituição: (preencher)  
Data: 2026-04-01  
Repositório: https://github.com/https-gustavo/controle-estoque  
Deploy (GitHub Pages): https://https-gustavo.github.io/controle-estoque/  

## 1. Apresentação

O Tech Estoque é um mini ERP web voltado para pequenos negócios, com foco em operação rápida no dia a dia: cadastro e gestão de produtos, entrada de estoque (compras), vendas com leitor de código de barras, histórico de movimentações e painel financeiro (receita, despesas, compras e lucro).

O sistema foi construído como Projeto Integrador, priorizando:

- Usabilidade em PC (teclado e leitor de código de barras)
- Fluxos completos de estoque e vendas
- Registro financeiro com auditoria e relatórios
- Segurança via RLS no Supabase
- Deploy online para validação com usuários reais

## 2. Objetivos

### 2.1 Objetivo geral

Desenvolver um sistema web para controle de estoque, vendas e financeiro, com persistência em nuvem e interface amigável para operação em loja.

### 2.2 Objetivos específicos

- Registrar produtos com código de barras e preços (custo/venda)
- Registrar entradas de estoque (compras) e ajustar quantidades
- Registrar vendas com carrinho, quantidade e desconto
- Exibir histórico de vendas e entradas
- Exibir dashboards com indicadores e gráficos financeiros
- Disponibilizar exportações (CSV) e impressão de auditoria/comprovantes
- Publicar versão online e coletar feedback

## 3. Escopo e Funcionalidades

### 3.1 Autenticação

- Login e cadastro com Supabase Auth
- Recuperação e redefinição de senha (com URLs compatíveis com GitHub Pages)

### 3.2 Produtos (Estoque)

- Cadastro e gerenciamento de produtos
- Busca por nome/código/código de barras
- Ordenação (nome, preço, estoque)
- Edição com fechamento automático ao salvar
- Indicador de “baixo estoque”

### 3.3 Entrada de estoque (Compras)

- Tela de entrada de estoque com busca e preenchimento rápido
- Lista de entradas antes de confirmar
- Registro de movimentações em `stock_movements` (tipo `entrada`)
- Atualização do custo do produto por média ponderada (quando aplicável) e atualização de estoque

### 3.4 Vendas

- Busca rápida e leitor de código de barras
- Carrinho com ajuste de quantidade (+/− e campo numérico)
- Desconto por valor (R$) e por percentual (%)
- Finalização com comprovante/impressão

### 3.5 Financeiro

- Despesas manuais (tabela `expenses`)
- Gráfico diário com:
  - Receita (vendas)
  - Despesas
  - Compras (entradas de estoque)
  - Lucro
- Indicadores (KPIs) para visão rápida

### 3.6 Histórico (Auditoria operacional)

- Histórico unificado com abas:
  - Vendas
  - Entradas
- Busca e filtros por período
- Impressão dos detalhes

### 3.7 Exportações e impressão

- Exportação CSV (vendas, top produtos, baixo estoque, despesas)
- Impressão de auditoria (resumo + tabelas)
- Impressão de comprovante de venda

## 4. Arquitetura e Tecnologias

### 4.1 Front-end

- React + Vite
- React Router
- CSS (arquivos em `src/styles`)

### 4.2 Back-end / Persistência

- Supabase (PostgreSQL + Auth + RLS)
- Tabelas principais:
  - `products`
  - `sales`
  - `expenses`
  - `stock_movements`

### 4.3 Deploy

- GitHub Pages (SPA)
- Workflow automatizado em `.github/workflows/pages.yml`
- `vite.config.js` configurado com `base: '/controle-estoque/'` para páginas do GitHub

## 5. Banco de Dados (Supabase)

### 5.1 Regras de segurança (RLS)

Todas as tabelas sensíveis usam RLS com políticas por `user_id = auth.uid()`, impedindo acesso entre usuários.

### 5.2 Observações sobre `stock_movements`

Para histórico de entradas e compras funcionar corretamente, a tabela `stock_movements` deve existir com colunas como `cost_unit` e `occurred_at`.

Migrações relevantes estão em:

- `supabase/migrations/2026-03-30-products-category-and-stock-movements.sql`
- `supabase/migrations/2026-03-30-finance-expenses-and-profit.sql`

## 6. Usabilidade e Acessibilidade

- Fluxo otimizado para teclado e operação rápida
- Leitor de código de barras integrado via eventos (scanner)
- Feedback visual com toasts e estados de carregamento
- Ajustes de UI/UX baseados em testes com usuários

## 7. Validação com usuários e feedback incorporado

Durante testes, foram coletadas sugestões e aplicadas melhorias, como:

- Ajuste mais claro de quantidade nas vendas (+/− e input)
- Correções de layout/scroll em modais (botões sempre visíveis)
- Histórico com entradas e vendas
- Ordenação na tela de produtos
- Fechamento automático do modal ao salvar edição
- Separação de compras no gráfico financeiro

## 8. Limitações conhecidas

- Responsividade mobile ainda pode exigir refinamentos adicionais em algumas telas e modais
- Métricas financeiras dependem de consistência de dados (custos, entradas, despesas)
- Ausência de suíte de testes automatizados no repositório (Vitest configurado, mas sem casos)

## 9. Trabalhos futuros (melhorias)

- Refinar versão mobile (layout, tabelas, modais, UX de carrinho)
- Ampliar relatórios: filtros por produto/categoria, exportações adicionais
- Evoluir auditoria: histórico unificado com “saídas” (vendas/devoluções/ajustes)
- Testes automatizados (Vitest) para fluxos críticos

## 10. Guia rápido de execução

### 10.1 Rodar localmente

1. Instalar dependências:
   - `npm install`
2. Criar `.env.local` (baseado em `.env.example`):
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
3. Rodar:
   - `npm run dev`

### 10.2 Publicar (GitHub Pages)

1. No GitHub, configurar variables/secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (publishable key)
2. Push na branch `main` (workflow gera o deploy automaticamente).

