
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'analytics_db',
  entities: [], // No entities needed for raw SQL
  synchronize: false,
});

async function main() {
  try {
    await AppDataSource.initialize();
    console.log('📦 Connected to Database');

    // 1. Get Tenant (Correct one matching user view)
    const tenantId = '0486b793-bbeb-4490-9f6b-4d1704fb1244';
    // const tenantAuth = await AppDataSource.query(`SELECT "id" FROM tenants LIMIT 1`);
    console.log(`🏢 Using Tenant ID: ${tenantId}`);

    // 2. Simulate "Handover" / Inbound Message
    const contactId = '+254745050238';
    const contactName = 'Simulated User (+254745050238)';

    // Check existing
    const existing = await AppDataSource.query(
        `SELECT id FROM inbox_sessions WHERE "contactId" = $1 AND "tenantId" = $2`,
        [contactId, tenantId]
    );

    let sessionId;

    if (existing.length > 0) {
        sessionId = existing[0].id;
        console.log(`🔄 Updating Session ${sessionId}`);
        await AppDataSource.query(
            `UPDATE inbox_sessions SET status = 'unassigned', "updatedAt" = NOW() WHERE id = $1`,
            [sessionId]
        );
    } else {
        console.log('✨ Creating NEW Session');
        const res = await AppDataSource.query(
            `INSERT INTO inbox_sessions ("tenantId", "contactId", "contactName", "status", "channel", "lastMessageAt", "createdAt", "updatedAt") 
             VALUES ($1, $2, $3, 'unassigned', 'whatsapp', NOW(), NOW(), NOW()) RETURNING id`,
            [tenantId, contactId, contactName]
        );
        sessionId = res[0].id;
    }
    console.log(`✅ Session Ready: ${sessionId}`);

    // 3. Add Message
    const content = "Hello, I would like to speak to an agent please.";
    await AppDataSource.query(
        `INSERT INTO messages ("sessionId", "tenantId", "content", "direction", "type", "senderId", "createdAt") 
         VALUES ($1, $2, $3, 'inbound', 'text', NULL, NOW())`,
        [sessionId, tenantId, content]
    );
    console.log(`📩 Inbound Message Saved: "${content}"`);

    console.log('🚀 Simulation Complete. Check "Inbox" -> "Unassigned" in Dashboard.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
