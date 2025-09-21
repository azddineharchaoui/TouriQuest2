#!/bin/bash
# Database initialization script for AI service

set -e

# Create databases if they don't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create databases
    SELECT 'CREATE DATABASE touriquest_ai_dev'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'touriquest_ai_dev')\gexec

    SELECT 'CREATE DATABASE touriquest_ai_test'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'touriquest_ai_test')\gexec

    -- Create AI service user if not exists
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ai_service_user') THEN
            CREATE ROLE ai_service_user WITH LOGIN PASSWORD 'ai_service_password';
        END IF;
    END
    \$\$;

    -- Grant permissions
    GRANT ALL PRIVILEGES ON DATABASE touriquest_ai_dev TO ai_service_user;
    GRANT ALL PRIVILEGES ON DATABASE touriquest_ai_test TO ai_service_user;

    -- Connect to AI dev database and create extensions
    \c touriquest_ai_dev;
    
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Enable full text search
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    
    -- Enable vector similarity (if available)
    CREATE EXTENSION IF NOT EXISTS "vector" CASCADE;

    -- Connect to AI test database and create extensions
    \c touriquest_ai_test;
    
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    CREATE EXTENSION IF NOT EXISTS "vector" CASCADE;

EOSQL

echo "AI service databases initialized successfully!"