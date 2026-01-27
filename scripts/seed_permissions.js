
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

const PERMISSIONS = {
    // Global Roles
    SUPER_ADMIN: [
        'analytics.view',
        'analytics.export',
        'settings.manage',
        'users.manage',
        'teams.manage',
        'audit.view',
        // Include team/agent permissions that might be needed globally or for consistency
        'team.settings',
        'team.analytics',
        'session.view',
        'session.manage',
        'agent.assign'
    ],
    ADMIN: [
        'analytics.view',
        'analytics.export',
        'settings.manage',
        'users.manage',
        'teams.manage'
    ],
    AUDITOR: [
        'analytics.view',
        'audit.view'
    ],
    MEMBER: [], // Base role

    // Team Roles (Prefixed or handled separately? 
    // Usually these are static checks in code, but if we store them:
    // TEAM_MANAGER: ['team.settings', 'team.analytics', 'session.view', 'session.manage', 'agent.assign'],
    // TEAM_AGENT: ['session.view', 'session.manage']
    // ... verification confirmed we are storing global permissions in role_permissions table.
};

async function main() {
  try {
    await AppDataSource.initialize();
    console.log('📦 Connected to Database');
    console.log('🌱 Seeding Permissions...');

    for (const [role, permissions] of Object.entries(PERMISSIONS)) {
        console.log(`   Processing Role: ${role}`);
        
        for (const permission of permissions) {
            // Check if exists
            const existing = await AppDataSource.query(
                `SELECT id FROM role_permissions WHERE role = $1 AND permission = $2`,
                [role, permission]
            );

            if (existing.length === 0) {
                await AppDataSource.query(
                    `INSERT INTO role_permissions (role, permission, "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW())`,
                    [role, permission]
                );
                console.log(`     + Added ${permission}`);
            } else {
                // console.log(`     . ${permission} (exists)`);
            }
        }
    }

    console.log('✅ Seeding Complete.');

  } catch (error) {
    console.error('❌ Seeding Failed:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
