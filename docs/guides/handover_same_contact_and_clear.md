# Same phone number & clearing sessions (handover)

Add this content into `handover_troubleshooting.md` before the "Quick fix" section, or use it standalone.

---

## Same phone number, multiple handovers

- **One active session per contact**  
  For a given `(tenantId, contactId)` we only ever have **one** "active" session: we look for an **ASSIGNED** session first, then an **UNASSIGNED** one. If we find either, we **reuse** it; we do **not** create a second session for that contact.

- **Handover again with the same number**
  - If there is already an **ASSIGNED** session for that contact → we return that session and run **assignment again** on it (round-robin may assign to the same or the next agent). The session stays assigned; we do not create a new row.
  - If the only session for that contact is **RESOLVED** → we do **not** match it (we only look for ASSIGNED then UNASSIGNED), so we **create a new** UNASSIGNED session. You can then have two rows for the same contact: one RESOLVED (old), one new (unassigned then assigned after handover).

- **Why you might see "test" in assigned but another not in assigned**
  - **Two sessions**: one older (e.g. RESOLVED) and one current (ASSIGNED). The UI may show the resolved one in "Resolved" and the current one in "Assigned" for the agent it's assigned to.
  - **Who is logged in**: "Assigned" tab is usually **per agent**. So you only see a session in "Assigned" when logged in as the agent it's assigned to.
  - **Refresh**: Reload or wait for the next poll so the list reflects the latest status.

---

## Clear sessions / assignments for a contact (for testing)

Replace `YOUR_TENANT_ID` and the contact id/number (e.g. `254745050238`).

**1. List all sessions for a contact (see how many and their status)**

```bash
docker exec -it analytics-postgres psql -U analytics -d analytics -c "
SELECT id, status, \"assignedAgentId\", \"assignedAt\", \"contactId\", \"contactName\", \"createdAt\", \"updatedAt\"
FROM inbox_sessions
WHERE \"tenantId\" = 'YOUR_TENANT_ID'
  AND \"contactId\" = '254745050238'
ORDER BY \"createdAt\" DESC;"
```

**2. Reset a contact's sessions to unassigned (keeps rows, clears assignment)**

Next handover for that contact will run assignment again.

```bash
docker exec -it analytics-postgres psql -U analytics -d analytics -c "
UPDATE inbox_sessions
SET status = 'unassigned',
    \"assignedAgentId\" = NULL,
    \"assignedAt\" = NULL,
    \"updatedAt\" = NOW()
WHERE \"tenantId\" = 'YOUR_TENANT_ID'
  AND \"contactId\" = '254745050238';"
```

**3. Delete all sessions for a contact (nuclear option)**

Next handover for that contact will create a brand-new session.

```bash
docker exec -it analytics-postgres psql -U analytics -d analytics -c "
DELETE FROM inbox_messages WHERE \"sessionId\" IN (
  SELECT id FROM inbox_sessions
  WHERE \"tenantId\" = 'YOUR_TENANT_ID' AND \"contactId\" = '254745050238'
);
DELETE FROM inbox_sessions
WHERE \"tenantId\" = 'YOUR_TENANT_ID'
  AND \"contactId\" = '254745050238';"
```

If your schema has other tables referencing `inbox_sessions` (e.g. resolutions), delete or update those first.
