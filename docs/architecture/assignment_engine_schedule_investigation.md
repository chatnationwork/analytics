# Assignment Engine – Schedule Not Respected (Investigation)

**Issue:** Chats are being assigned past the time allocated for a shift (schedule set in Team Management is not being respected).

**Conclusion:** The most likely cause is **timezone handling** (wrong, missing, or invalid timezone). A close second is **schedule not enabled** or **session.assignedTeamId** missing so the schedule rule skips the check. This doc summarizes how schedule checking works and what to verify.

---

## 1. How schedule checking works

1. **Pipeline order:** The engine runs rules in order. **ScheduleRule runs first** (`rules/index.ts`). If it returns `stop`, no assignment happens; if `continue`, the rest of the pipeline runs.

2. **ScheduleRule** (`rules/schedule.rule.ts`):
   - If `session.assignedTeamId` is **null**, it returns `continue` **without checking** the team schedule. So if the session has no team, schedule is skipped.
   - Otherwise it calls `deps.checkScheduleAvailability(teamId)` (implemented in `AssignmentService.checkScheduleAvailability`).

3. **checkScheduleAvailability** (`assignment.service.ts`):
   - If team has no `schedule` or `schedule.enabled !== true`, it returns **`isOpen: true`** (default open).
   - It uses the team’s **schedule.timezone** (IANA, e.g. `"Africa/Nairobi"`) to get “now” in that zone via `Intl.DateTimeFormat("en-US", { timeZone: timezone })` and `formatToParts()` to read weekday, hour, minute.
   - It compares that “current” time to **schedule.days[current.day]** shifts (e.g. `days["monday"]` = `[{ start: "09:00", end: "17:00" }]`).
   - **Open** only if `current.mins >= startMins && current.mins < endMins` for some shift (times in minutes-from-midnight in the **team’s** timezone).

So shift times are **always interpreted in the team’s configured timezone**. The server’s own timezone does not matter.

---

## 2. Likely causes of “assignments past shift end”

### 2.1 Timezone wrong or invalid (most likely)

- If **timezone** is missing, empty, or invalid, `Intl` may fall back to UTC or throw. If it falls back to UTC, “now” is effectively **server/UTC time**, not the team’s local time.
- **Effect:** For a team in e.g. Nairobi (UTC+3) with shift 09:00–17:00 local:
  - Correct: “now” in Nairobi → e.g. 18:00 local → closed.
  - Bug: “now” in UTC → e.g. 15:00 UTC → interpreted as 15:00 “local” → still open, so assignments continue past 17:00 local.

**What to check:**

- In **Team Management → [Team] → Schedule & Routing**, confirm:
  - **Timezone** is a valid IANA value (e.g. `Africa/Nairobi`, `America/New_York`), not empty and not a raw offset like `"UTC+3"` (which may not behave as intended everywhere).
- In the database, inspect `teams.schedule` for that team: ensure `timezone` is set and matches what you expect.

### 2.2 Schedule not enabled

- If **schedule.enabled** is false (or schedule is null), the code returns **isOpen: true** and the team is always treated as open.

**What to check:** In Team Management, ensure “Enable schedule” (or equivalent) is **on** for the team.

### 2.3 Session has no team (schedule rule skipped)

- If `session.assignedTeamId` is null, ScheduleRule returns `continue` and **does not run** the schedule check. That can happen if handover did not pass a team and the “effective team” resolution failed (e.g. no default team, or bug in that path).

**What to check:** Ensure handover sends a `teamId` when possible, and that the tenant has a default team (or at least one team with members) so `getEffectiveTeamId` can set `assignedTeamId`. Otherwise schedule is never applied for that session.

### 2.4 Day name mismatch (unlikely with current UI)

- Backend expects **lowercase** weekday keys: `days["monday"]`, `days["tuesday"]`, etc. It gets the day from `Intl` and lowercases it. The current UI uses the same lowercase keys, so this is only a risk if the API or DB was written by something that uses different casing.

---

## 3. Other behavior worth knowing

- **Overnight shifts** (e.g. 22:00–06:00): The current logic uses `current.mins >= startMins && current.mins < endMins`. If `endMins < startMins`, this condition is never true, so that shift is never “open”. So overnight shifts are not supported; the bug you see is the opposite (open when should be closed), so this is a separate limitation.
- **“Next open” calculation:** The code uses “now + i × 24 hours” in **UTC** to scan future days. For timezones far from UTC, “tomorrow” in the team’s zone might not align with “now + 24h UTC”. That can make “next open” slightly wrong; it does not explain assignments **past** the end of the current shift.
- **Queue vs handover:** Both handover and “Assign queue” / agent go-online use the **same** engine and the **same** ScheduleRule. So schedule is applied in both cases as long as `assignedTeamId` is set and schedule is enabled.

---

## 4. Recommendations

1. **Validate timezone at save time** (Team Management): Reject or warn if `schedule.timezone` is empty or not in `Intl.supportedValuesOf("timeZone")` (or equivalent), so invalid values never reach the engine.
2. **Defensive handling in the engine:** If `schedule.timezone` is missing or invalid when evaluating, treat the team as **closed** (or log and treat as closed) instead of defaulting to open, so a misconfiguration does not cause assignments outside hours.
3. **Optional debug logging:** Log (at debug level) for each schedule check: team id, timezone, “now” in that timezone (e.g. ISO or “HH:mm day”), and `isOpen`. That makes it easy to confirm in logs that “now” is in the expected zone and why the team was considered open or closed.
4. **Confirm in UI:** Add a small “Preview” in Team Management that shows “Current time in team timezone: …” and “Team is currently: Open / Closed” using the same logic as the engine (or a shared helper), so admins can verify timezone and schedule without looking at logs.

---

## 5. Summary

| Cause                      | What to check                                                       | Fix                                                                    |
| -------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Wrong/invalid timezone** | Team schedule timezone in UI and DB; use IANA (e.g. Africa/Nairobi) | Set correct timezone; add validation + defensive “closed” when invalid |
| **Schedule not enabled**   | “Enable schedule” in Team Management                                | Turn on for the team                                                   |
| **Session has no team**    | Handover/effective team; default team                               | Pass teamId / set default team so assignedTeamId is set                |
| **Day key mismatch**       | Only if non-standard API/DB                                         | Keep using lowercase weekday keys                                      |

The engine **does** respect the schedule when (1) the team has a valid, enabled schedule and (2) the session has an `assignedTeamId`. The most likely reason assignments still happen past the shift is that “now” is being computed in the wrong timezone (invalid or defaulting to UTC). Validating and defensively handling the timezone in the engine and in Team Management should prevent that.
