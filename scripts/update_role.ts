
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { TenantMembershipEntity } from '../libs/database/src/entities/tenant-membership.entity';
import { UserEntity } from '../libs/database/src/entities/user.entity';
import { TenantEntity } from '../libs/database/src/entities/tenant.entity';

dotenv.config({ path: '../.env' }); // Load from root if running from scripts/

// Fallback to loading from current dir if above failed (depends on where we run it from)
if (!process.env.DB_HOST) {
    dotenv.config({ path: '.env' });
}

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'analytics',
    entities: [
        TenantMembershipEntity,
        UserEntity,
        TenantEntity
    ],
    synchronize: false,
    logging: false,
});

async function main() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected.');

        const email = 'oddsthingshere@gmail.com';
        const newRole = 'super_admin';

        const userRepo = AppDataSource.getRepository(UserEntity);
        const user = await userRepo.findOne({ where: { email } });

        if (!user) {
            console.error(`User with email ${email} not found.`);
            return;
        }

        const membershipRepo = AppDataSource.getRepository(TenantMembershipEntity);
        const membership = await membershipRepo.findOne({ where: { user: { id: user.id } } });

        if (!membership) {
            console.error(`Membership for user ${email} not found.`);
            return;
        }

        console.log(`Updating user ${email} from role '${membership.role}' to '${newRole}'...`);
        membership.role = newRole as any;
        await membershipRepo.save(membership);
        console.log('Update successful.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

main();
