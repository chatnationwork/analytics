#!/bin/bash

# =============================================================================
# OPENSUSE LOCAL SETUP SCRIPT (Zypper & Snap Version)
# =============================================================================
# This script installs and configures PostgreSQL, Redis, Node.js environment,
# and project dependencies for local development on openSUSE.
# =============================================================================

set -e # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[SETUP]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Node.js Check
log "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js >= 20.0.0."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
if [[ $(echo -e "20.0.0\n$NODE_VERSION" | sort -V | head -n1) != "20.0.0" ]]; then
    error "Node.js version must be >= 20.0.0. Found: $NODE_VERSION"
    exit 1
fi
success "Node.js check passed: v$NODE_VERSION"

# 2. Redis Setup (Snap)
log "Checking Redis (Snap)..."
REDIS_CLI="/snap/redis/current/usr/bin/redis-cli"

if ! command -v snap &> /dev/null; then
    log "Snap not found. Installing snapd..."
    sudo zypper install -y snapd
    sudo systemctl enable --now snapd
fi

if sudo snap services redis 2>/dev/null | grep -q "active"; then
    log "Redis is already running via snap."
elif snap list redis 2>/dev/null | grep -q "redis"; then
    log "Redis snap is installed but not running. Starting..."
    sudo snap start redis
else
    log "Installing Redis via snap..."
    sudo snap install redis
    sudo snap start redis
fi

# Remove zypper-installed Redis to avoid port conflicts
if rpm -q redis &>/dev/null; then
    log "Removing zypper-installed Redis to avoid conflicts..."
    sudo zypper remove -y redis
    sudo rm -rf /etc/redis /var/lib/redis /var/log/redis &> /dev/null || true
fi
success "Redis is running via snap."

# 3. PostgreSQL Setup (Zypper)
log "Checking PostgreSQL Server..."
if ! command -v psql &>/dev/null; then
    log "Installing PostgreSQL Server..."
    sudo zypper install -y postgresql-server postgresql-contrib
    
    # Initialize the database cluster if not already done
    if [ ! -d "/var/lib/pgsql/data" ] || [ -z "$(ls -A /var/lib/pgsql/data 2>/dev/null)" ]; then
        log "Initializing PostgreSQL database cluster..."
        sudo -u postgres initdb -D /var/lib/pgsql/data --locale en_US.UTF-8 -E UTF8
    fi
    success "PostgreSQL installed."
else
    log "PostgreSQL is already installed."
fi

sudo systemctl enable --now postgresql.service

# Wait for PostgreSQL to be ready
log "Waiting for PostgreSQL to be ready..."
for i in {1..10}; do
    if sudo -u postgres pg_isready -q; then
        break
    fi
    sleep 1
done

# Fix pg_hba.conf to allow password auth from localhost
PG_HBA="/var/lib/pgsql/data/pg_hba.conf"
if sudo grep -q "ident" "$PG_HBA"; then
    log "Updating pg_hba.conf to use scram-sha-256 auth..."
    sudo sed -i 's/\bident\b/scram-sha-256/g' "$PG_HBA"
    sudo systemctl restart postgresql.service
    sleep 2
fi

# 4. Database Configuration
DB_USER="analytics"
DB_PASS="analytics_dev"
DB_NAME="analytics"

log "Configuring database..."
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null || echo "0")

if [ "$USER_EXISTS" = "1" ]; then
    log "User '$DB_USER' already exists. Updating password..."
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"
else
    log "Creating user '$DB_USER'..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
fi

DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "0")
if [ "$DB_EXISTS" = "1" ]; then
    log "Database '$DB_NAME' already exists."
else
    log "Creating database '$DB_NAME'..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
fi

# Grant permissions (required for NestJS/TypeORM to manage the public schema in PG 15+)
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;" &>/dev/null
success "Database configured."

# 5. Environment Variables (.env)
log "Configuring environment variables..."
if [ ! -f .env ]; then
    log "Creating .env from .env.example..."
    cp .env.example .env
fi

# Update .env with local values (using sed for precision)
update_env() {
    local key=$1
    local value=$2
    if grep -q "^${key}=" .env; then
        sed -i "s|^${key}=.*|${key}=${value}|" .env
    else
        echo "${key}=${value}" >> .env
    fi
}

update_env "NODE_ENV" "development"
update_env "DB_HOST" "127.0.0.1"
update_env "DB_PORT" "5432"
update_env "DB_USERNAME" "$DB_USER"
update_env "DB_PASSWORD" "$DB_PASS"
update_env "DB_DATABASE" "$DB_NAME"
update_env "REDIS_HOST" "127.0.0.1"
update_env "REDIS_PORT" "6379"
update_env "COLLECTOR_PORT" "3000"
update_env "DASHBOARD_API_PORT" "3001"
update_env "DASHBOARD_UI_PORT" "3002"
update_env "SERVER_API_URL" "http://localhost:3001"
update_env "NEXT_PUBLIC_API_URL" "http://localhost:3002"

success ".env file configured."

# 6. Dependency Installation
log "Installing project dependencies (this may take a while)..."
npm install --no-audit --no-fund
success "Dependencies installed."

# 7. Database Migrations
log "Running database migrations..."
npm run db:migrate || log "Warning: Database migrations failed. Check your Postgres logs."

# 8. Final Verification
log "Final verification..."
VERIFY_FAILED=0

# Verify Redis
if sudo $REDIS_CLI ping 2>/dev/null | grep -q "PONG"; then
    success "Redis: OK"
else
    error "Redis: FAILED"
    VERIFY_FAILED=1
fi

# Verify PostgreSQL
if PGPASSWORD=$DB_PASS psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &>/dev/null; then
    success "PostgreSQL: OK"
else
    error "PostgreSQL: FAILED"
    VERIFY_FAILED=1
fi

if [ $VERIFY_FAILED -eq 1 ]; then
    error "Setup complete with some verification failures."
else
    echo -e "\n${GREEN}======================================================${NC}"
    echo -e "${GREEN} SETUP COMPLETE! ${NC}"
    echo -e "${GREEN}======================================================${NC}"
    echo "You can now run the application:"
    echo "  npm run start:dev"
    echo ""
    echo "Dashboard UI:  http://localhost:3002"
    echo "Dashboard API: http://localhost:3001"
    echo "Collector API: http://localhost:3000"
fi