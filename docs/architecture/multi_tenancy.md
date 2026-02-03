# Multi-Tenancy & Authentication

> Complete guide to user authentication and the tenant model.

---

## Overview

The Analytics Platform is built for **Kra** and deployed as a single-client system. The tenant model is used for organisation structure: one primary tenant (Kra) with isolated data, CRM integrations, and API keys. Users belong to the tenant and have roles (e.g. super_admin, admin, member, auditor) governing access to analytics, settings, and agent features.

## Data Model

```
User
├── TenantMembership (role: owner | admin | member)
│   └── Tenant (Organization)
│       ├── Projects (analytics projects)
│       ├── CrmIntegrations (WhatsApp CRM connections)
│       └── ApiKeys (SDK write keys)
```

---

## Authentication

### Signup Flow

```http
POST /api/dashboard/auth/signup

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "organizationName": "Acme Corp",
  "organizationSlug": "acme-corp"  // optional
}
```

Creates:

1. New `User` with bcrypt-hashed password
2. New `Tenant` (organization)
3. `TenantMembership` with role `owner`
4. Returns JWT token for immediate login

### Login Flow

```http
POST /api/dashboard/auth/login

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

Returns:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "expiresIn": 604800,
  "user": { "id": "...", "email": "...", "name": "..." }
}
```

### Using the Token

Include in all authenticated requests:

```http
Authorization: Bearer <accessToken>
```

---

## Tenant Context

All authenticated endpoints operate within a tenant context. The tenant is resolved from:

1. User's primary tenant membership (first tenant they joined)
2. _(Future)_ X-Tenant-ID header if multiple tenants are used

### Endpoints

| Method | Endpoint                         | Description                                                                      |
| ------ | -------------------------------- | -------------------------------------------------------------------------------- |
| GET    | `/api/dashboard/tenants`         | List tenants the user belongs to (typically one for Kra)                         |
| GET    | `/api/dashboard/tenants/current` | Current tenant context (includes settings, e.g. nav labels)                      |
| PATCH  | `/api/dashboard/tenants/current` | Update tenant settings (merged with existing; supports navLabels, session, etc.) |

---

## CRM Integrations

Each tenant can configure multiple CRM connections (e.g., different WhatsApp Business accounts).

### Security

- API keys are **AES-256-GCM encrypted** before storage
- Keys are never returned in API responses
- `lastConnectedAt` tracks successful connections
- `lastError` stores connection failures

### Endpoints

| Method | Endpoint                                   | Description         |
| ------ | ------------------------------------------ | ------------------- |
| GET    | `/api/dashboard/crm-integrations`          | List integrations   |
| POST   | `/api/dashboard/crm-integrations`          | Add new integration |
| PATCH  | `/api/dashboard/crm-integrations/:id`      | Update integration  |
| DELETE | `/api/dashboard/crm-integrations/:id`      | Remove integration  |
| GET    | `/api/dashboard/crm-integrations/:id/test` | Test connection     |

### Create Integration

```http
POST /api/dashboard/crm-integrations
Authorization: Bearer <token>

{
  "name": "Production WhatsApp",
  "apiUrl": "https://crm.chatnation.co.ke",
  "apiKey": "your-crm-api-key"
}
```

---

## API Keys

Tenants generate their own SDK write keys for analytics collection.

### Security

- Keys are **SHA-256 hashed** - full key shown only once on creation
- `keyPrefix` stored for identification (e.g., `wk_abc123...`)
- Keys can be revoked without deletion

### Endpoints

| Method | Endpoint                      | Description             |
| ------ | ----------------------------- | ----------------------- |
| GET    | `/api/dashboard/api-keys`     | List keys (prefix only) |
| POST   | `/api/dashboard/api-keys`     | Generate new key        |
| DELETE | `/api/dashboard/api-keys/:id` | Revoke key              |

### Generate Key

```http
POST /api/dashboard/api-keys
Authorization: Bearer <token>

{
  "name": "Production SDK",
  "type": "write"
}
```

Response:

```json
{
  "id": "...",
  "name": "Production SDK",
  "key": "wk_abc123xyz...", // ONLY SHOWN ONCE!
  "keyPrefix": "wk_abc123",
  "type": "write",
  "createdAt": "2024-01-19T..."
}
```

---

## Database Entities

### User

| Column        | Type      | Description         |
| ------------- | --------- | ------------------- |
| id            | UUID      | Primary key         |
| email         | String    | Unique, indexed     |
| passwordHash  | String    | Bcrypt hash         |
| name          | String    | Display name        |
| emailVerified | Boolean   | Verification status |
| lastLoginAt   | Timestamp | Last login          |

### Tenant

| Column   | Type   | Description                                          |
| -------- | ------ | ---------------------------------------------------- |
| id       | UUID   | Primary key                                          |
| slug     | String | URL-friendly identifier                              |
| name     | String | Organization name                                    |
| plan     | Enum   | free, starter, pro, enterprise                       |
| settings | JSONB  | Tenant config (e.g. navLabels, session, white-label) |

### TenantMembership

| Column   | Type      | Description          |
| -------- | --------- | -------------------- |
| userId   | UUID      | FK to users          |
| tenantId | UUID      | FK to tenants        |
| role     | Enum      | owner, admin, member |
| joinedAt | Timestamp | Join date            |

### CrmIntegration

| Column          | Type    | Description           |
| --------------- | ------- | --------------------- |
| id              | UUID    | Primary key           |
| tenantId        | UUID    | FK to tenants         |
| name            | String  | Friendly name         |
| apiUrl          | String  | CRM base URL          |
| apiKeyEncrypted | String  | AES-256-GCM encrypted |
| isActive        | Boolean | Active status         |

### ApiKey

| Column    | Type    | Description    |
| --------- | ------- | -------------- |
| id        | UUID    | Primary key    |
| tenantId  | UUID    | FK to tenants  |
| name      | String  | Key name       |
| keyPrefix | String  | First 10 chars |
| keyHash   | String  | SHA-256 hash   |
| type      | Enum    | write, read    |
| isActive  | Boolean | Active status  |

---

## Environment Variables

```env
# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY=7d

# Encryption (64 hex chars = 32 bytes)
ENCRYPTION_KEY=your-64-char-hex-encryption-key

# Deployment Mode (Kra deployment uses single-tenant)
DEPLOYMENT_MODE=whitelabel
```

---

## Role Permissions

| Permission              | Member | Admin | Owner |
| ----------------------- | ------ | ----- | ----- |
| View analytics          | ✅     | ✅    | ✅    |
| Create funnels          | ✅     | ✅    | ✅    |
| Manage CRM integrations | ❌     | ✅    | ✅    |
| Manage API keys         | ❌     | ✅    | ✅    |
| Manage members          | ❌     | ✅    | ✅    |
| Update tenant settings  | ❌     | ✅    | ✅    |
| Delete tenant           | ❌     | ❌    | ✅    |
| Manage billing          | ❌     | ❌    | ✅    |
