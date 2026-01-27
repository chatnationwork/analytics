
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
    
    // 1. Get Agent (Super Admin)
    const email = 'smithsaruni16@gmail.com';
    const agents = await AppDataSource.query(`SELECT id FROM users WHERE email = $1`, [email]);
    
    if (!agents.length) {
        console.error(`Agent ${email} not found.`);
        process.exit(1);
    }
    const agentId = agents[0].id;

    // 2. Get Tenant
    const tenantId = '0486b793-bbeb-4490-9f6b-4d1704fb1244';

    console.log(`🕵️ Found Agent: ${email} (${agentId})`);
    console.log(`🏢 Using Tenant: ${tenantId}`);

    // 2. Find Unassigned Session
    const sessions = await AppDataSource.query(
        `SELECT id, "contactId" FROM inbox_sessions 
         WHERE status = 'unassigned' AND "tenantId" = $1
         ORDER BY "updatedAt" DESC LIMIT 1`,
        [tenantId]
    );

    if (!sessions.length) {
        console.log('⚠️ No unassigned sessions found.');
        return;
    }

    const sessionId = sessions[0].id;
    console.log(`📝 Found Unassigned Session: ${sessionId} (${sessions[0].contactId})`);

    // 3. Assign
    await AppDataSource.query(
        `UPDATE inbox_sessions 
         SET status = 'assigned', "assignedAgentId" = $1, "updatedAt" = NOW()
         WHERE id = $2`,
        [agentId, sessionId]
    );

    console.log(`✅ Session Assigned to Agent!`);

  } catch (error) {
    console.error(error);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
