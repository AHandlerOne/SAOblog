#!/bin/bash
# Initialize PostgreSQL extensions for SAO Blog
# This script runs automatically when the PostgreSQL container starts for the first time

set -e

echo "Initializing PostgreSQL extensions..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    -- Optional: Create a text search configuration for Chinese content
    -- (requires zhparser extension, which is not included in default PostgreSQL)
    -- Uncomment the following lines if zhparser is installed:
    -- CREATE EXTENSION IF NOT EXISTS zhparser;
    -- CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS chinese_zh (PARSER = zhparser);
    -- ALTER TEXT SEARCH CONFIGURATION chinese_zh ADD MAPPING FOR n,v,a,i,e,l WITH simple;

    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
EOSQL

echo "PostgreSQL extensions initialized successfully."
echo "Enabled extensions:"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "SELECT extname, extversion FROM pg_extension;"
