
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
  entities: [], // Using raw queries for migration safety
  synchronize: false,
});

async function main() {
  try {
    await AppDataSource.initialize();
    console.log('📦 Connected to Database');

    // Mappings from OLD roles to NEW roles
    const roleMapping = {
      'owner': 'SUPER_ADMIN',
      'admin': 'ADMIN',
      'member': 'MEMBER',
      'viewer': 'AUDITOR', 
    };

    console.log('🔄 Starting RBAC Migration...');

    // 1. Fetch all memberships
    const memberships = await AppDataSource.query(`SELECT "userId", "tenantId", role FROM tenant_memberships`);
    
    let updatedCount = 0;

    for (const m of memberships) {
        const oldRole = m.role.toLowerCase();
        const newRole = roleMapping[oldRole];

        if (newRole && m.role !== newRole) {
            console.log(`   - Updating Membership for User ${m.userId} (Tenant ${m.tenantId}): ${m.role} -> ${newRole}`);
            await AppDataSource.query(
                `UPDATE tenant_memberships SET role = $1 WHERE "userId" = $2 AND "tenantId" = $3`,
                [newRole, m.userId, m.tenantId]
            );
            updatedCount++;
        } else if (!newRole) {
            // Ignore already migrated roles if they match the target keys roughly
            if (Object.values(roleMapping).includes(m.role)) {
                // already good
            } else {
                 console.warn(`   ⚠️ Unmapped role found: "${m.role}" for User ${m.userId}`);
            }
        }
    }

    console.log(`✅ Migration Complete. Updated ${updatedCount} memberships.`);
    
    // 2. Set specific super admins
    const superAdminEmails = ['smithsaruni16@gmail.com', 'oddsthingshere@gmail.com'];
    if (superAdminEmails.length > 0) {
        console.log('\n👑 Ensuring Super Admins...');
        for (const email of superAdminEmails) {
             const user = await AppDataSource.query(`SELECT id FROM users WHERE email = $1`, [email]);
             if (user.length) {
                 await AppDataSource.query(
                     `UPDATE tenant_memberships SET role = 'SUPER_ADMIN' WHERE "userId" = $1`,
                     [user[0].id]
                 );
                 console.log(`   - Set ${email} to SUPER_ADMIN`);
             }
        }
    }

  } catch (error) {
    console.error('❌ Migration Failed:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
