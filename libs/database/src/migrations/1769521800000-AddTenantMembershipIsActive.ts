import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTenantMembershipIsActive1769521800000 implements MigrationInterface {
  name = "AddTenantMembershipIsActive1769521800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_memberships" DROP COLUMN IF EXISTS "isActive"`,
    );
  }
}
