# BankHub Backend API

Node.js + Express + TypeScript + PostgreSQL backend for the BankHub bank management system.

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express 4
- **Language**: TypeScript 5
- **ORM**: Prisma 5
- **Database**: PostgreSQL 16
- **Auth**: JWT (jsonwebtoken)
- **Password hashing**: bcryptjs

---

## Project Structure

```
src/
├── controllers/
│   ├── auth.controller.ts
│   ├── customers.controller.ts
│   ├── accounts.controller.ts
│   ├── transactions.controller.ts
│   └── dashboard.controller.ts
├── middleware/
│   ├── auth.ts          # JWT authentication
│   └── errorHandler.ts
├── lib/
│   ├── prisma.ts        # Prisma singleton
│   ├── jwt.ts           # Token helpers
│   └── response.ts      # Standardized API responses
├── routes/
│   └── index.ts         # All routes
└── index.ts             # Entry point
prisma/
├── schema.prisma        # Database models
└── seed.ts              # Demo data
```

---

## Quick Start

### Option A — Docker (Recommended)

```bash
# Start PostgreSQL + backend together
docker-compose up -d

# Run migrations and seed demo data
docker exec bank-backend npx prisma migrate deploy
docker exec bank-backend npm run db:seed
```

### Option B — Local Development

**1. Prerequisites**
- Node.js 20+
- PostgreSQL running locally
- pnpm or npm

**2. Install dependencies**
```bash
npm install
```

**3. Configure environment**
```bash
cp .env.example .env
# Edit .env — set your DATABASE_URL
```

**4. Run database migrations**
```bash
npx prisma migrate dev --name init
```

**5. Seed demo data**
```bash
npm run db:seed
```

**6. Start dev server**
```bash
npm run dev
```

Server runs on **http://localhost:3001**

---

## Demo Credentials

After seeding:
- **Email**: admin@bank.com
- **Password**: password123

---

## API Reference

All endpoints (except login) require `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → returns JWT token |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/change-password` | Change password |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Stats, charts data, recent transactions |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List (paginated, filterable) |
| GET | `/api/customers/:id` | Get one with accounts |
| POST | `/api/customers` | Create |
| PUT | `/api/customers/:id` | Update |
| DELETE | `/api/customers/:id` | Delete (only if no accounts) |

**Query params for list**: `page`, `limit`, `search`, `status`

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List (paginated, filterable) |
| GET | `/api/accounts/stats` | Aggregated stats |
| GET | `/api/accounts/:id` | Get one with recent transactions |
| POST | `/api/accounts` | Create (auto-generates account number) |
| PUT | `/api/accounts/:id` | Update status/branch |
| DELETE | `/api/accounts/:id` | Delete (only if balance = 0) |

**Query params for list**: `page`, `limit`, `search`, `status`, `type`, `branch`

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List (paginated, filterable) |
| GET | `/api/transactions/stats` | Monthly volume + totals |
| GET | `/api/transactions/:id` | Get one |
| POST | `/api/transactions/deposit` | Deposit to account |
| POST | `/api/transactions/withdraw` | Withdraw from account |
| POST | `/api/transactions/transfer` | Transfer between accounts |

**Query params for list**: `page`, `limit`, `type`, `status`, `accountId`, `dateFrom`, `dateTo`

---

## Response Format

All responses follow this shape:

```json
// Success
{ "success": true, "message": "...", "data": {...} }

// Paginated
{
  "success": true,
  "message": "...",
  "data": [...],
  "pagination": { "total": 50, "page": 1, "limit": 10, "totalPages": 5 }
}

// Error
{ "success": false, "message": "Error description", "errors": [...] }
```

---

## Connecting the Frontend

1. Copy `API_CLIENT.ts` → `client/src/lib/api.ts`

2. Add to `client/.env`:
   ```
   VITE_API_URL=http://localhost:3001/api
   ```

3. Use in pages:
   ```tsx
   import { customersApi } from "@/lib/api";

   // In a component
   const { data, pagination } = await customersApi.list({ page: 1, search: "john" });
   ```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | Secret for signing tokens (use a long random string in prod) |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment |
| `CORS_ORIGIN` | `http://localhost:5173` | Frontend URL for CORS |
