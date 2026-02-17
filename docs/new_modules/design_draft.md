# **SYSTEM ARCHITECTURE DOCUMENTATION**

**Project Name:** ChatNation CRM

-----

## **1. HIGH-LEVEL OVERVIEW**

The system is a **multi-tenant "Smart Bot" platform** operating primarily on **WhatsApp**. Unlike traditional chatbot builders where logic is hard-coded in a visual flow, this system acts as a **centralized brain**.

The **WhatsApp Workflow Builder** acts strictly as a **Gateway**:

1.  It receives messages/media from users.
2.  It forwards them immediately to our **API**.
3.  It waits for a command from our API to send the response.

Our system uses **LangGraph (AI Agents)** to determine the user's intent—whether they are asking for an event ticket, answering a survey, or requesting a HypeCard—and routes them to the correct module.

-----

## **2. CORE ARCHITECTURE DIAGRAM**

This diagram illustrates how the "Smart Brain" processes every message asynchronously to ensure speed and intelligence.

```mermaid
graph TD
    %% EXTERNAL LAYERS
    User((WhatsApp User)) <-->|Messages| WABuilder[WABA Workflow Builder\n(Gateway)]
    
    %% INGRESS LAYER
    WABuilder --Webhook JSON--> API[FastAPI Gateway]
    API --Ack 200 OK--> WABuilder
    
    %% ASYNC PROCESSING LAYER
    API --Push Task--> Redis[(Redis Queue)]
    
    subgraph "THE CENTRAL BRAIN (Worker Containers)"
        Worker[Celery Worker / Python]
        
        %% AGENTIC LOGIC
        Router{LangGraph Router}
        Worker --> Router
        
        %% BRANCHES
        Router --"General Q&A"--> AgentRAG[RAG Agent]
        Router --"Events/Tickets"--> ModEOS[Module I: Events Engine]
        Router --"Survey Answer"--> ModUSI[Module II: Survey Engine]
        Router --"Daily Content"--> ModMPCE[Module III: Content Engine]
        Router --"Make Card"--> ModHype[HypeCard Engine]
    end
    
    %% DATA LAYER
    AgentRAG <-->|Fetch Vectors| PGVector[(Postgres + pgvector)]
    ModEOS <-->|Read/Write| Postgres[(PostgreSQL DB)]
    ModHype -->|Store Image| S3[DigitalOcean Spaces]
    
    %% OUTPUT
    Worker --API Call--> WABuilder
    WABuilder --Send Message--> User
```

-----

## **3. TECHNOLOGY STACK**

| Layer | Component | Technology Choice | Justification |
| :--- | :--- | :--- | :--- |
| **Backend API** | Gateway | **FastAPI (Python)** | High-concurrency handling of webhooks; native AI support. |
| **Admin UI** | Frontend | **Next.js (TypeScript)** | Type-safe, modern UI for complex builders (Surveys/Templates). |
| **Logic/AI** | Orchestrator | **LangGraph** | Manages stateful conversations and cyclic workflows (loops). |
| **Intelligence** | LLM | **GPT-4o-mini** | Low latency, high intelligence, cost-effective for volume. |
| **Workers** | Task Queue | **Celery + Redis** | Decouples instant webhook responses from heavy AI processing. |
| **Database** | Relational | **PostgreSQL 16** | Robust relational data for users, tickets, and transactions. |
| **Memory** | Vector Store | **`pgvector`** | Stores embeddings (Knowledge Base) inside the main DB. |
| **Image Engine** | Rendering | **Playwright (Python)** | Renders HTML/CSS templates into images (HypeCards). |
| **Infrastructure**| Hosting | **Coolify** | Docker-based PaaS on DigitalOcean (easy deployment). |

-----

## **4. THE "SMART BRAIN" LOGIC (LangGraph)**

The core differentiator of this system is how it handles state. We do not use "If/Then" trees. We use a **State Machine**.

### **The Routing Logic**

When a message arrives, the **Router** evaluates the user's `session_state` stored in Redis:

1.  **LOCKED STATE:** Is the user currently in a specific process?
      * *Example:* User is answering Question 3 of 5 in a Survey.
      * *Action:* Route directly to **Module II (Survey Engine)** to process the answer.
2.  **OPEN STATE:** If no active process, analyze the text intent.
      * *Input:* "I want a ticket for the tech expo."
      * *Action:* Route to **Module I (Event Engine)**.
3.  **COMMAND STATE:** Does the input match a specific command?
      * *Input:* Uploads a photo with caption "Hype me".
      * *Action:* Route to **HypeCard Engine**.

-----

## **5. MODULE SPECIFICATIONS**

### **MODULE I — Events & Exhibitor OS (EOS)**

  * **Role:** Manages Event Logic, Ticketing, and Exhibitor Booths.
  * **Key Components:**
      * **Ticketing Service:** Connects to **M-Pesa** wrapper. Generates QR codes via `qrcode` library.
      * **Booth Agent:** A sub-agent that knows booth locations.
          * *User:* "Where is Microsoft?"
          * *Agent:* Queries DB for "Microsoft" coordinates $\rightarrow$ Returns Map Image.

### **MODULE II — Universal Survey & Insight (USI)**

  * **Role:** Dynamic data collection via WhatsApp.
  * **Architecture:**
      * **Schema:** Uses JSONB in Postgres to store dynamic survey structures (questions, logic jumps).
      * **Multimedia Handler:**
          * *Audio:* Uses **OpenAI Whisper** to transcribe voice answers.
          * *Image:* Uses **GPT-4o Vision** to analyze uploaded photos (e.g., "Rate the cleanliness of this room").
      * **Report Gen:** Uses **Pandas** to crunch data and **WeasyPrint** to generate PDF reports sent back to the admin.

### **MODULE III — Content & Engagement (MPCE)**

  * **Role:** The "Radio Station" / "Church" scheduler.
  * **Architecture:**
      * **Scheduler:** **APScheduler** running inside the FastAPI container. It triggers "Broadcasts" at specific times.
      * **Engagement Router:** Handles "Live Polls." It aggregates incoming votes in **Redis** (for real-time speed) before flushing to Postgres.

### **MODULE IV — HypeCard Engine**

  * **Role:** Viral Image Generation.
  * **Workflow:**
    1.  User sends photo.
    2.  **`rembg`** removes the background.
    3.  **Playwright** loads an HTML template, injects the user's name/photo/QR.
    4.  System takes a screenshot.
    5.  Image uploaded to **S3/Spaces**.
    6.  URL sent to WhatsApp.

-----

## **6. DATA ARCHITECTURE**

We use a **Hybrid Schema** in PostgreSQL.

### **A. Relational Data (Structured)**

Standard tables for transactional integrity.

  * `users` (phone\_number, name, org\_id)
  * `organizations` (tenants)
  * `events`
  * `tickets`
  * `transactions` (payments)

### **B. JSONB Data (Flexible)**

For modules that require high flexibility.

  * `surveys` (stores the full question structure)
  * `responses` (stores the user answers)
  * `flow_state` (stores current user context for the AI)

### **C. Vector Data (Semantic)**

For the Knowledge Base (RAG).

  * `embeddings` table: Stores vectors of event FAQs, church announcements, or manuals.
  * *Query:* `SELECT * FROM embeddings ORDER BY embedding <-> query_vector LIMIT 1;`

-----

## **7. DEPLOYMENT STRUCTURE (Coolify)**

Your Coolify configuration will consist of **5 Containers** communicating on an internal Docker network:

1.  **Frontend:** `nextjs-admin` (Port 3000)
2.  **Backend:** `fastapi-core` (Port 8000)
3.  **Worker:** `python-worker` (No public port, talks to Redis)
      * *Note:* This container holds the heavy libraries (Playwright, Torch, etc).
4.  **Database:** `postgres-db` (Port 5432)
5.  **Cache:** `redis-cache` (Port 6379)

-----
