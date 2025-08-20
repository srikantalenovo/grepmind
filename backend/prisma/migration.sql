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
