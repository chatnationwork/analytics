# Phase 5 Design: Legacy Cleanup & Redis Round-Robin

Design for Phase 5 of the assignment engine (remove legacy path, Redis `RoundRobinContextProvider`). Keeps the engine **reliable, safe, and scalable**.

**References:** [assignment_engine_design.md](./assignment_engine_design.md) §8, [assignment_engine_implementation_plan.md](./assignment_engine_implementation_plan.md) Phase 5.

---

## 1. Redis usage elsewhere

| Component         | Use                                                                                                                     | Keys / pattern                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **Collector**     | Publishes events to Redis Streams                                                                                       | `analytics:events` (stream)   |
| **Processor**     | Consumes events from Redis Streams                                                                                      | Same stream + consumer groups |
| **libs/queue**    | `QueueModule` – creates Redis client via `REDIS_CLIENT`; uses `redisConfig` (REDIS_HOST, REDIS_PORT) from `libs/common` | Streams only                  |
| **dashboard-api** | **None today**                                                                                                          | —                             |

**Implications:**

- Redis is **not** used by dashboard-api today. Collector and processor use the **same** Redis for event streams.
- We should **reuse the same Redis instance** (same host/port) for assignment round-robin so no new infrastructure is required.
- We must use a **distinct key namespace** so RR keys never clash with stream keys: e.g. `assignment:rr:{contextKey}`.
- We must **avoid** importing `QueueModule` into dashboard-api (it pulls EventProducer/EventConsumer). We only need a Redis client and the same config.

**Decision:** Add a **minimal Redis connection for dashboard-api** that uses existing `redisConfig` (REDIS_HOST, REDIS_PORT). Use key prefix `assignment:rr:` so keys are separate from `analytics:events`. Optional: later share a single “app Redis” module if we add more app-level Redis use (e.g. cache, rate limit).

---

## 2. Phase 5.1: Remove legacy path from requestAssignment

### 2.1 Current state

- `requestAssignment` **already** runs only the engine: load session → update teamId/context → save → `engine.run({ session, source: 'handover' })` → handle outcome (assign/skip/error/stop). There is **no** remaining duplicate block for schedule, contact-assigned, or `assignSession` in that method.
- `AssignmentService.assignSession(session)` (strategy dispatcher that picks agent and saves) is **no longer** used by `requestAssignment` or `assignQueuedSessionsToAvailableAgents`; it is only used by **unit tests** (round-robin.spec, tenant-routing.spec) and possibly elsewhere.

### 2.2 What “remove legacy path” means here

1. **Verify** that no dead “legacy” block remains in `requestAssignment` (already true).
2. **Decide** what to do with `assignSession(session)`:
   - **Option A (recommended):** Keep it as a **public** method for tests and for any future “assign this session now” callers; it is still the canonical strategy dispatch + save. No removal.
   - **Option B:** Remove it and change tests to go through the engine; then the only entry points are engine.run + persist. More consistent but larger test refactor.

**Recommendation:** Treat 5.1 as **verification only**: confirm requestAssignment is engine-only, add a short comment that the method is engine-driven, and leave `assignSession` in place for tests and API clarity. No code removal unless we explicitly choose Option B.

### 2.3 Safety

- No behaviour change if we only verify and comment.
- If we later remove `assignSession`, we must update round-robin.spec and tenant-routing.spec to use the engine (build request, run engine, assert outcome and session state).

---

## 3. Phase 5.2: Redis RoundRobinContextProvider

### 3.1 Goals

- **Scalable:** Multiple dashboard-api instances share the same RR counter so round-robin is fair across instances and restarts.
- **Safe:** Redis unavailability must not corrupt state; we prefer “degrade to in-memory or fail assignment” over wrong assigns.
- **Reliable:** Atomic counter (Redis INCR); key namespace and TTL to avoid unbounded growth.

### 3.2 Interface: async getNextIndex

Today `RoundRobinContextProvider.getNextIndex(contextKey, candidateCount): number` is **synchronous**. Redis INCR is **asynchronous**.

**Decision:** Change the interface to **async**:

```ts
getNextIndex(contextKey: string, candidateCount: number): Promise<number>;
```

- **InMemoryRoundRobinContextProvider:** `return Promise.resolve((this.state[contextKey] ?? 0) % candidateCount);` then increment (or keep sync impl and wrap in `Promise.resolve` for uniformity).
- **RedisRoundRobinContextProvider:** `await this.redis.incr(key)` then return `(n - 1) % candidateCount`.

**Call sites:** `pickNextRoundRobinId` becomes `async` and `await this.rrContext.getNextIndex(...)`. `pickRoundRobinFromCandidates` and `pickAgentForSession` already return Promises; they will `await pickNextRoundRobinId`. No change to engine or rules.

**Testing before interface change:** Consider running existing tests with a wrapper provider that does `getNextIndex(...): Promise<number> { return Promise.resolve(inMemory.getNextIndex(...)); }` so any sync assumptions in tests surface before switching the interface.

### 3.3 Key design

- **Key:** `assignment:rr:{contextKey}` where `contextKey = session.assignedTeamId || session.tenantId` (same as today). No collision with `analytics:events` or other stream keys.
- **TTL:** Set after first INCR, e.g. 7 days (`604800` seconds), so keys don’t grow forever. Refresh TTL (EXPIRE after each INCR) to keep active teams alive indefinitely while inactive ones expire.
- **Atomicity:** INCR is atomic; one logical “get next index” per key. No Lua needed.

### 3.4 Redis unavailability

- **Startup:** If we create a Redis client at app start and Redis is down, the app could fail to start. To keep dashboard-api runnable without Redis, we use a **factory** that:
  - Tries to create/connect Redis (or use a health check).
  - If Redis is unavailable or disabled (e.g. no REDIS_HOST), **fall back to InMemoryRoundRobinContextProvider** so single-instance and dev keep working.
- **Runtime:** If Redis is used but a call to INCR fails (network, timeout):
  - **Option A:** Catch, log, and **rethrow** so the assignment fails with outcome `error` and no assign. Safe, no partial state.
  - **Option B:** Catch, log, and **fall back to in-memory** for that request (e.g. inject a fallback provider and call it on Redis error). More resilient but RR is no longer shared across instances for that request.

**Recommendation:** Startup fallback (no Redis → in-memory). Runtime: Option A (fail assignment on Redis error) for Phase 5 to preserve data integrity; Option B or a circuit breaker can be added later if Redis becomes flaky.

### 3.5 Where to get the Redis client

- **Option A – Dashboard-api own Redis:** In dashboard-api, add a small `RedisModule` or inline provider that reads `redisConfig` (REDIS_HOST, REDIS_PORT), creates one `Redis` (ioredis) client, and provides it under a token e.g. `ASSIGNMENT_REDIS` or `REDIS_CLIENT`. Reuse same env as collector/processor so same Redis instance is used.
- **Option B – Reuse libs/queue:** Add something like `QueueModule.forRedisOnly()` in libs/queue that only registers and exports `REDIS_CLIENT`, no EventProducer/EventConsumer. Dashboard-api imports it and injects `REDIS_CLIENT`. Single place for Redis creation; dashboard-api depends on libs/queue.

**Recommendation:** **Option A** – dashboard-api owns one Redis connection for assignment (and future app features). Keeps queue lib strictly for event streams; dashboard-api does not depend on QueueModule. Same config schema (REDIS_HOST, REDIS_PORT) so ops stay simple.

### 3.6 Injection of RoundRobinContextProvider

- **Today:** `AssignmentService` constructs `new InMemoryRoundRobinContextProvider()` inside its constructor.
- **Target:** `AssignmentService` receives `RoundRobinContextProvider` via Nest DI (e.g. `@Inject(RoundRobinContextProvider)` or `@Inject('RoundRobinContextProvider')`).
- **Provider registration (e.g. in AgentSystemModule or a new AssignmentEngineModule):**
  - If Redis is configured and available: `useClass: RedisRoundRobinContextProvider` (and inject Redis).
  - Else: `useClass: InMemoryRoundRobinContextProvider`.
  - Use a **factory** that checks config (and optionally Redis connectivity) and returns the appropriate implementation. So we keep one provider token and swap implementation per environment.

### 3.7 File layout

- `assignment-engine/round-robin-context.ts` – keep interface + `InMemoryRoundRobinContextProvider`; change `getNextIndex` to return `Promise<number>`; InMemory can stay sync internally and return `Promise.resolve(...)`.
- `assignment-engine/round-robin-context-redis.ts` – **new**; `RedisRoundRobinContextProvider` implementing the interface, key prefix `assignment:rr:`, TTL after INCR, async getNextIndex.
- Redis client: either a new minimal provider in dashboard-api (e.g. in agent-system or a shared `RedisModule`) that uses `redisConfig` and provides a token for the Redis instance used by assignment.
- **No** change to engine or rules; only to the provider interface (async), its implementations, and how AssignmentService gets the provider.

### 3.8 Safety and reliability summary

- **Atomicity:** Redis INCR is atomic; no race between instances.
- **Keys:** Namespaced; TTL limits growth; no clash with streams.
- **Failure mode:** Redis down at runtime → assignment fails with error outcome → no assign, no partial save (engine behaviour unchanged).
- **Startup:** No Redis or Redis down → use in-memory so app still runs (single-instance / dev).
- **Scalability:** Multiple instances share the same counter; round-robin remains fair.

---

## 4. Implementation order

1. **5.1** – Verify requestAssignment is engine-only; add comment; (optional) document that `assignSession` remains for tests.
2. **5.2** – Async interface: change `getNextIndex` to `Promise<number>`; update InMemory and all call sites (pickNextRoundRobinId async, callers await).
3. **5.2** – Redis client: add minimal Redis provider in dashboard-api using existing redisConfig; provide token.
4. **5.2** – Implement `RedisRoundRobinContextProvider` (key prefix, INCR, TTL, async).
5. **5.2** – DI: register RoundRobinContextProvider in module with factory (Redis if available, else InMemory); inject into AssignmentService; remove `new InMemoryRoundRobinContextProvider()` from service.
6. **Tests** – Unit test for Redis provider (mock Redis, verify INCR and key/TTL). Existing assignment-engine.spec and round-robin/tenant-routing tests still pass (with in-memory or mocked provider).

---

## 5. Summary

| Item            | Decision                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Redis elsewhere | Collector/processor use Redis for streams; dashboard-api does not. Use same Redis (host/port) with key prefix `assignment:rr:`. |
| Legacy path 5.1 | Verify requestAssignment is engine-only; no removal unless we drop `assignSession` and refactor tests.                          |
| RR interface    | Async `getNextIndex(...): Promise<number>` for Redis.                                                                           |
| Redis client    | Dashboard-api own minimal Redis provider (same config as queue); no QueueModule in dashboard-api.                               |
| Redis failure   | Startup: fallback to in-memory. Runtime: fail assignment (error outcome).                                                       |
| Injection       | RoundRobinContextProvider provided by module factory (Redis or InMemory).                                                       |

This keeps the engine reliable (single pipeline, no legacy branch), safe (no partial state on Redis error), and scalable (shared RR counter across instances).
