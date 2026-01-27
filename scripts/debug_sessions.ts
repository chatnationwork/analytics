
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// We might not have access to entities directly if path is wrong, so we use raw SQL.

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
    
    // 1. Get Agent ID
    const email = 'smithsaruni16@gmail.com';
    const agents = await AppDataSource.query(`SELECT id, email FROM users WHERE email = $1`, [email]);
    if (agents.length) {
        console.log('👤 Agent:', agents[0]);
    } else {
        console.log('❌ Agent not found');
    }

    // 2. Get Recent Sessions
    const sessions = await AppDataSource.query(
        `SELECT id, "contactId", "contactName", status, "assignedAgentId", "tenantId", "updatedAt"
         FROM inbox_sessions 
         ORDER BY "updatedAt" DESC LIMIT 5`
    );

    console.log('\n📅 Recent Sessions:');
    sessions.forEach((s: any) => {
        console.log(`- [${s.status}] ${s.contactName} (${s.contactId})`);
        console.log(`  ID: ${s.id}`);
        console.log(`  Assigned To: ${s.assignedAgentId}`);
        console.log(`  Tenant: ${s.tenantId}`);
        
        if (agents.length && s.assignedAgentId === agents[0].id) {
            console.log('  ✅ MATCHES AGENT ID');
        } else if (s.assignedAgentId) {
             console.log('  ⚠️ ASSIGNED TO DIFFERENT AGENT');
        } else {
            console.log('  ⚪ UNASSIGNED');
        }
        console.log('');
    });

  } catch (error) {
    console.error(error);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
