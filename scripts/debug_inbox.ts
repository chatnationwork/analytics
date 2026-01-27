
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'analytics_db',
  entities: [],
  synchronize: false,
});

async function main() {
  try {
    await AppDataSource.initialize();
    
    console.log('--- DEBUG: USERS ---');
    const users = await AppDataSource.query(`SELECT id, email FROM users`);
    console.table(users);

    console.log('\n--- DEBUG: TENANT MEMBERSHIPS ---');
    // Try to find membership table name. Guessing 'tenant_members' or 'tenant_users' or 'tenant_memberships'? 
    // I'll skip it for now or try a loose query if I knew the table name.
    // Let's just dump tenants and sessions.
    
    console.log('\n--- DEBUG: TENANTS ---');
    const tenants = await AppDataSource.query(`SELECT id, name FROM tenants`);
    console.table(tenants);

    console.log('\n--- DEBUG: INBOX SESSIONS ---');
    const sessions = await AppDataSource.query(`SELECT id, "contactName", status, "assignedAgentId", "tenantId" FROM inbox_sessions`);
    console.table(sessions);

  } catch (error) {
    console.error(error);
  } finally {
    await AppDataSource.destroy(); // Fix: Invoke destroy
  }
}
main();
