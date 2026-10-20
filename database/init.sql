-- SwordNex AI CRM: Database Initialization Script
-- Executed on database container first boot

-- Enable UUID extension for cryptographic IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pgvector for semantic CRM embeddings & AI search (if supported by PostgreSQL image)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'vector extension not available on standard image; skipping pgvector.';
END
$$;

-- Create application schema if needed
CREATE SCHEMA IF NOT EXISTS "public";

-- Optimize performance defaults
ALTER SYSTEM SET max_connections = '200';
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET random_page_cost = '1.1';
ALTER SYSTEM SET effective_cache_size = '768MB';

COMMENT ON DATABASE swordnex_crm IS 'SwordNex AI CRM - Multi-Tenant Transactional Data Store';
