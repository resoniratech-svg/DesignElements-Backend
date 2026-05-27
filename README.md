# Design Elements - ERP Backend Service

Welcome to the backend service of the Design Elements Enterprise Resource Planning (ERP) platform. This service handles core database interactions, security, reporting, PM2 deployments, client portals, and administrative operations.

---

## 🚀 Technology Stack

- **Runtime**: Node.js (v20+)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Query Driver**: Raw SQL Pools (`pg`) with selective Prisma schemas
- **Process Manager**: PM2
- **Auth**: JWT (JSON Web Tokens) with enhanced security filtering (e.g., Client blocking)

---

## 📁 Repository Structure

```
├── prisma/               # Database schemas & configurations
├── src/
│   ├── config/           # Database pools & environment setups
│   │   └── migrations/   # SQL Schema setups & seed scripts
│   ├── middleware/       # Authentication, guards, and role scoping
│   ├── modules/          # Domain-driven features
│   │   ├── accounts/     # Invoicing & ledger transactions
│   │   ├── auth/         # Session handling & Client compliance check
│   │   ├── clients/      # Client directory, agreements, & licenses
│   │   ├── leads/        # Lead generation & followup workflows
│   │   ├── expense/      # Allocations, receipts, and VAT metrics
│   │   └── PM/           # Project management metrics
│   ├── server.ts         # Server lifecycle initialization
│   └── app.ts            # Middleware orchestration
├── package.json          # Dependency definition
└── tsconfig.json         # TypeScript compiler instructions
```

---

## 🛠️ Key Architectural Implementations

1. **Client Account Enforcement Guard**: Block non-authorized portal access dynamically at authentication controllers.
2. **Dynamic Financial Metrics Engine**: Calculates total receivables, payables, and project balances based on verified payments rather than unconfirmed statuses.
3. **Robust Division & Sector Scoping**: Scopes records automatically based on user roles and contexts (`SUPER_ADMIN`, `PM`, `ACCOUNTS`, `CLIENT`).

---

## ⚙️ Development Setup

### 1. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
JWT_SECRET=your_jwt_secret_here
```

### 2. Dependency Installation
```bash
npm install
```

### 3. Startup Scripts
- **Development Mode**: Runs with `ts-node-dev` for automatic reload.
  ```bash
  npm run dev
  ```
- **Production Build**: Compiles TypeScript to `dist/`.
  ```bash
  npm run build
  ```
- **Production Start**: Starts the compiled server.
  ```bash
  npm run start
  ```

---

## 🌐 Production Deployment
The production deployment on VPS is managed via **PM2**.

```bash
# Compile latest typescript
npm run build

# Run database setup / migration check
node dist/config/migrations/full_setup.js

# Restart server daemon
pm2 restart design-elements-backend
```

---

*Developed and maintained securely.*
