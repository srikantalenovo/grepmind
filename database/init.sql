-- Create ENUM for role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
        CREATE TYPE role AS ENUM ('admin', 'editor', 'viewer');
    END IF;
END
$$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    "passwordHash" TEXT NOT NULL,
    role role DEFAULT 'viewer',
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tokenHash" TEXT UNIQUE NOT NULL,
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "revokedAt" TIMESTAMP,
    "replacedBy" TEXT
);

-- Insert default admin if not exists
DO $$
DECLARE
    hashed_password TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
        -- Default password is: Admin@123
        SELECT crypt('Admin@123', gen_salt('bf', 10)) INTO hashed_password;

        INSERT INTO users (email, name, "passwordHash", role)
        VALUES ('admin@gmail.com', 'Default Admin', hashed_password, 'admin');
    END IF;
END
$$;
