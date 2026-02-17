# Deployment Guide

This guide explains how to deploy the **Shuru Connect* service on any server using pre-built Docker images from the GitHub Container Registry.


## Steps

### 1. Setup Directory and Configuration

Create a folder for the application and download the necessary configuration files.

```bash
# Create directory
mkdir shuru_connect && cd shuru_connect

# Download docker-compose.yml
curl -O https://raw.githubusercontent.com/chatnationwork/analytics/main/docker-compose.yml

# Download environment template
curl -o .env https://raw.githubusercontent.com/chatnationwork/analytics/main/.env.example
```

### 2. Configure Environment

Edit the `.env` file to set your production secrets (database passwords, JWT secret, etc.).

```bash
nano .env
```


### 3. Deploy

Run the following commands to pull the latest images and start the application.

```bash
# Pull the latest images from GitHub (no login required)
docker-compose pull

# Start the services in the background
docker-compose up -d
```

### 4. Verify

Check if the containers are running:

```bash
docker-compose ps
```

You should see 6 services running: `postgres`, `redis`, `collector`, `processor`, `dashboard-api`, and `dashboard-ui`.

## Updating the Application

To update to the latest version in the future:

```bash
# 1. Stop current services
docker-compose down

# 2. Pull simplest updates
docker-compose pull

# 3. Start again
docker-compose up -d
```
