/**
 * =============================================================================
 * REPOSITORIES BARREL EXPORT
 * =============================================================================
 *
 * WHAT IS A REPOSITORY?
 * --------------------
 * A repository is a class that handles data access operations.
 * It abstracts the database layer from the business logic.
 *
 * REPOSITORY PATTERN BENEFITS:
 * ---------------------------
 * 1. Services don't know about SQL or TypeORM
 * 2. Easy to mock for testing
 * 3. Can add caching, logging without changing services
 * 4. Can switch databases (PostgreSQL → ClickHouse) by changing repositories
 *
 * TYPEORM REPOSITORIES:
 * --------------------
 * TypeORM provides a Repository<Entity> class with basic CRUD.
 * We create custom repository classes that:
 * - Inject the TypeORM repository
 * - Add our domain-specific query methods
 * - Handle data transformation
 */

export * from "./event.repository";
export * from "./session.repository";
export * from "./project.repository";
export * from "./user.repository";
export * from "./tenant.repository";
export * from "./crm-integration.repository";
export * from "./api-key.repository";
export * from "./contact.repository";
export * from "./agent-session.repository";
export * from "./audit-log.repository";