/**
 * =============================================================================
 * DATABASE LIBRARY - BARREL EXPORT
 * =============================================================================
 *
 * This library provides all database-related functionality:
 * - Entities: TypeORM entity definitions (database table structures)
 * - Repositories: Data access layer (CRUD operations)
 * - DatabaseModule: NestJS module for setting up the connection
 *
 * ARCHITECTURE PATTERN: Repository Pattern
 * ----------------------------------------
 * We use the Repository Pattern to abstract database operations:
 *
 *   Controller → Service → Repository → Database
 *
 * Benefits:
 * - Services don't know about SQL/TypeORM
 * - Easy to mock repositories for testing
 * - Can switch databases without changing services
 *
 * ORM: TypeORM
 * -----------
 * TypeORM is an Object-Relational Mapper that:
 * - Maps TypeScript classes to database tables
 * - Provides a query builder for complex queries
 * - Handles migrations
 * - Supports multiple databases (PostgreSQL, MySQL, etc.)
 */

export * from "./database.module";
export * from "./entities";
export * from "./repositories";
export * from "./utils/canonical-contact-id";
export * from "./utils/password-complexity";
export {
  InboxSessionHelper,
  GetOrCreateSessionOptions,
} from "./helpers/inbox-session.helper";
export * from "./segmentation/segment-filter.types";
export * from "./segmentation/segmentation.service";
