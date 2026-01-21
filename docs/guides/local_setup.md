# Local Development Setup (Without Docker)

This guide explains how to set up the database and cache services directly on your Linux machine (Ubuntu/Debian/Pop!_OS) without using Docker.

## Automated Setup

We've provided a script to automate this process.

1. Make the script executable:
   ```bash
   chmod +x setup_local.sh
   ```

2. Run the script:
   ```bash
   ./setup_local.sh
   ```

This script will:
- Install `redis-server` and `postgresql` via apt.
- Start the services.
- Create the `analytics` database user and database.
- Verify connections.

---

## Manual Setup Steps

If you prefer to do it manually or the script fails, follow these steps:

### 1. Install Redis

```bash
sudo apt update
sudo apt install redis-server
```

**Start and Enable Redis:**
```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Verify:**
```bash
redis-cli ping
# Should output: PONG
```

### 2. Install PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib
```

**Start and Enable PostgreSQL:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Configure Database

Login as the default postgres user:
```bash
sudo -u postgres psql
```

Run the following SQL commands to create the user and database:

```sql
-- Create user with password
CREATE USER analytics WITH PASSWORD 'analytics_dev';

-- Create database owned by this user
CREATE DATABASE analytics OWNER analytics;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE analytics TO analytics;
```

**Type `\q` to exit psql.**

### 4. Configure Authentication (Important!)

By default, PostgreSQL often uses `peer` authentication (OS user matches DB user). We need password authentication.

1. Edit the config file:
   ```bash
   # Version number (12, 14, 15 etc.) depends on your install
   sudo nano /etc/postgresql/<version>/main/pg_hba.conf
   ```

2. Find the lines for IPv4 and IPv6 local connections:
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            scram-sha-256
   ```
   Make sure the method is `md5` or `scram-sha-256`, NOT `peer` or `ident`.

3. Restart PostgreSQL if you changed config:
   ```bash
   sudo systemctl restart postgresql
   ```

## Running the App

After setup, you can simply run:

```bash
npm run start:dev
```

The application will connect to `localhost:5432` and `localhost:6379` using the credentials in `.env` (or default config).
