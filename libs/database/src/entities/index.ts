/**
 * =============================================================================
 * ENTITIES BARREL EXPORT
 * =============================================================================
 *
 * WHAT IS AN ENTITY?
 * -----------------
 * In TypeORM, an Entity is a class that maps to a database table.
 * Each property maps to a column.
 *
 * Entity class → Database table
 * Property → Column
 * Instance → Row
 *
 * DECORATORS USED:
 * ---------------
 * @Entity('table_name'): Marks class as an entity, defines table name
 * @Column(): Defines a column
 * @PrimaryColumn(): Primary key column
 * @PrimaryGeneratedColumn(): Auto-generated primary key
 * @CreateDateColumn(): Auto-set on insert
 * @UpdateDateColumn(): Auto-set on update
 * @Index(): Create database index for faster queries
 */

export * from "./event.entity";
export * from "./session.entity";
export * from "./identity.entity";
export * from "./project.entity";
export * from "./user.entity";
export * from "./agent-profile.entity";
export * from "./team.entity";
export * from "./team-member.entity";
export * from "./inbox-session.entity";
export * from "./message.entity";
export * from "./resolution.entity";
export * from "./shift.entity";
export * from "./assignment-config.entity";
export * from "./tenant.entity";
export * from "./tenant-membership.entity";
export * from "./crm-integration.entity";
export * from "./api-key.entity";
export * from "./invitation.entity";
export * from "./role-permission.entity";
export * from "./role.entity";
export * from "./contact.entity";
export * from "./contact-note.entity";
export * from "./agent-session.entity";
export * from "./audit-log.entity";
export * from "./two-fa-verification.entity";
export * from "./password-reset-token.entity";
export * from "./user-session.entity";
export * from "./session-takeover-request.entity";
export * from "./entity-archive.entity";
export * from "./campaign.entity";
export * from "./campaign-message.entity";
export * from "./campaign-schedule.entity";
export * from "./eos-event.entity";
export * from "./eos-ticket-type.entity";
export * from "./eos-ticket.entity";
export * from "./eos-exhibitor.entity";
export * from "./eos-speaker.entity";
export * from "./eos-lead.entity";
export * from "./payment.entity";
export * from "./generated-card.entity";
export * from "./import-mapping-template.entity";
export * from "./template.entity";
