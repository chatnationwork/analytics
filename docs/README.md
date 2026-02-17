# Analytics Platform Documentation

This documentation describes the **Analytics Platform** built for **Kra** (Kenya Revenue Authority). The platform is a single-client deployment that collects, processes, and visualises cross-channel user journeys (web, WhatsApp, agent-assisted) and powers the Kra analytics dashboard, agent inbox, and reporting.

---

## Documentation Map

| Section                                    | Description                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| [**Architecture & Deployment**](ARCHITECTURE_AND_DEPLOYMENT.md) | Single comprehensive document: system architecture, solutions architecture, database design, and deployment. |
| [**Architecture**](architecture/README.md) | System context, services (Collector, Processor, Dashboard API/UI), agent system, RBAC, WhatsApp integration. |
| [**Business**](business/)                  | Project description, Kra reports checklist, dashboard requirements, CRM overview, roadmap.                   |
| [**API**](api/README.md)                   | Event ingestion, dashboard API, handover webhook, CRM API, SDK design.                                       |
| [**Guides**](guides/README.md)             | Local setup, deployment, integration, tracking (web/WhatsApp/AI), CSAT, handover troubleshooting.            |
| [**Data**](data/)                          | Data model, DB schema, event schema.                                                                         |
| [**Features**](features/)                  | Agent assignment, session management, analytics trends.                                                      |
| [**Testing**](testing/)                    | Strategy, external app guide.                                                                                |

---

## Platform Overview

- **Purpose**: Cross-channel journey analytics and agent operations for Kra.
- **Deployment**: Built and deployed for Kra (single client); tenant model used for organisation structure and access control.
- **Capabilities**: Event ingestion (web + WhatsApp), funnels, user journeys, self-serve vs assisted analytics, CSAT, agent inbox, team management, configurable navigation labels, session management, CRM integrations, API keys, roles & permissions.

For architecture details see [Architecture Overview](architecture/README.md). For Kra-specific reporting and metrics see [KRA Reports Checklist](business/kra_reports_checklist.md).

### Recent additions (single-client / Kra focus)

- **Configurable navigation labels**: Sidebar menu labels can be customised per organisation under Settings → Navigation labels (stored in tenant settings).
- **CSAT analytics**: `csat_submitted` events collected and visualised (score distribution, recent feedback, trends). See [CSAT collection](guides/csat_collection.md).
- **Journey start/end flags**: Funnels and self-serve analytics can use `journeyStart` and `journeyEnd` properties for clearer funnel and completion metrics.
- **Agent availability**: Agents can mark themselves on/off in the inbox; team management shows status and session history in one place.
- **Session management**: Tenant-level session duration and inactivity timeout; optional revoke-all for security.
