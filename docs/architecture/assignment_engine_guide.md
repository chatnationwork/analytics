# Assignment Engine – Developer Guide

A comprehensive guide for understanding and extending the assignment engine.

---

## Overview

The Assignment Engine automatically routes incoming customer conversations to available agents based on configurable rules and strategies.

```
Customer Message → Bot Handover → Assignment Engine → Agent Inbox
                                        ↓
                              [Rules Pipeline]
                                        ↓
                              ScheduleRule
                              ContactAlreadyAssignedRule
                              StrategyRule
                              EligibilityRule
                              SelectorRule
                                        ↓
                              → Assign to Agent
                              → Skip (contact has session)
                              → Stop (closed, no agents, manual)
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           AssignmentService                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐          ┌─────────────────────────────────┐   │
│  │ requestAssignment() │          │ assignQueuedSessionsToAgents()  │   │
│  │   (bot handover)    │          │      (agent goes online)        │   │
│  └──────────┬──────────┘          └───────────────┬─────────────────┘   │
│             │                                     │                      │
│             │         ┌───────────────────┐       │                      │
│             └────────►│ AssignmentEngine  │◄──────┘                      │
│                       │     .run()        │                              │
│                       └─────────┬─────────┘                              │
│                                 │                                        │
│                    ┌────────────┴────────────┐                           │
│                    ▼                         ▼                           │
│            source: "handover"         source: "queue"                    │
│                    │                         │                           │
│                    └────────────┬────────────┘                           │
│                                 ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        RULE PIPELINE                                │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │  1. ScheduleRule        → stop if team closed                      │ │
│  │  2. ContactAlreadyAssignedRule → skip if has session               │ │
│  │  3. StrategyRule        → stop if manual; set context.strategy     │ │
│  │  4. EligibilityRule     → stop if no agents; set context.agents    │ │
│  │  5. SelectorRule        → assign agentId by strategy               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                 │                                        │
│                    ┌────────────┼────────────┐                           │
│                    ▼            ▼            ▼                           │
│                 assign       skip/stop     error                         │
│                    │            │            │                           │
│                    ▼            ▼            ▼                           │
│               Save to DB    Return       Log warning                     │
│                              session      Return session                 │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### RuleResult

Each rule returns one of 5 outcomes:

| Outcome | Meaning | Example |
|---------|---------|---------|
| `continue` | Proceed to next rule | Schedule is open |
| `skip` | Don't assign this session | Contact already has active session |
| `assign` | Assign to specific agent, stop pipeline | Agent selected by strategy |
| `stop` | Stop without assigning | Team closed, no agents, manual strategy |
| `error` | Pipeline failed | Database error |

### AssignmentRequest

```typescript
interface AssignmentRequest {
  session: InboxSessionEntity;  // Session to assign
  source: 'handover' | 'queue'; // Entry point
}
```

### AssignmentContext

Mutable context passed through the pipeline:

```typescript
interface AssignmentContext {
  strategy?: string;           // Set by StrategyRule
  config?: Record<string, unknown>; // Strategy config
  agents?: string[];           // Available agent IDs
  reason?: string;             // Skip/stop reason
}
```

---

## Rules Reference

### 1. ScheduleRule

**Purpose:** Enforce team business hours

**Logic:**
- If session has no team → `continue`
- If team schedule not enabled → `continue`
- If team is open → `continue`
- If team closed >24h → send OOO message → `stop`
- If team closed ≤24h → `stop` (queue for later)

### 2. ContactAlreadyAssignedRule

**Purpose:** Prevent duplicate assignments per contact

**Logic:**
- If contact has another ASSIGNED session → `skip`
- Else → `continue`

### 3. StrategyRule

**Purpose:** Resolve assignment strategy

**Logic:**
- Get strategy from team.routingStrategy or tenant config
- If strategy is `manual` → `stop`
- Else set `context.strategy` and `context.config` → `continue`

### 4. EligibilityRule

**Purpose:** Find available agents

**Logic:**
- Get team members (or tenant users with agent role)
- Filter to ONLINE only
- Filter by maxLoad (< current active count)
- If no agents → run NoAgent fallback → `stop`
- Else set `context.agents` → `continue`

### 5. SelectorRule

**Purpose:** Pick one agent by strategy

**Strategies:**

| Strategy | Selection Method |
|----------|------------------|
| `round_robin` | Rotate through sorted agent list |
| `least_active` | Agent with fewest active sessions |
| `least_assigned` | Agent with fewest total assignments (time window) |
| `hybrid` | Multi-criteria sort, then round-robin |

**Result:** `assign` with agentId, or `stop` if none selected

---

## File Structure

```
apps/dashboard-api/src/agent-system/
├── assignment.service.ts          # Main service, creates engine
└── assignment-engine/
    ├── index.ts                   # Exports
    ├── types.ts                   # TypeScript types
    ├── assignment-engine.ts       # Pipeline runner
    ├── round-robin-context.ts     # RR state provider
    └── rules/
        ├── index.ts               # Rule registration
        ├── schedule.rule.ts
        ├── contact-already-assigned.rule.ts
        ├── strategy.rule.ts
        ├── eligibility.rule.ts
        ├── no-agent.rule.ts
        └── selector.rule.ts
```

---

## Adding a New Rule

### Example: Skill-Based Routing

1. Create `rules/skill.rule.ts`:

```typescript
import type { AssignmentRequest, AssignmentContext, RuleResult, AssignmentEngineDeps } from '../types';

export async function skillRule(
  request: AssignmentRequest,
  context: AssignmentContext,
  deps: AssignmentEngineDeps,
): Promise<RuleResult> {
  const requiredSkill = request.session.context?.requiredSkill;
  if (!requiredSkill || !context.agents) {
    return { outcome: 'continue' };
  }

  // Filter agents by skill (assumes agentSkills map in deps)
  const agentSkills = deps.agentSkills as Map<string, string[]>;
  const qualified = context.agents.filter(id => 
    agentSkills.get(id)?.includes(requiredSkill)
  );

  if (qualified.length === 0) {
    return { outcome: 'stop' }; // No qualified agents
  }

  context.agents = qualified;
  return { outcome: 'continue' };
}
```

2. Register in `rules/index.ts`:

```typescript
import { skillRule } from './skill.rule';

export const ASSIGNMENT_ENGINE_RULES: AssignmentRule[] = [
  scheduleRule,
  contactAlreadyAssignedRule,
  strategyRule,
  eligibilityRule,
  skillRule,        // ← Add after eligibility
  selectorRule,
];
```

3. Add `agentSkills` to deps in `AssignmentService` constructor.

---

## Observability

### Logs

The engine emits structured debug logs:

```
assignment_engine.rule_duration rule=scheduleRule durationMs=5
assignment_engine.rule_duration rule=eligibilityRule durationMs=12
assignment_engine.outcome outcome=assign sessionId=abc-123
```

### Metrics (future)

Log lines can be parsed for Prometheus:

```
assignment_engine_rule_duration_seconds{rule="scheduleRule"} 0.005
assignment_engine_outcomes_total{outcome="assign"} 1
```

---

## Configuration

### Team Level

| Field | Purpose |
|-------|---------|
| `routingStrategy` | `round_robin`, `least_active`, `least_assigned`, `hybrid`, `manual` |
| `routingConfig.maxLoad` | Max active sessions per agent |
| `routingConfig.sortBy` | RR sort: `name`, `created_at`, `random` |
| `routingConfig.timeWindow` | For least_assigned: `today`, `week`, `all_time` |
| `schedule` | Business hours by day, timezone, OOO message |

### Tenant Level

| Field | Purpose |
|-------|---------|
| `assignment_configs.settings.waterfall.noAgentAction` | `queue` or `reply` |
| `assignment_configs.settings.waterfall.noAgentMessage` | Message when no agents |

---

## Testing

Run engine tests:

```bash
npm test -- assignment-engine.spec.ts
```

Key test file: `apps/dashboard-api/test/assignment-engine.spec.ts`

Covers:
- Pipeline with no rules → stop
- Each rule's outcomes
- Queue path with schedule
- Error handling
