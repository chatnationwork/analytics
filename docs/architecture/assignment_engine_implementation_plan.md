# Assignment Engine – Implementation Plan

Track progress for the assignment engine refactor. Update this file as each task is completed.

**Design:** [assignment_engine_design.md](./assignment_engine_design.md)

**Status legend:** `[ ]` Pending · `[~]` In progress · `[x]` Done

---

## Phase 1: Engine shell

| #   | Task                                                                                                                                                                             | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.1 | Create `agent-system/assignment-engine/types.ts`: `AssignmentRequest`, `AssignmentContext`, `RuleResult` (continue / skip / assign / stop / error)                               | [x]    |
| 1.2 | Create `agent-system/assignment-engine/assignment-engine.ts`: pipeline runner that runs rules in order, stops on first non-`continue` result, returns `RuleResult`               | [x]    |
| 1.3 | Export engine from `agent-system/index.ts`; engine instantiated inside `AssignmentService` (no separate provider), empty pipeline                                                | [x]    |
| 1.4 | Wire `AssignmentService.requestAssignment` to call engine with source `handover`; if outcome `assign`, save session; if `skip`/`error` return session; if `stop` use legacy path | [x]    |

---

## Phase 2: Migrate rules

| #   | Task                                                                                                                                                                                   | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2.1 | **ScheduleRule**: move schedule check + OOO message from `AssignmentService.requestAssignment` into `rules/schedule.rule.ts`; return `stop` when closed                                | [x]    |
| 2.2 | **ContactAlreadyAssignedRule**: use `InboxService.contactHasAssignedSession`; return `skip` when contact has another ASSIGNED session                                                  | [x]    |
| 2.3 | **StrategyRule**: resolve strategy + config (team/tenant); if `manual` return `stop`; else set `context.strategy` and `context.config`, return `continue`                              | [x]    |
| 2.4 | **EligibilityRule**: compute available agents (team, online, maxLoad); set `context.agents`; if empty call NoAgentRule then return `stop`; else `continue`                             | [x]    |
| 2.5 | **NoAgentRule**: read `assignment_configs.settings.waterfall`; if `noAgentAction === 'reply'`, send message + record; used by EligibilityRule and SelectorRule                         | [x]    |
| 2.6 | **SelectorRule**: use `context.strategy` + `context.agents` to pick one agent (RR, least_active, least_assigned, hybrid); return `assign` with `agentId` or run NoAgentRule and `stop` | [x]    |
| 2.7 | Register all rules in pipeline order in `assignment-engine.ts`; remove duplicated logic from `AssignmentService` so handover path is fully engine-driven                               | [x]    |

---

## Phase 3: Unify queue path

| #   | Task                                                                                                                                                                                     | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 3.1 | `assignQueuedSessionsToAvailableAgents`: for each unassigned session, build request with source `queue`, run engine; on `assign` save session; on `skip`/`stop`/`error` leave unassigned | [x]    |
| 3.2 | Add per-rule timing in pipeline runner (log or metric `assignment_engine.rule_duration{rule}`); log final outcome (assign/skip/stop/error)                                               | [x]    |
| 3.3 | Verify queue path: schedule rule runs (no assign when team closed), no-agent fallback runs when no agents                                                                                | [x]    |

---

## Phase 4: Observability and hardening

| #   | Task                                                                                                                    | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------ |
| 4.1 | Observability: expose rule duration (e.g. metric or structured log field); document for future Prometheus/OpenTelemetry | [x]    |
| 4.2 | (Optional) RR context provider: abstraction for round-robin index; in-memory impl first; stub for Redis/DB later        | [x]    |
| 4.3 | Ensure RuleResult `error` is handled in both entry points (log, no assign, no partial save)                             | [x]    |

---

## Tests

| #   | Task                                                                                                | Status |
| --- | --------------------------------------------------------------------------------------------------- | ------ |
| T1  | Engine shell: pipeline returns `stop` when no rules / no agent selected                             | [x]    |
| T2  | ScheduleRule: open → continue; closed → stop (and OOO message when >24h)                            | [x]    |
| T3  | ContactAlreadyAssignedRule: contact has assigned session → skip                                     | [x]    |
| T4  | StrategyRule: manual → stop; else continue with strategy in context                                 | [x]    |
| T5  | EligibilityRule + NoAgentRule: no agents → no-agent action (reply or leave)                         | [x]    |
| T6  | SelectorRule: round_robin, least_active, least_assigned, hybrid produce assign with correct agentId | [x]    |
| T7  | Queue path: engine called with source `queue`; schedule and no-agent apply                          | [x]    |
| T8  | Error outcome: rule returns error → pipeline stops, session not assigned                            | [x]    |

---

## Phase 5: Future improvements

**Design first:** [assignment_engine_phase5_design.md](./assignment_engine_phase5_design.md) – Redis usage elsewhere, legacy path verification, async RR interface, key/TTL, failure behaviour, and implementation order.

Aligned with [assignment_engine_design_review.md](./assignment_engine_design_review.md) and [assignment_engine_design.md](./assignment_engine_design.md) §8.

| #   | Task                                                                                                                                                                                                                                                                                                                                   | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 5.1 | **Remove legacy path from `requestAssignment`**: Verify handover is 100% engine-driven (no duplicate schedule/contact/assignSession/no-agent block); add comment. Keep `assignSession` for tests unless we refactor tests to use engine only.                                                                                          | [ ]    |
| 5.2 | **Redis `RoundRobinContextProvider`**: Make `getNextIndex` async; add `RedisRoundRobinContextProvider` (key `assignment:rr:{contextKey}`, INCR, TTL); minimal Redis provider in dashboard-api (same config as queue, no QueueModule); inject RR provider via factory (Redis if available else in-memory); unit test with mocked Redis. | [ ]    |

**Implementation order (from Phase 5 design):** 5.1 verify + comment → 5.2 async interface + InMemory → Redis client provider → RedisRoundRobinContextProvider → DI factory → tests.

---

## Progress summary

| Phase   | Done | Total |
| ------- | ---- | ----- |
| Phase 1 | 4    | 4     |
| Phase 2 | 7    | 7     |
| Phase 3 | 3    | 3     |
| Phase 4 | 3    | 3     |
| Tests   | 8    | 8     |
| Phase 5 | 0    | 2     |

_Last updated: Phase 5 design added (assignment_engine_phase5_design.md). Impl order: 5.1 verify, 5.2 async RR + Redis provider + DI._
