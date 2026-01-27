
const { DataSource } = require('typeorm');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'analytics_db',
  entities: [],
  synchronize: false,
});

async function main() {
  try {
    await AppDataSource.initialize();
    console.log('📦 Connected to Database\n');

    // Query to get user emails, roles, and tenant IDs
    const results = await AppDataSource.query(`
      SELECT 
        u.email,
        u.id as "userId",
        tm.role,
        tm."tenantId"
      FROM tenant_memberships tm
      JOIN users u ON tm."userId" = u.id
      ORDER BY u.email, tm.role
    `);

    if (results.length === 0) {
        console.log('⚠️ No memberships found.');
    } else {
        console.log('👤 User Roles:');
        console.log('--------------------------------------------------');
        console.table(results);
        console.log('--------------------------------------------------');
    }

    // Specific check for main accounts
    const targets = ['smithsaruni16@gmail.com', 'oddsthingshere@gmail.com'];
    console.log('\n🔍 Check for Main Accounts:');
    
    for (const email of targets) {
        const found = results.filter(r => r.email === email);
        if (found.length > 0) {
            found.forEach(f => console.log(`   ✅ ${f.email}: ${f.role} (Tenant: ${f.tenantId})`));
        } else {
            console.log(`   ❌ ${email}: No membership found`);
        }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
