-- ================================
-- init.sql for Prisma schema
-- ================================

-- Create enum type if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
        CREATE TYPE "Role" AS ENUM ('admin', 'editor', 'viewer');
    END IF;
END$$;

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    "passwordHash" TEXT NOT NULL,
    role "Role" NOT NULL DEFAULT 'viewer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tokenHash" TEXT UNIQUE NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "revokedAt" TIMESTAMPTZ,
    "replacedBy" TEXT,
    CONSTRAINT fk_user FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE CASCADE
);

-- Trigger function to auto-update "updatedAt" column in users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updatedAt" = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach trigger to users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at'
    ) THEN
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON "users"
        FOR EACH ROW
        EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END$$;


-- Prisma Migration: add DataSource model
-- Adjust table/constraint names if you use snake_case mapping.

CREATE TABLE "DataSource" (
  "id" SERIAL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "url"  TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- uniq by type to allow upsert
CREATE UNIQUE INDEX "DataSource_type_key" ON "DataSource"("type");

-- trigger to update updatedAt (Postgres)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_on_datasource ON "DataSource";
CREATE TRIGGER set_updated_at_on_datasource
BEFORE UPDATE ON "DataSource"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();



-- Table for storing dashboards
CREATE TABLE IF NOT EXISTS "MetricsDashboard" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),  -- cuid equivalent
    name TEXT NOT NULL,
    panels JSON NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing panels
CREATE TABLE IF NOT EXISTS "MetricsPanel" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),  -- cuid equivalent
    "dashboardId" TEXT NOT NULL REFERENCES "MetricsDashboard"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    query TEXT NOT NULL,
    "chartType" TEXT NOT NULL,
    thresholds JSON,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);