# Production Environment Configuration

> **Deployment Requirement:** The application must be deployed to a server with a **public domain** for it to connect to the Messages CRM. Without a publicly accessible domain, the CRM integration (WhatsApp messaging) will not function.
>
> Example API domain: `shuruconnect.kra.go.ke`

## Environment Variables

```env
CRM_API_URL=https://waba.chatnation.co.ke
CRM_API_KEY=jvxlusJVNbSDCjYBx6nJf6LIXymEwC4MwGumMGAn4kdYSJeqCUzI2QHnSojSeMlSRLvob1fVU5ERVJTQ09SRQrZkhIpat2mhaACTuHREFTSAIXs9hg3oqliTIVlNxVWCjXmHwyNXsVU5ERVJTQ09SRQ1Y8

WHATSAPP_PHONE_NUMBER_ID=589622160904788
WHATSAPP_ACCESS_TOKEN=jvxlusJVNbSDCjYBx6nJf6LIXymEwC4MwGumMGAn4kdYSJeqCUzI2QHnSojSeMlSRLvob1fVU5ERVJTQ09SRQrZkhIpat2mhaACTuHREFTSAIXs9hg3oqliTIVlNxVWCjXmHwyNXsVU5ERVJTQ09SRQ1Y8

RESEND_API_KEY=re_dBLLmkLB_GBE4NbSTpEgnwLUixWcfV3T9

EMAIL_FROM="ShuruConnect <invites@chatnationbot.com>"

# This is the domain where the application will be deployed
FRONTEND_URL=https://shuruconnect.kra.go.ke
NEXT_PUBLIC_API_URL=https://shuruconnect.kra.go.ke

ADMIN_API_SECRET=W-bjvfrgeruijhvbcryg743trufygeu6WWWDCRTTY
```

## Infrastructure Variables

> **⚠️ Fill these in according to your environment.** The values below are examples — update ports, credentials, and hostnames to match your production setup.

```env
# Environment
NODE_ENV=production

# Processor Worker
PROCESSOR_WORKERS=1

# Dashboard API
COLLECTOR_PORT=3000
DASHBOARD_API_PORT=3001
DASHBOARD_UI_PORT=3002

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=analytics
DB_PASSWORD=<your-db-password>
DB_DATABASE=analytics
DB_SYNCHRONIZE=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```
