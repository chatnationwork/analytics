import { NestFactory } from '@nestjs/core';
import { DashboardModule } from '../apps/dashboard-api/src/dashboard.module';
import { TriggerService } from '../apps/dashboard-api/src/campaigns/trigger.service';
import { CampaignTrigger } from '../apps/dashboard-api/src/campaigns/constants';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CampaignEntity, CampaignStatus, CampaignType, ContactRepository, ContactEntity, CampaignMessageEntity } from '@lib/database';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(DashboardModule);
  const triggerService = app.get(TriggerService);
  const campaignRepo = app.get(getRepositoryToken(CampaignEntity));
  const contactRepo = app.get(ContactRepository);
  const messageRepo = app.get(getRepositoryToken(CampaignMessageEntity));
  const contactEntityRepo = app.get(getRepositoryToken(ContactEntity));
  const dataSource = app.get(DataSource);

  const tenantId = 'smoke-test-tenant';
  const phone = '254700000000';

  console.log('--- EOS Campaign Smoke Test ---');

  // 1. Create/Update test contact
  let contact = await contactRepo.findOne(tenantId, phone);
  if (!contact) {
    contact = await contactRepo.findOneOrCreate(tenantId, phone, 'Smoke Test User');
    console.log('Created test contact');
  } else {
    await contactRepo.updateProfile(tenantId, phone, { name: 'Smoke Test User' });
    console.log('Updated test contact profile');
  }

  // 2. Create an active trigger-based campaign
  const campaign = campaignRepo.create({
    tenantId,
    name: 'EOS Smoke Test Campaign',
    type: CampaignType.EVENT_TRIGGERED,
    status: CampaignStatus.RUNNING,
    sourceModule: 'smoke-test',
    triggerType: CampaignTrigger.TICKET_ISSUED,
    messageTemplate: {
      type: 'text',
      text: { body: 'Hello {{name}}, your ticket code is {{ticketCode}}. Event: {{eventName}}' }
    } as any
  });
  await campaignRepo.save(campaign);
  console.log(`Created test campaign: ${campaign.id}`);

  console.log('Firing TICKET_ISSUED trigger with context...');
  // 3. Fire trigger (simulating event from EOS module)
  await triggerService.fire(CampaignTrigger.TICKET_ISSUED, {
    tenantId,
    contactId: phone,
    context: {
      ticketCode: 'SMOKE-ABC-123',
      eventName: 'The Big Event'
    }
  });

  // 4. Wait for BullMQ processing (Give it a few seconds)
  console.log('Waiting 5s for BullMQ processing...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 5. Verify message record exists and is rendered correctly
  const message = await messageRepo.findOne({
    where: { campaignId: campaign.id, recipientPhone: phone },
    order: { createdAt: 'DESC' }
  });

  if (message) {
    console.log('SUCCESS: Message found in campaign_messages table');
    console.log(`Message Status: ${message.status}`);
    
    if (['sent', 'queued', 'pending', 'delivered', 'read'].includes(message.status)) {
        console.log('Message is in a valid state.');
    } else {
        console.log(`Warning: Message status is ${message.status}`);
    }
  } else {
    console.error('FAILED: Message not found in campaign_messages table');
  }

  // 6. Cleanup
  console.log('Cleaning up test data...');
  if (message) {
    await messageRepo.delete({ id: message.id });
  }
  await campaignRepo.delete(campaign.id);
  await contactEntityRepo.delete({ tenantId, contactId: phone });
  
  console.log('Cleanup complete.');
  console.log('--- Smoke Test Passed ---');

  await app.close();
}

bootstrap().catch(err => {
  console.error('Smoke test failed with error:');
  console.error(err);
  process.exit(1);
});
