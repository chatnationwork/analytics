# Entity & Migration Audit

## Summary

- **AddInvitationFieldsToExhibitors** migration was broken: it incorrectly tried to `CREATE TABLE payments` (duplicate). Fixed to add invitation columns to `eos_exhibitors` instead.

---

## Entities NOT in Datasource (but have migrations)

These entities are used by the app (e.g. `database.module.ts`) but are **not** in `datasource.ts`. Migrations create their tables, so schema is in sync.

| Entity | Table | Migration |
|--------|-------|-----------|
| `ImportMappingTemplate` | `import_mapping_templates` | CreateImportMappingTemplates |
| `ScheduleEntity` | `schedules` | CreateSchedulesTable |
| `EntityArchiveEntity` | `entity_archive` | AddEntityArchiveTable |

**Note:** They do not need to be in the datasource for `migration:run` unless another entity references them. None do.

---

## Entities in Datasource (all have migrations)

All entities in `datasource.ts` have corresponding migrations that create their tables.

| Entity | Table |
|--------|-------|
| UserEntity | users |
| EventEntity | events |
| SessionEntity | sessions |
| IdentityEntity | identities |
| ProjectEntity | projects |
| TenantEntity | tenants |
| TenantMembershipEntity | tenant_memberships |
| CrmIntegrationEntity | crm_integrations |
| ApiKeyEntity | api_keys |
| InvitationEntity | invitations |
| AgentProfileEntity | agent_profiles |
| TeamEntity | teams |
| TeamMemberEntity | team_members |
| InboxSessionEntity | inbox_sessions |
| MessageEntity | messages |
| ResolutionEntity | resolutions |
| ShiftEntity | shifts |
| AssignmentConfigEntity | assignment_configs |
| RolePermissionEntity | role_permissions |
| RoleEntity | roles |
| ContactEntity | contacts |
| ContactNoteEntity | contact_notes |
| AgentSessionEntity | agent_sessions |
| AuditLogEntity | audit_log |
| TwoFaVerificationEntity | two_fa_verification |
| PasswordResetTokenEntity | password_reset_tokens |
| UserSessionEntity | user_sessions |
| SessionTakeoverRequestEntity | session_takeover_requests |
| CampaignEntity | campaigns |
| ContactSegmentEntity | contact_segments |
| CampaignMessageEntity | campaign_messages |
| CampaignScheduleEntity | campaign_schedules |
| TemplateEntity | templates |
| EosEvent | eos_events |
| EosTicketType | eos_ticket_types |
| EosTicket | eos_tickets |
| EosExhibitor | eos_exhibitors |
| EosLead | eos_leads |
| Payment | payments |
| GeneratedCard | generated_cards |

---

## Fix Applied

**`1771484103217-AddInvitationFieldsToExhibitors.ts`** previously contained incorrect content (TypeORM-generated `CREATE TABLE payments`). It was replaced with the correct migration that adds `invitation_token`, `invited_at`, and `booth_token` to `eos_exhibitors`.
