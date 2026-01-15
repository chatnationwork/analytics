#!/bin/bash

# =============================================================================
# LOCAL DESKTOP SETUP SCRIPT (No Docker)
# =============================================================================
# This script installs and configures PostgreSQL and Redis locally on Ubuntu/Pop!_OS.
# 
# Usage: 
#   chmod +x setup_local.sh
#   ./setup_local.sh
# =============================================================================

set -e # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Update package lists
log "Updating package lists..."
sudo apt-get update

# 2. Install Redis
log "Installing Redis..."
if ! command -v redis-server &> /dev/null; then
    sudo apt-get install -y redis-server
    success "Redis installed."
else
    log "Redis is already installed."
fi

# 3. Configure and Start Redis
log "Starting Redis service..."
sudo systemctl enable redis-server
sudo systemctl start redis-server

if sudo systemctl is-active --quiet redis-server; then
    success "Redis is running."
else
    error "Failed to start Redis."
    exit 1
fi

# 4. Install PostgreSQL
log "Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    sudo apt-get install -y postgresql postgresql-contrib
    success "PostgreSQL installed."
else
    log "PostgreSQL is already installed."
fi

# 5. Start PostgreSQL
log "Starting PostgreSQL service..."
sudo systemctl enable postgresql
sudo systemctl start postgresql

if sudo systemctl is-active --quiet postgresql; then
    success "PostgreSQL is running."
else
    error "Failed to start PostgreSQL."
    exit 1
fi

# 6. Configure Database User and DB
DB_USER="analytics"
DB_PASS="analytics_dev"
DB_NAME="analytics"

log "Configuring Database..."

# Switch to postgres user to run commands
sudo -u postgres psql -c "SELECT 1" &> /dev/null || {
    error "Could not connect to PostgreSQL as 'postgres' user."
    exit 1
}

# Check if user exists
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")

if [ "$USER_EXISTS" = "1" ]; then
    log "User '$DB_USER' already exists. Updating password..."
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"
else
    log "Creating user '$DB_USER'..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
fi

# Check if database exists
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" = "1" ]; then
    log "Database '$DB_NAME' already exists."
else
    log "Creating database '$DB_NAME'..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
fi

# Grant privileges (just to be safe)
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" &> /dev/null
# Also need to grant usage on public schema for new tables in PG 15+
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" &> /dev/null

success "Database configured successfully!"
success "  - User: $DB_USER"
success "  - Pass: $DB_PASS"
success "  - DB:   $DB_NAME"

# 7. Final Check
log "Verifying connections..."

# Check Redis
if redis-cli ping | grep -q "PONG"; then
    success "Redis connection verify: OK"
else
    error "Redis connection verify: FAILED"
fi

# Check Postgres
if PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1" &> /dev/null; then
    success "PostgreSQL connection verify: OK"
else
    error "PostgreSQL connection verify: FAILED (You might need to adjust pg_hba.conf to allow password auth)"
    log "Hint: If it fails, check /etc/postgresql/<version>/main/pg_hba.conf and ensure 'md5' or 'scram-sha-256' is used instead of 'peer' for local connections."
fi

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN} SETUP COMPLETE! ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo "You can now run the application:"
echo "  npm run start:dev"
