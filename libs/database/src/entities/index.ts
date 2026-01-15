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

export * from './event.entity';
export * from './session.entity';
export * from './identity.entity';
export * from './project.entity';
