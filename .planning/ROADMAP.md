# Roadmap: Ticketing System Overhaul

**Goal:** Comprehensive update to the EOS ticketing system, including editing ticket capacity, resending tickets via WhatsApp, and location-based check-ins.

**Requirements:** [TKT-01, TKT-02, TKT-03, TKT-04, TKT-05, TKT-06, TKT-07]

### Phase 03: Ticketing System Overhaul

- [ ] **TKT-01**: Edit ticket capacity in `EosTicketType`.
- [ ] **TKT-02**: Resend ticket via WhatsApp (Trigger `TICKET_ISSUED`).
- [ ] **TKT-03**: New entities: `EosLocation` and `EosScanLog`.
- [ ] **TKT-04**: Location-aware check-in logic.
- [ ] **TKT-05**: UI for editing `quantityTotal` in `TicketTypeManager`.
- [ ] **TKT-06**: UI for resending tickets in `TicketManager`.
- [ ] **TKT-07**: UI for location management and scan logs.

**Plans:** 3 plans
- [ ] 03-01-PLAN.md — Database entities and core backend updates.
- [ ] 03-02-PLAN.md — Backend logic, services, and controllers.
- [ ] 03-03-PLAN.md — Dashboard UI updates and new components.
