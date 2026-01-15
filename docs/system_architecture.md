# Analytics Service - System Architecture

## Overview
The Analytics Service is a standalone, high-performance system designed to collect, process, store, and visualize user behavioral data from web applications. It is designed to be application-agnostic, meaning it can serve multiple different applications (tenants) simultaneously.

## High-Level Data Flow
1.  **Ingestion**: Client SDKs send events to the Collector API.
2.  **Queuing**: Events are pushed to a message queue (e.g., Kafka/RabbitMQ/Redis Stream) for asynchronous processing to ensure low latency for the client.
3.  **Processing**: Workers consume messages, validate schema, enrich data (GeoIP, User Agent parsing), and normalize format.
4.  **Storage**:
    *   **Hot Storage (Real-time)**: ClickHouse or similar columnar DB for fast analytical queries.
    *   **Cold Storage (Data Lake)**: S3/GCS bucket for long-term retention and backup (optional/later phase).
5.  **Querying**: An API layer that queries the storage backend to provide data for dashboards.
6.  **Visualization**: A frontend dashboard (embedded or standalone) to view the metrics.

## Component Architecture

### 1. Client SDK (The "Tracker")
*   **Responsibility**: Run on the client's browser/app, capture events, batch them, and flush to the Collector.
*   **Features**:
    *   Auto-capture (pageviews, clicks, form interactions).
    *   Session management (generating/persisting `session_id`).
    *   User identification (persisting `user_id` / `anonymous_id`).
    *   Offline caching (store events in `localStorage` if network fails).
    *   Batching (send X events or every Y seconds).

### 2. Collector Service (The Ingestion API)
*   **Responsibility**: Receive HTTP/POST requests from the SDK.
*   **Requirements**: High throughput, low latency.
*   **Technology**: Node.js / Go / Rust.
*   **Endpoints**:
    *   `POST /capture`: Endpoint to receive batch events.
    *   `GET /health`: Health check.

### 3. Message Queue (The Buffer)
*   **Responsibility**: Decouple ingestion from processing. Handle bursts of traffic.
*   **Technology**: Kafka, RabbitMQ, or Redis Streams (for MVP).

### 4. Processor Service (The Worker)
*   **Responsibility**: Dequeue messages, clean data, and insert into DB.
*   **Actions**:
    *   **Validation**: Ensure event has required fields.
    *   **Enrichment**: Convert IP to Location, User-Agent to Device/OS.
    *   **Sessionization**: Associate event with a session.
*   **Technology**: Python / Node.js / Go consumers.

### 5. Data Store (The Database)
*   **Responsibility**: Store massive amounts of event data efficiently for read-heavy analytical queries.
*   **Technology**: **ClickHouse** (Recommended for scale) or **PostgreSQL** (TimescaleDB) for MVP.
*   **Schema Strategy**: Flat, wide tables (Star Schema variant).

## Scalability Considerations
*   **Stateless Services**: Collector and Processor layers should be horizontally scalable behind a load balancer.
*   **Database Sharding**: As data grows, the columnar store can be sharded by time or tenant.
