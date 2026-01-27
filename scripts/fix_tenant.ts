
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

    // 1. Find 'chatnation' tenant
    const targets = await AppDataSource.query(`SELECT id FROM tenants WHERE name = 'chatnation'`);
    if (!targets.length) {
        console.log('Could not find chatnation tenant. Updating nothing.');
        return;
    }
    const targetTenantId = targets[0].id;
    console.log(`Target Tenant: ${targetTenantId} (chatnation)`);

    // 2. Find the session we created (John Doe)
    const sessions = await AppDataSource.query(`SELECT id FROM inbox_sessions WHERE "contactName" = 'John Doe (Simulated)'`);
    if (!sessions.length) {
         console.log('Session John Doe not found.');
         return;
    }
    const sessionId = sessions[0].id;
    console.log(`Found Session: ${sessionId}`);

    // 3. Update Session AND Messages
    await AppDataSource.query(`UPDATE inbox_sessions SET "tenantId" = $1 WHERE id = $2`, [targetTenantId, sessionId]);
    await AppDataSource.query(`UPDATE messages SET "tenantId" = $1 WHERE "sessionId" = $2`, [targetTenantId, sessionId]);
    
    console.log('✅ Moved session and messages to "chatnation" tenant.');

  } catch (error) {
    console.error(error);
  } finally {
    await AppDataSource.destroy();
  }
}
main();
