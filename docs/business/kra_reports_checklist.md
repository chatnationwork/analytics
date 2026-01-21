# KRA Analytics Reports - Metric Availability Checklist

> ✅ = Available (we control it)  
> 🔗 = Needs CRM/Agent webhook  
> ❌ = Needs architecture change

---

## Key Insight

**Self-serve journeys**: We control the flow, so we can track everything.  
**Assisted (agent) journeys**: We hand off control, so tracking depends on CRM integration.

---

## Report 1: Service Channel Performance

| Metric | Definition | Self-Serve | Assisted |
|:-------|:-----------|:----------:|:--------:|
| `service_type` | Self-Serve / Assisted | ✅ | ✅ |
| `started_chats` | Chats initiated | ✅ | ✅ |
| `resolved_chats` | Chats completed | ✅ | 🔗 |
| `dropped_chats` | Chats abandoned (30m inactivity) | ✅ | 🔗 |
| `resolution_rate_pct` | resolved / started | ✅ | 🔗 |
| `drop_off_rate_pct` | dropped / started | ✅ | 🔗 |
| `avg_first_response_sec` | Avg time to first response | ✅ | 🔗 |
| `avg_resolution_time_min` | Avg time to resolution | ✅ | 🔗 |
| `csat_avg` | Average CSAT | ✅ | 🔗 |
| `escalation_rate_pct` | Self-serve → Assisted | ✅ | N/A |

---

## Report 1B: Service-Level Performance

| Metric | Definition | Self-Serve | Assisted |
|:-------|:-----------|:----------:|:--------:|
| `service_name` | eTIMS / PIN / TCC | ✅ | 🔗 |
| `started_chats` | Chats initiated | ✅ | ✅ |
| `resolved_chats` | Chats completed | ✅ | 🔗 |
| `dropped_chats` | Chats abandoned | ✅ | 🔗 |
| `drop_off_rate_pct` | dropped / started | ✅ | 🔗 |
| `avg_first_response_sec` | Avg first response | ✅ | 🔗 |
| `avg_resolution_time_min` | Avg resolution time | ✅ | 🔗 |
| `csat_avg` | Average CSAT | ✅ | 🔗 |

---

## Traffic per Country

| Metric | Definition | Status |
|:-------|:-----------|:------:|
| `country` | Country of user | ✅ |
| `total_chats` | Chats initiated | ✅ |
| `resolved_chats` | Chats completed | ✅ (self-serve) / 🔗 (assisted) |
| `dropped_chats` | Chats abandoned | ✅ (30m timeout) |
| `drop_off_rate_pct` | dropped / total | ✅ |
| `avg_resolution_time_min` | Avg resolution time | ✅ (self-serve) / 🔗 (assisted) |
| `csat_avg` | Avg CSAT | ✅ |

---

## Report 2: CSAT & QA Investigation

| Metric | Definition | Self-Serve | Assisted |
|:-------|:-----------|:----------:|:--------:|
| `total_responses` | CSAT responses | ✅ | 🔗 |
| `csat_avg` | Average CSAT | ✅ | 🔗 |
| `response_rate_pct` | Response rate | ✅ | 🔗 |
| `chat_id` | Chat reference | ✅ | ✅ |
| `phone_number` | Taxpayer | ✅ | ✅ |
| `csat_score` | Score | ✅ | 🔗 |
| `feedback_text` | Comment | ✅ | 🔗 |
| `service_name` | Service | ✅ | 🔗 |
| `service_type` | Self-Serve / Assisted | ✅ | ✅ |
| `qa_status` | Open / Closed | ❌ | ❌ |

---

## Report 3: Conversation Lifecycle Monitor

| Metric | Definition | Self-Serve | Assisted |
|:-------|:-----------|:----------:|:--------:|
| `open_chats` | Being handled | ❌ | ❌ |
| `unattended_chats` | No response | ❌ | ❌ |
| `queued_chats` | Assigned, agent unavailable | N/A | ❌ |
| `resolved_chats` | Closed | ✅ | 🔗 |
| `dropped_chats` | Abandoned | ✅ | 🔗 |
| `avg_resolution_time_min` | Avg close time | ✅ | 🔗 |

---

## Report 4: Agent Availability & Workload

| Metric | Definition | Status |
|:-------|:-----------|:------:|
| `agent_name` | Agent | 🔗 |
| `agent_status` | Online / Busy / Offline / Leave | ❌ |
| `active_chats` | Current load | ❌ |
| `workload_state` | Normal / High / Overloaded | ❌ |

---

## Report 5: Agent Productivity & Responsiveness

| Metric | Definition | Status |
|:-------|:-----------|:------:|
| `agent_name` | Agent | 🔗 |
| `open_chats` | Open chats | ❌ |
| `unattended_chats` | Unattended | ❌ |
| `resolved_chats` | Resolved | 🔗 |
| `avg_first_response_sec` | Avg first response | 🔗 |
| `avg_resolution_time_min` | Avg resolution time | 🔗 |

---

## Report 6: Platform Traffic & Queue Trends

| Metric | Definition | Self-Serve | Assisted |
|:-------|:-----------|:----------:|:--------:|
| `assigned_chats` | Assigned | N/A | 🔗 |
| `queued_chats` | Queued | N/A | ❌ |
| `open_chats` | Open | ❌ | ❌ |
| `unattended_chats` | Unattended | ❌ | ❌ |
| `resolved_chats` | Resolved | ✅ | 🔗 |
| `dropped_chats` | Dropped | ✅ | 🔗 |

---

## Report 7: Dropped-Off Conversations

| Field | Description | Self-Serve | Assisted |
|:------|:------------|:----------:|:--------:|
| `chat_id` | Chat reference | ✅ | ✅ |
| `phone_number` | Taxpayer | ✅ | ✅ |
| `service_name` | eTIMS / PIN / TCC | ✅ | 🔗 |
| `service_type` | Self-Serve / Assisted | ✅ | ✅ |
| `drop_off_reason` | Classified reason | ✅ | 🔗 |
| `flow_step` | Step exited | ✅ | 🔗 |
| `qa_status` | Pending / Reviewed | ❌ | ❌ |

---

## Summary

| Channel | ✅ Available | 🔗 Needs CRM | ❌ Needs Arch |
|:--------|:------------:|:------------:|:-------------:|
| **Self-Serve** | ~80% | 0% | ~20% |
| **Assisted** | ~20% | ~60% | ~20% |

---

## What We Control (Self-Serve)

| Event | When to Fire | We Add It |
|:------|:-------------|:---------:|
| `journey.started` | User enters flow | ✅ |
| `journey.completed` | User finishes flow | ✅ |
| `journey.dropped` | 30m inactivity | ✅ |
| `agent.handoff` | Transfer to agent | ✅ |
| `csat.submitted` | User rates experience | ✅ |

---

## What CRM Must Send (Assisted)

| Event | When to Send |
|:------|:-------------|
| `chat.resolved` | Agent marks done |
| `chat.dropped` | Conversation abandoned |
| `message.sent` | Agent sends message |
| `csat.submitted` | User rates agent |
