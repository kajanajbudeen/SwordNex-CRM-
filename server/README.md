# SwordNex AI CRM - Dedicated Backend Server Tier

The Backend Server Tier is a stateless REST API microservice built with Node.js, Express, TypeScript, and Prisma ORM.

---

## ⚙️ Decoupled Architecture

* **Framework**: Express + TypeScript
* **ORM**: Prisma ORM with PostgreSQL client
* **Security & Auth**: JWT authentication, argon2 password hashing, RBAC (`SUPER_ADMIN`, `ADMIN`, `USER`)
* **Multi-Tenancy**: Organization ID boundary isolation on all queries
* **AI Engine**: Modular multi-provider AI Gateway (OpenAI, Anthropic, Gemini, heuristic fallback)
* **API Version**: Mounted at `/api/v1`

---

## 🚀 Standalone Operations

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` points to your PostgreSQL instance and `CLIENT_URL` points to your frontend URL.

### 3. Generate Database Client & Seed
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Run Development Server
```bash
npm run dev
```
API runs at: `http://localhost:5000/api/v1`
Health check: `http://localhost:5000/api/v1/health`

### 5. Run Test Suite
```bash
npm test
```

### 6. Build & Run Production Bundle
```bash
npm run build
npm start
```
Runs compiled JavaScript from `dist/index.js`.
