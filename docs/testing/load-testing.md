# Scalability Testing Guide

This document outlines how to run scalability tests for the Analytics Service using [k6](https://k6.io/).

## Prerequisites

You need to have `k6` installed locally.

### Installation

**Option 1: Use included binary (Linux)**
A standalone binary is available at `tests/load/k6`.
```bash
./tests/load/k6 version
```

**Option 2: System Installation**

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Fedora/CentOS:**
```bash
sudo dnf install https://dl.k6.io/rpm/repo.rpm
sudo dnf install k6
```

**macOS:**
```bash
brew install k6
```

**Windows:**
```bash
winget install k6
```

## Running Tests

1. Ensure the Analytics Collector service is running locally (usually on port 3000).
   ```bash
   npm run start:collector:dev
   ```

2. Run the load test script:
   - **Using included binary:**
     ```bash
     WRITE_KEY=your-write-key ./tests/load/k6 run tests/load/load-test.js
     ```
   - **Using system install:**
     ```bash
     WRITE_KEY=your-write-key k6 run tests/load/load-test.js
     ```

### Configuration

You can override the target URL and Write Key using environment variables:
```bash
BASE_URL=https://analytics.chatnationbot.com WRITE_KEY=your-write-key ./tests/load/k6 run tests/load/load-test.js
```

## Test Scenarios

The current test suite (`tests/load/load-test.js`) performs the following:
- **Warm Up**: Ramps up to 20 users over 30 seconds.
- **Load**: Increases to 100 users over 1 minute.
- **Cool Down**: Ramps down to 0 users over 30 seconds.

## Thresholds

The test will fail if:
- **Latency**: 95th percentile of request duration is > 100ms.
- **Errors**: Error rate is > 0.1%.
