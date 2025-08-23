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
-- init.sql
CREATE TABLE IF NOT EXISTS "Dashboard" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Panel" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "promql" TEXT NOT NULL,
  "chartType" TEXT NOT NULL,
  "thresholds" JSONB NOT NULL DEFAULT '{}',
  "layout" JSONB NOT NULL DEFAULT '{}',
  "visualizationConfig" JSONB NOT NULL DEFAULT '{}',
  "dashboardId" INTEGER NOT NULL REFERENCES "Dashboard"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DataSource" (
  "id" SERIAL PRIMARY KEY,
  "type" TEXT UNIQUE NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Upsert default DataSource row for Prometheus (empty URL by default)
INSERT INTO "DataSource" ("type","url")
VALUES ('prometheus','')
ON CONFLICT ("type") DO NOTHING;
