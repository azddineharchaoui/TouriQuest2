#!/bin/bash
set -e

# Create databases for different environments
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create development database
    SELECT 'CREATE DATABASE touriquest_dev'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'touriquest_dev')\gexec
    
    -- Create test database
    SELECT 'CREATE DATABASE touriquest_test'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'touriquest_test')\gexec
    
    -- Create staging database
    SELECT 'CREATE DATABASE touriquest_staging'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'touriquest_staging')\gexec
    
    -- Create production database
    SELECT 'CREATE DATABASE touriquest_prod'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'touriquest_prod')\gexec
    
    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE touriquest_dev TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE touriquest_test TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE touriquest_staging TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE touriquest_prod TO postgres;
EOSQL

# Connect to each database and enable extensions
for db in touriquest_dev touriquest_test touriquest_staging touriquest_prod; do
    echo "Setting up extensions for $db"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<-EOSQL
        -- Enable UUID extension
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- Enable PostGIS for geospatial data
        CREATE EXTENSION IF NOT EXISTS postgis;
        
        -- Enable full-text search
        CREATE EXTENSION IF NOT EXISTS pg_trgm;
        
        -- Enable unaccent for text search
        CREATE EXTENSION IF NOT EXISTS unaccent;
        
        -- Enable btree_gin for advanced indexing
        CREATE EXTENSION IF NOT EXISTS btree_gin;
        
        -- Enable pg_stat_statements for query analysis
        CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
EOSQL
done

echo "Database initialization completed successfully!"