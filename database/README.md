# SwordNex AI CRM - Dedicated Database Tier

The Database Tier is completely decoupled from both the Backend API Server and the Frontend Web Client.

---

## 🗄️ Database Architecture

* **Database Engine**: PostgreSQL 16
* **Default Database**: `swordnex_crm`
* **Port**: `5432`
* **Extensions Supported**:
  * `uuid-ossp` & `pgcrypto` (UUID generation and cryptographic hashing)
  * `vector` (pgvector for semantic AI retrieval and lead/deal embeddings)
* **Schema Definition**: Managed through Prisma ORM schemas (`server/prisma/schema.prisma`).

---

## 🚀 Standalone Operations

### 1. Launch Database Container
```bash
# From repository root
npm run db:up

# Or from within database directory
cd database
docker compose up -d
```

### 2. Stop Database Container
```bash
npm run db:down
```

### 3. Apply Schema & Run Migrations
```bash
npm run db:push
```

### 4. Seed Development & Demo Data
```bash
npm run db:seed
```

### 5. Launch Prisma Studio Database GUI
```bash
npm run db:studio
```
Prisma Studio will open at `http://localhost:5555` to browse and inspect all tables and relations visually.

---

## 🔒 Security & Multi-Tenancy Boundary

All CRM data in this database is partitioned by `organizationId`. Queries executed by the Backend REST API must supply the authenticated organization boundary to maintain strict tenant isolation.
