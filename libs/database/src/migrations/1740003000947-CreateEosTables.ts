import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEosTables1740003000947 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. eos_events
    await queryRunner.query(`
      CREATE TABLE eos_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL, -- references organizations(id) - assuming implicit FK or strict ID for RLS
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100),
        description TEXT,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
        venue_name VARCHAR(255),
        venue_address TEXT,
        is_virtual BOOLEAN DEFAULT FALSE,
        virtual_url TEXT,
        cover_image_url TEXT,
        settings JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'draft',
        published_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_eos_events_org ON eos_events(organization_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_eos_events_dates ON eos_events(starts_at, ends_at);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_eos_events_status ON eos_events(status);`,
    );

    // 2. eos_ticket_types
    await queryRunner.query(`
      CREATE TABLE eos_ticket_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES eos_events(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'KES',
        quantity_total INTEGER,
        quantity_sold INTEGER DEFAULT 0,
        max_per_order INTEGER DEFAULT 10,
        sales_start_at TIMESTAMPTZ,
        sales_end_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. eos_tickets
    await queryRunner.query(`
      CREATE TABLE eos_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_type_id UUID NOT NULL REFERENCES eos_ticket_types(id),
        contact_id UUID NOT NULL REFERENCES contacts(id),
        ticket_code VARCHAR(20) UNIQUE NOT NULL,
        qr_code_url TEXT,
        holder_name VARCHAR(255),
        holder_email VARCHAR(255),
        holder_phone VARCHAR(20),
        amount_paid DECIMAL(10,2),
        payment_reference VARCHAR(100),
        payment_status VARCHAR(20) DEFAULT 'pending',
        payment_metadata JSONB,
        hype_card_id UUID, -- references generated_cards(id)
        status VARCHAR(20) DEFAULT 'valid',
        checked_in_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_eos_tickets_type ON eos_tickets(ticket_type_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_eos_tickets_contact ON eos_tickets(contact_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_eos_tickets_code ON eos_tickets(ticket_code);`,
    );

    // 4. eos_exhibitors
    await queryRunner.query(`
      CREATE TABLE eos_exhibitors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES eos_events(id) ON DELETE CASCADE,
        organization_id UUID, -- references organizations(id) if exhibitor has account
        name VARCHAR(255) NOT NULL,
        description TEXT,
        logo_url TEXT,
        booth_number VARCHAR(50),
        booth_location JSONB, -- {x, y, width, height}
        contact_name VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(20),
        settings JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. eos_leads
    await queryRunner.query(`
      CREATE TABLE eos_leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        exhibitor_id UUID NOT NULL REFERENCES eos_exhibitors(id) ON DELETE CASCADE,
        contact_id UUID NOT NULL REFERENCES contacts(id),
        source VARCHAR(50),
        notes TEXT,
        interest_level VARCHAR(20), -- cold, warm, hot
        ai_intent TEXT,
        interaction_context VARCHAR(20) DEFAULT 'event_active',
        follow_up_status VARCHAR(20) DEFAULT 'new',
        followed_up_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_eos_leads_exhibitor ON eos_leads(exhibitor_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_eos_leads_contact ON eos_leads(contact_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_eos_leads_interest ON eos_leads(interest_level);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS eos_leads;`);
    await queryRunner.query(`DROP TABLE IF EXISTS eos_exhibitors;`);
    await queryRunner.query(`DROP TABLE IF EXISTS eos_tickets;`);
    await queryRunner.query(`DROP TABLE IF EXISTS eos_ticket_types;`);
    await queryRunner.query(`DROP TABLE IF EXISTS eos_events;`);
  }
}
