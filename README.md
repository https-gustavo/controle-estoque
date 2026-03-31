# Sistema de Controle de Estoque

Um mini ERP (estoque + vendas + financeiro) desenvolvido com React + Vite e Supabase.

## Funcionalidades

- **Autenticação Segura**: Sistema completo de login, cadastro e recuperação de senha
- **Gerenciamento de Produtos**: Adicionar, editar, remover e controlar estoque de produtos
- **Sistema de Vendas**: Carrinho de vendas com busca inteligente e aplicação de descontos
- **Financeiro**: Despesas, custo dos produtos (COGS) e lucro líquido no dashboard
- **Dashboard Completo**: KPIs e gráfico comparativo (Receita x Despesas x Lucro)
- **Histórico Detalhado**: Visualização completa das transações com filtros avançados
- **Leitor de Código de Barras**: Suporte a scanners HID (USB/Bluetooth) para operação rápida (entrada e vendas)
- **Tema Escuro/Claro**: Interface adaptável às preferências do usuário
- **Configurações Personalizáveis**: Personalização da empresa com logo e informações
- **Modo Demonstração**: Acesso sem login para portfólio (dados locais no navegador)

## Tecnologias Utilizadas

- **Frontend**: React 18 + Vite
- **Backend**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Roteamento**: React Router DOM
- **Estilização**: CSS3 com design responsivo
- **Armazenamento**: Supabase Storage para uploads

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/https-gustavo/controle-estoque.git
cd controle-estoque
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env` na raiz do projeto com:
```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

4. Configure o banco de dados:
- Execute o script SQL em `supabase/create_tables.sql` no seu projeto Supabase (tabelas base).
- Para o módulo financeiro (despesas/lucro), aplique também:
  - `supabase/migrations/2026-03-30-finance-expenses-and-profit.sql`

5. Execute o projeto:
```bash
npm run dev
```

## Modo Demonstração

Na tela de login, clique em **Ver demonstração**.

- Não exige login
- Não grava nada no Supabase
- Salva alterações apenas no navegador (localStorage)
- Exibe um banner “Modo demonstração” no dashboard

## Como Usar

### Autenticação
- Acesse a aplicação e crie uma conta ou faça login
- Use a opção "Esqueci minha senha" se necessário
- Cada usuário tem seus dados isolados e seguros

### Gerenciamento de Produtos
- Adicione produtos com nome, preço de custo, preço de venda e quantidade
- Use a entrada em lote para cadastrar múltiplos produtos
- Edite informações diretamente na lista de produtos
- Monitore produtos com estoque baixo

### Sistema de Vendas
- Use a busca inteligente para encontrar produtos rapidamente
- Adicione produtos ao carrinho com quantidades personalizadas
- Aplique descontos percentuais ou valores fixos
- Finalize vendas com atualização automática do estoque

### Financeiro
- Cadastre despesas por período e acompanhe no dashboard
- Veja custo dos produtos vendidos (COGS) e lucro líquido no período
- Exporte CSV (vendas, top produtos, baixo estoque, despesas)

### Relatórios e Histórico
- Visualize estatísticas de vendas no dashboard
- Acesse histórico completo de vendas com filtros
- Exporte dados para análise externa
- Monitore performance de produtos

## Estrutura do Projeto

```
src/
├── components/
│   ├── Dashboard.jsx          # Componente principal
│   ├── Login.jsx              # Tela de login
│   ├── Signup.jsx             # Tela de cadastro
│   ├── ForgotPassword.jsx     # Recuperação de senha
│   ├── ResetPassword.jsx      # Redefinição de senha
│   └── SalesHistory.jsx       # Histórico de vendas
├── demo/                      # Modo demonstração (dados locais)
├── hooks/                     # Hooks (ex: scanner)
├── utils/                     # Utilitários (ex: datas BR)
├── styles/
│   ├── Dashboard.css          # Estilos do dashboard
│   ├── Login.css              # Estilos do login/auth
│   └── SalesHistory.css       # Estilos do histórico
├── App.jsx                    # Componente raiz
├── App.css                    # Estilos globais
├── main.jsx                   # Ponto de entrada
├── index.css                  # Estilos base
└── supabaseClient.js          # Configuração do Supabase
```

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera a build de produção
- `npm run preview` - Visualiza a build de produção
- `npm run api` - Sobe a API local (quando aplicável)
- `npm run dev:full` - Frontend + API (quando aplicável)

## Configuração do Supabase

### Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`
2. Preencha as variáveis com os dados do seu projeto Supabase:
   - `VITE_SUPABASE_URL`: URL do seu projeto
   - `VITE_SUPABASE_ANON_KEY`: Chave pública do projeto

### Tabelas Necessárias

Execute o script SQL em `supabase/create_tables.sql` no seu projeto Supabase para criar:

1. **products**: Armazena informações dos produtos
2. **sales**: Registra as vendas realizadas
3. **store_settings**: Configurações da empresa
4. **expenses**: Despesas (via migration financeira)

### Políticas de Segurança (RLS)

O sistema utiliza Row Level Security para garantir que cada usuário acesse apenas seus próprios dados.

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## Suporte

Para suporte ou dúvidas, abra uma issue no repositório do GitHub.
