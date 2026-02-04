# Assignment Engine – Inventory, Current Logic & Proposed Design

This document lists all components involved in session assignment, documents the current logic, and proposes a consolidated, pluggable engine so new rules are "socket plug" rather than patches.

---

## 1. Inventory: Files, Classes, Functions

### 1.1 Backend – Agent system

| File                                                            | Class / export                                                      | Role                                                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `AssignmentService`                                                 | Core assignment: strategies, queue assignment, handover request, schedule, no-agent fallback.                   |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `AssignmentStrategy` (type)                                         | Union: `round_robin`, `least_active`, `least_assigned`, `hybrid`, `load_balanced`, `manual`.                    |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `assignSession(session)`                                            | Dispatches to strategy (RR, least_active, least_assigned, hybrid, manual).                                      |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `getStrategyWithType(tenantId, teamId?)`                            | Resolves strategy + config: team.routingStrategy → assignment_configs (tenant).                                 |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `getAvailableAgents(tenantId, teamId?)`                             | Team members → filter online (agent_profiles) → filter by maxLoad.                                              |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `filterToOnlineAgents(agentIds)`                                    | Keeps only agents with `AgentStatus.ONLINE`.                                                                    |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `getAgentMetrics(agentIds, timeWindow?)`                            | activeCount (ASSIGNED), totalCount (assignedAt in window).                                                      |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `getAgentDetails(agentIds)`                                         | Names, createdAt for sorting (name / created_at).                                                               |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `assignRoundRobin(session)`                                         | Sort agents (name/created_at/random), pick next index from in-memory context.                                   |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `assignLeastActive(session)`                                        | Min activeCount → tie-break RR among candidates.                                                                |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `assignLeastAssigned(session)`                                      | Min totalCount (timeWindow from config) → tie-break RR.                                                         |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `assignHybrid(session, priorities)`                                 | Sort by priority list (least_active, least_assigned), RR among ties.                                            |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `pickRoundRobinFromCandidates(session, candidates)`                 | Shared RR selection over candidate list; updates context.                                                       |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `requestAssignment(sessionId, teamId?, context?)`                   | Handover entry: load session, schedule check, contact-already-assigned check, assignSession, no-agent fallback. |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `assignQueuedSessionsToAvailableAgents(tenantId, options?)`         | Get unassigned sessions, skip if contact has assigned session, then assignSession each (FIFO, limit).           |
| `apps/dashboard-api/src/agent-system/assignment.service.ts`     | `checkScheduleAvailability(teamId)`                                 | Team schedule (timezone, days, shifts) → isOpen, nextOpen, message.                                             |
| `apps/dashboard-api/src/agent-system/inbox.service.ts`          | `InboxService`                                                      | Session CRUD, message storage, contact-scoped rules.                                                            |
| `apps/dashboard-api/src/agent-system/inbox.service.ts`          | `getOrCreateSession(tenantId, contactId, …)`                        | Reuse existing ASSIGNED/UNASSIGNED for (tenantId, contactId); else create UNASSIGNED.                           |
| `apps/dashboard-api/src/agent-system/inbox.service.ts`          | `getUnassignedSessions(tenantId, teamId?)`                          | Sessions with status UNASSIGNED, optional team filter, order createdAt ASC.                                     |
| `apps/dashboard-api/src/agent-system/inbox.service.ts`          | `contactHasAssignedSession(tenantId, contactId, excludeSessionId?)` | True if contact has any ASSIGNED session (other than excludeSessionId).                                         |
| `apps/dashboard-api/src/agent-system/inbox.service.ts`          | `assignSession(sessionId, agentId)`                                 | Agent accept/takeover: set assignedAgentId, status ASSIGNED, transfer context.                                  |
| `apps/dashboard-api/src/agent-system/agent-inbox.controller.ts` | `AgentInboxController`                                              | HTTP: getUnassigned, assignQueue, getSession, sendMessage, accept, resolve, etc.                                |
| `apps/dashboard-api/src/agent-system/agent-inbox.controller.ts` | `getUnassigned()`                                                   | GET /agent/inbox/unassigned → InboxService.getUnassignedSessions.                                               |
| `apps/dashboard-api/src/agent-system/agent-inbox.controller.ts` | `assignQueue()`                                                     | POST /agent/inbox/assign-queue → AssignmentService.assignQueuedSessionsToAvailableAgents.                       |
| `apps/dashboard-api/src/agent-system/agent-inbox.controller.ts` | `assignSession()` (accept)                                          | POST accept → InboxService.assignSession(sessionId, agentId).                                                   |
| `apps/dashboard-api/src/agent-system/agent-inbox.controller.ts` | `transferSession()`                                                 | Agent transfer (reassign to another agent).                                                                     |
| `apps/dashboard-api/src/agent-system/integration.controller.ts` | `handover()`                                                        | POST /agent/integration/handover → getOrCreateSession → requestAssignment.                                      |
| `apps/dashboard-api/src/agent-system/presence.service.ts`       | `PresenceService`                                                   | goOnline → start agent session, set ONLINE → assignQueuedSessionsToAvailableAgents(tenantId).                   |
| `apps/dashboard-api/src/agent-system/inbox.service.ts`          | `sanitizeContactId(contactId)`                                      | Phone normalization (trim, strip leading/trailing '+'); used for session/contact matching.                      |
| `apps/dashboard-api/src/agent-system/inbox.service.ts`          | `getMessagesForContact(tenantId, contactId)`                        | Full chat history across all sessions for a contact; used when loading any session for that contact.            |

### 1.2 Database entities & config

| File                                                     | Entity / field           | Role                                                                                                                     |
| -------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `libs/database/src/entities/inbox-session.entity.ts`     | `InboxSessionEntity`     | id, tenantId, contactId, status (UNASSIGNED/ASSIGNED/RESOLVED), assignedAgentId, assignedTeamId, lastMessageAt, context. |
| `libs/database/src/entities/team.entity.ts`              | `TeamEntity`             | routingStrategy, routingConfig (maxLoad, sortBy, timeWindow, priority), schedule.                                        |
| `libs/database/src/entities/assignment-config.entity.ts` | `AssignmentConfigEntity` | tenantId, teamId (null = tenant default), strategy, settings (e.g. waterfall.noAgentAction, noAgentMessage).             |
| `libs/database/src/entities/agent-profile.entity.ts`     | `AgentProfileEntity`     | userId, status (ONLINE/OFFLINE/etc.).                                                                                    |
| `libs/database/src/entities/team-member.entity.ts`       | `TeamMemberEntity`       | teamId, userId, isActive.                                                                                                |

### 1.3 Frontend / API client

| File                                           | Function / type                   | Role                    |
| ---------------------------------------------- | --------------------------------- | ----------------------- |
| `packages/dashboard-ui/lib/api/agent/index.ts` | `agentApi.getUnassigned(teamId?)` | Fetch unassigned queue. |
| `packages/dashboard-ui/lib/api/agent/index.ts` | `agentApi.assignQueue(teamId?)`   | Trigger assign-queue.   |

### 1.4 Tests

| File                                             | Role                          |
| ------------------------------------------------ | ----------------------------- |
| `apps/dashboard-api/test/round-robin.spec.ts`    | Round-robin assignment tests. |
| `apps/dashboard-api/test/tenant-routing.spec.ts` | Tenant/team routing tests.    |

---

## 2. Current logic (order of evaluation)

Two entry points: **requestAssignment** (handover) and **assignQueuedSessionsToAvailableAgents** (queue + goOnline).

### 2.1 requestAssignment(sessionId, teamId?, context?)

1. Load session; update `assignedTeamId` and `context` if provided; save.
2. **Schedule (team)**  
   If teamId and team has schedule enabled:
   - If **closed** and next open &gt; 24h → send OOO message, record message, **return** (no assignment).
   - If closed but next open within 24h → **return** session (leave unassigned, queued).
   - If open → continue.
3. **Contact already has assigned session**  
   If `contactHasAssignedSession(tenantId, contactId, session.id)` → **return** session (skip assign).
4. **Strategy dispatch**  
   `assignSession(session)` → by strategy: round_robin, least_active, least_assigned, hybrid, or manual (return null).
5. **No-agent fallback**  
   If assignSession returned null: read `assignment_configs.settings.waterfall` → if `noAgentAction === 'reply'`, send `noAgentMessage` and record; **return** session.

### 2.2 assignQueuedSessionsToAvailableAgents(tenantId, options?)

1. Get unassigned sessions: `getUnassignedSessions(tenantId, teamId)`, FIFO (createdAt ASC), limit (e.g. 50).
2. For each session:
   - If `contactHasAssignedSession(tenantId, contactId, session.id)` → **skip**.
   - Else `assignSession(session)`; if non-null, increment assigned count.
3. No schedule check in this path (sessions are already in queue; schedule was applied at handover/time of creation if applicable).
4. No explicit no-agent fallback in loop (session stays unassigned).

### 2.3 assignSession(session) – strategy layer

1. **Strategy resolution**  
   `getStrategyWithType(tenantId, teamId)` → team.routingStrategy (or tenant assignment_config), default `round_robin`.
2. **Manual**  
   If strategy === `manual` → return null.
3. **Available agents**  
   `getAvailableAgents(tenantId, teamId)` → team (or default/first team) members → **online only** → **under maxLoad** (from team.routingConfig).
4. If no agents → return null.
5. **Strategy implementation**
   - **round_robin**: sort agents (config.sortBy: name | created_at | random), next index from RoundRobinContext[key], save session.
   - **least_active**: min activeCount → pickRoundRobinFromCandidates.
   - **least_assigned**: min totalCount (timeWindow from config) → pickRoundRobinFromCandidates.
   - **hybrid**: sort by config.priority (least_active, least_assigned), ties → pickRoundRobinFromCandidates.
   - **load_balanced**: alias for least_active.

### 2.4 Config sources

- **Strategy**: Team.routingStrategy (preferred) or AssignmentConfig (tenant, teamId null).
- **Strategy options**: Team.routingConfig (sortBy, timeWindow, priority, maxLoad).
- **No-agent behaviour**: AssignmentConfig.settings.waterfall (noAgentAction, noAgentMessage).
- **Schedule**: Team.schedule (timezone, days, shifts, outOfOfficeMessage).

---

## 3. Proposed design: Assignment Engine (pluggable rules)

Goal: one place that runs a **pipeline of rules** in a defined order. Each rule is a “socket”: it can **allow**, **skip**, **reject**, or **defer** (e.g. leave unassigned). New behaviour = new rule; no patching core flow.

### 3.1 Core concepts

- **AssignmentRequest**: Immutable input for one assignment attempt (session, tenantId, teamId, context, source: `handover` | `queue`).
- **AssignmentContext**: Mutable context for the pipeline (e.g. resolved strategy config, available agents, skip reason, selected agent).
- **Rule**: Async function `(request, context) => Promise<RuleResult>`.
- **RuleResult**:
  - `{ outcome: 'continue' }` – proceed to next rule.
  - `{ outcome: 'skip' }` – do not assign this session (e.g. contact already assigned).
  - `{ outcome: 'assign', agentId: string }` – assign to this agent and stop.
  - `{ outcome: 'stop' }` – stop pipeline without assigning (e.g. OOO, manual strategy).
  - `{ outcome: 'error', message: string }` – pipeline failed (e.g. DB error); caller may log/retry; do not assign.

### 3.2 Rule pipeline (order)

Run in sequence; first non-`continue` result ends the pipeline.

1. **ScheduleRule**  
   If request has teamId and team schedule enabled and currently closed:
   - If OOO (e.g. next open &gt; 24h): send OOO message → `stop`.
   - Else: `stop` (leave in queue).
2. **ContactAlreadyAssignedRule**  
   If contact has another ASSIGNED session → `skip`.
3. **StrategyRule**  
   Resolve strategy; if `manual` → `stop`. Else load into context (strategy + config).
4. **EligibilityRule**  
   Compute “available agents” (team, online, under maxLoad); if none → run **NoAgentRule** (reply or leave) → `stop`. Else store in context.
5. **SelectorRule**  
   Use context.strategy + context.agents to pick one agent (RR, least_active, least_assigned, hybrid).
   - If picked → `assign` with that agentId.
   - Else → same as no agents (NoAgentRule then `stop`).

### 3.3 Where the engine is used

- **requestAssignment**: Build request (source: handover), run pipeline. If result is `assign` → save session (assignedAgentId, status, assignedAt). If `skip`/`stop`/`error` → return session as-is.
- **assignQueuedSessionsToAvailableAgents**: For each unassigned session, build request (source: queue), run pipeline. If `assign` → save; if `skip` or `stop` → leave session unassigned; if `error` → log and leave unassigned.

### 3.4 Design decisions (from review)

- **Queue path and schedule**  
  The queue path will run the **same pipeline** as handover, including **ScheduleRule**. So when assigning from the queue, if the session has a team and that team is closed, ScheduleRule returns `stop` and the session is not assigned (no assignment on closed days). Session stays in queue until next run when team is open (or until handover-time schedule applies).

- **Queue path and no-agent fallback**  
  When source is `queue`, **NoAgentRule** will be applied: if no agents are available, run the same no-agent action (reply or leave) as in handover, so sessions are not left unassigned silently. Behaviour is configurable per tenant via `assignment_configs.settings.waterfall`.

- **Error handling**  
  Rules may return `{ outcome: 'error', message }`. The runner stops the pipeline, does not assign, and surfaces the outcome to the caller for logging/retry. No partial state change (e.g. do not save session with an agent if a later rule fails).

- **Round-robin context**  
  Current implementation uses in-memory `roundRobinContext`; server restart resets the index. For HA, the design allows the RR state to be provided by a **context provider** (e.g. Redis or DB) in a later phase; SelectorRule (or a small strategy helper) would read/write the next index via an abstraction so the pipeline signature stays the same.

- **Observability**  
  The pipeline runner will record **per-rule timing** (e.g. `assignment_engine.rule_duration{rule=<ruleName}`) and log outcome (assign/skip/stop/error) so we can add metrics/tracing without changing rule implementations.

### 3.5 Adding a new rule (example)

- **Skill-based rule**: After EligibilityRule, filter context.agents by “has skill X” from session context; if empty, `stop` or run NoAgentRule.  
  Implementation: new rule class/module, register in pipeline array. No change to ScheduleRule, ContactAlreadyAssignedRule, or SelectorRule.

### 3.6 File layout (proposed)

- `assignment-engine/` (or under `agent-system/`):
  - `assignment-engine.ts` – runs pipeline, defines rule order.
  - `types.ts` – AssignmentRequest, AssignmentContext, RuleResult.
  - `rules/schedule.rule.ts`
  - `rules/contact-already-assigned.rule.ts`
  - `rules/strategy.rule.ts`
  - `rules/eligibility.rule.ts`
  - `rules/no-agent.rule.ts`
  - `rules/selector.rule.ts` (delegates to strategy implementations)
- Strategy implementations can stay in a `strategies/` folder or remain in one module but called only from SelectorRule.
- **AssignmentService** becomes a thin orchestrator: getOrCreateSession / getUnassignedSessions / save assignment and events, and calls the engine.

### 3.7 Backward compatibility

- Keep same API: `requestAssignment(sessionId, teamId?, context?)`, `assignQueuedSessionsToAvailableAgents(tenantId, options?)`, `assignSession(session)` (used only from engine’s SelectorRule or for tests).
- Config: same tables and fields (Team.routingStrategy, routingConfig, schedule; AssignmentConfig.settings.waterfall). No DB migration required for the refactor.

---

## 4. Summary

- **Inventory**: All relevant files, classes, and functions are listed in §1 (including minor items: `sanitizeContactId`, `getMessagesForContact`, `transferSession`).
- **Current behaviour**: §2 describes the exact order of checks (schedule → contact-already-assigned → strategy → available agents → selector → no-agent fallback) for handover and queue.
- **Proposed engine**: §3 defines a single pipeline of rules with clear outcomes (`continue` / `skip` / `assign` / `stop` / `error`), so new behaviour is added as a new rule in a known position, without patching existing logic. Queue path uses the same pipeline (schedule + no-agent fallback).

---

## 5. Implementation phases

1. **Phase 1**: Create engine shell (`types.ts`, `assignment-engine.ts` pipeline runner with rule order and `RuleResult` handling).
2. **Phase 2**: Migrate rules from `AssignmentService` (schedule, contact-already-assigned, strategy, eligibility, no-agent, selector).
3. **Phase 3**: Unify queue path to use the same engine (source: `queue`); add per-rule timing / outcome logging.
4. **Phase 4**: Observability (e.g. `assignment_engine.rule_duration{rule}`); optional RR context provider (Redis/DB) for HA.

---

## 6. Observability

The pipeline runner logs at **debug** level in a parseable, key=value style so logs can be scraped for metrics or tracing.

### Log events

| Event             | Example                                                                   | Use                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Per-rule duration | `assignment_engine.rule_duration rule=scheduleRule durationMs=12`         | Rule latency; aggregate by `rule` for Prometheus (e.g. `assignment_engine_rule_duration_seconds{rule="scheduleRule"}`). |
| Final outcome     | `assignment_engine.outcome outcome=assign sessionId=<uuid>`               | Count assign/skip/stop/error; trace which session got which outcome.                                                    |
| Error detail      | `assignment_engine.outcome outcome=error sessionId=<uuid> message=<text>` | Alert on errors; debug failed assignments.                                                                              |

### Prometheus / OpenTelemetry

- **Rule duration**: Parse `assignment_engine.rule_duration`, extract `rule` and `durationMs`; expose as histogram or summary (e.g. `assignment_engine_rule_duration_seconds`).
- **Outcome**: Parse `assignment_engine.outcome`, extract `outcome` and optionally `sessionId`; expose as counter `assignment_engine_outcomes_total{outcome="assign|skip|stop|error"}`.
- **Tracing**: Use the same log lines as span events or log-based spans; `sessionId` links to the session being assigned.

No code change is required to add metrics: the runner already emits these lines; a log processor or Nest interceptor can convert them to metrics/traces.

---

## 7. Test coverage

### Existing

- `round-robin.spec.ts` – Strategy rotation.
- `tenant-routing.spec.ts` – Strategy resolution.

### To add

- [ ] `least_active`, `least_assigned`, `hybrid` strategies.
- [ ] Schedule rule (open / closed; OOO message path).
- [ ] ContactAlreadyAssigned rule.
- [ ] No-agent fallback (reply vs queue).
- [ ] Queue assignment integration (engine with source `queue`).
- [ ] RuleResult `error` (pipeline stops, no assign).

---

_Design updated to incorporate review feedback; see `assignment_engine_design_review.md` for the review._

---

## 8. Future improvements

### 8.1 Remove legacy path from requestAssignment

**Problem:** After the engine migration, `requestAssignment` still has legacy code (lines 726+) that duplicates schedule/contact-assigned/strategy logic. This is dead code when the engine runs correctly.

**Design:**

1. Remove the legacy path (schedule check, contact-already-assigned check, assignSession call) from `requestAssignment`
2. Keep only the engine call and outcome handling:
   ```typescript
   const result = await this.engine.run({ session, source: 'handover' });
   switch (result.outcome) {
     case 'assign':
       session.assignedAgentId = result.agentId;
       session.status = SessionStatus.ASSIGNED;
       session.assignedAt = new Date();
       await this.sessionRepo.save(session);
       return session;
     case 'skip':
     case 'stop':
       return session;
     case 'error':
       this.logger.warn(`Assignment engine error: ${result.message}`);
       return session;
   }
   ```
3. Remove now-unused private methods that were only called by legacy path (if any remain)

**Risk:** Low – engine has been tested; keep feature flag or A/B test if needed.

**Verification:** Run existing `assignment-engine.spec.ts` tests; manual handover test.

---

### 8.2 Redis RoundRobinContextProvider

**Problem:** `InMemoryRoundRobinContextProvider` resets on server restart and doesn't work in multi-instance deployments. Round-robin is not truly fair across restarts or load-balanced instances.

**Design:**

Create `RedisRoundRobinContextProvider` implementing `RoundRobinContextProvider`:

```typescript
// round-robin-context-redis.ts
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import type { RoundRobinContextProvider } from './round-robin-context';

@Injectable()
export class RedisRoundRobinContextProvider implements RoundRobinContextProvider {
  private readonly keyPrefix = 'assignment:rr:';
  
  constructor(private readonly redis: Redis) {}

  async getNextIndex(contextKey: string, candidateCount: number): Promise<number> {
    if (candidateCount <= 0) return 0;
    const key = `${this.keyPrefix}${contextKey}`;
    const n = await this.redis.incr(key);
    // Optional: set TTL to prevent stale keys (e.g. 7 days)
    await this.redis.expire(key, 604800);
    return (n - 1) % candidateCount;
  }
}
```

**Changes required:**

1. Create `round-robin-context-redis.ts` in `assignment-engine/`
2. Add `ioredis` dependency (if not already present)
3. Make `AssignmentService.rrContext` injectable:
   ```typescript
   constructor(
     @Inject('RoundRobinContextProvider')
     private readonly rrContext: RoundRobinContextProvider,
   )
   ```
4. Register provider in module:
   ```typescript
   {
     provide: 'RoundRobinContextProvider',
     useFactory: (redis: Redis) => 
       process.env.REDIS_URL 
         ? new RedisRoundRobinContextProvider(redis)
         : new InMemoryRoundRobinContextProvider(),
     inject: [Redis],
   }
   ```

**Verification:**
- Unit test: Mock Redis client, verify `INCR` is called
- Integration test: Restart server, verify RR index persists
- Manual test: Run 2 instances, verify assignments distribute evenly

