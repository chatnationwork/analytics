import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePaymentsTable1740003001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
        contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
        payable_type VARCHAR(50) NOT NULL,
        payable_id UUID NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'KES',
        exchange_rate DECIMAL(10,6),
        amount_kes DECIMAL(12,2),
        payment_method VARCHAR(30) NOT NULL DEFAULT 'mpesa',
        phone_number VARCHAR(20),
        checkout_request_id VARCHAR(100) UNIQUE,
        merchant_request_id VARCHAR(100),
        mpesa_receipt_number VARCHAR(50),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        failure_reason TEXT,
        provider_metadata JSONB,
        initiated_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryRunner.query(
      `CREATE INDEX idx_payments_org ON payments(organization_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_payments_contact ON payments(contact_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_payments_payable ON payments(payable_type, payable_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_payments_status ON payments(status);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_payments_checkout ON payments(checkout_request_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payments;`);
  }
}
