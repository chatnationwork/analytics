# Architecture Overview

## 1. System Context
The Analytics Platform is a comprehensive system for tracking, processing, and visualizing data from various sources (Web, WhatsApp, AI Agents).

### Core Components
- **Collector**: High-throughput ingestion API (`/v1/capture`). Handles raw event stream.
- **Processor**: Async worker consuming Redis queue. Enriches events (GeoIP, UA) and syncs to DB.
- **Dashboard API**: NestJS backend for UI, Reporting, and Agent System.
- **Dashboard UI**: Next.js frontend for Analytics and Agent Inbox.
- **Database**: PostgreSQL (TimescaleDB ready) for events and relational data.

## 2. Agent System
Designed to enable human agents to intervene in automated conversations.
- **Inbox**: Real-time view of active sessions.
- **Routing**: Validates agent availability and assigns chats.
- **Sync**: `EventProcessor` performs dual-write (one to `events` for analytics, one to `messages` for inbox).

## 3. RBAC & Security
Split-level Role Based Access Control:
- **Global Roles** (Tenant Level): `SUPER_ADMIN`, `ADMIN`, `AUDITOR`, `MEMBER`.
- **Team Roles** (Team Level): `MANAGER`, `AGENT`.
- **Permissions**: Granular capability keys (e.g., `analytics.view`, `session.manage`).

## 4. WhatsApp Integration
- **Ingestion**: Supports WABA webhooks via Adapter (`/v1/webhooks/whatsapp`).
- **Analytics**: Tracks Sent/Delivered/Read/Replied funnel.
- **Inbox**: Two-way sync of messages for agent replies.
