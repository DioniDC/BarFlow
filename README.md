# 🍺 BarFlow

Sistema completo de gestão de bar com controle de produtos, mesas/comandas,
clientes, usuários e contas a receber. Backend em Node + Express + Prisma +
PostgreSQL, frontend em React + Vite + Tailwind, tudo orquestrado por Docker
Compose.

## Subir o sistema

Requisitos: Docker Desktop (ou Docker Engine) + Docker Compose.

```bash
cp .env.example .env   # ajuste JWT_SECRET / credenciais admin se quiser
docker compose up --build
```

- Frontend: http://localhost:5173
- API:      http://localhost:4000/api
- Postgres: localhost:5432 (user `bar`, senha `bar`, db `bardb`)

**Login inicial**: `admin` / `admin123` (definidos via env).

Na primeira subida o backend faz `prisma db push` (cria as tabelas) e roda o
seed (cria admin, 10 mesas e alguns produtos de exemplo).

## Estrutura

```
.
├── backend/                  # Node + Express + Prisma (teste)
│   ├── prisma/schema.prisma  # modelos
│   └── src/
│       ├── index.js
│       ├── seed.js
│       ├── middleware/auth.js
│       └── routes/
│           ├── auth.js
│           ├── users.js
│           ├── products.js
│           ├── customers.js
│           ├── tables.js
│           ├── orders.js
│           └── receivables.js
├── frontend/                 # React + Vite + Tailwind
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── context/AuthContext.jsx
│       ├── components/{Layout,Modal}.jsx
│       └── pages/{Login,Dashboard,Products,Customers,Users,Tables,TableDetail,Receivables}.jsx
└── docker-compose.yml
```

## Funcionalidades

### Produtos
- Código interno gerado automaticamente a partir de **1000**
- Vários códigos de barras por produto, cada um com **quantidade de baixa**
  (ex.: pack de 6 → código X dá baixa de 6 unidades de uma vez)
- Busca por nome, código interno ou de barras
- Controle de estoque com histórico de movimentações
- Inativação (mantém histórico)

### Mesas / Comandas
- Cadastro de **MESAS** e **COMANDAS** (mesmo modelo, tipo diferente)
- Vincula cliente cadastrado **ou** apenas nome livre no cabeçalho
- Adicionar itens por leitura de **código de barras** (qty puxada do barcode) ou
  busca por produto
- Cancelar item (devolve ao estoque)
- **Transferir mesa**: tudo para outra mesa OU apenas itens selecionados
- Fechar mesa com **vários pagamentos** (Dinheiro / Débito / Crédito / Pix /
  conta do cliente) e gerar **conta a receber** opcional
- Reabrir mesa fechada (gerente/admin)

### Clientes
- Cadastro completo (nome, doc, contato, endereço, obs)
- Visão de **saldo aberto** (somatório de receivables em aberto/parcial)
- Histórico de contas a receber

### Contas a Receber
- Geradas automaticamente ao fechar mesa "na conta do cliente"
- Lançamento avulso
- Recebimento parcial ou total
- Status: OPEN / PARTIAL / PAID / CANCELLED

### Usuários e Permissões
- Login com **JWT** (Bearer token, 12h)
- Funções (roles): `ADMIN`, `MANAGER`, `CASHIER`, `WAITER`
- Regras:
  - `ADMIN/MANAGER`: tudo (CRUD produtos, mesas, usuários)
  - `CASHIER`: opera caixa (contas a receber + receber pagamento)
  - `WAITER`: abrir mesa, lançar itens, transferir, fechar

## Preparado para app mobile

Toda lógica está em **API REST com JWT** — qualquer app (React Native, Flutter,
PWA) pode consumir os mesmos endpoints. Endpoints principais:

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | login → `{ token, user }` |
| GET  | `/api/auth/me` | usuário do token |
| GET  | `/api/tables?status=OCCUPIED` | listagem com filtros |
| GET  | `/api/tables/:id` | detalhe + itens + pagamentos + saldo |
| POST | `/api/tables/:id/open` | abrir mesa (cliente / obs) |
| POST | `/api/tables/:id/transfer` | transferir tudo |
| POST | `/api/tables/:id/transfer-items` | transferir itens específicos |
| POST | `/api/tables/:id/close` | fechar (pagamentos + receivable) |
| POST | `/api/orders/items` | lançar item (barcode ou productId) |
| DELETE | `/api/orders/items/:id` | cancelar item |
| GET / POST / PUT | `/api/products` | CRUD produtos |
| GET  | `/api/products/by-code/:code` | busca por código interno OU de barras |
| GET / POST / PUT | `/api/customers` | CRUD clientes |
| GET / POST | `/api/receivables` | listar / lançar conta |
| POST | `/api/receivables/:id/pay` | receber valor |
| GET / POST / PUT | `/api/users` | CRUD usuários (gerente/admin) |

Use `Authorization: Bearer <token>` em todas as rotas exceto `/auth/login` e
`/health`.

## Desenvolvimento local (sem Docker)

```bash
# backend
cd backend
cp .env.example .env  # ajustar DATABASE_URL para postgres local
npm install
npx prisma db push
npm run seed
npm run dev

# frontend
cd ../frontend
npm install
npm run dev
```

## Próximos passos (ideias)

- Migrations versionadas Prisma (`prisma migrate dev`)
- WebSockets para atualizar mesa em tempo real entre garçons
- Impressão de comanda / cupom não fiscal
- Relatórios (vendas por dia, garçom, produto)
- App mobile React Native consumindo a mesma API
