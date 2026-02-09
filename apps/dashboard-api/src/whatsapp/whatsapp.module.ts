import { Module } from "@nestjs/common";
import { WhatsappController } from "./whatsapp.controller";
import { WhatsappService } from "./whatsapp.service";
import { CrmIntegrationsModule } from "../crm-integrations/crm-integrations.module";
import { SystemMessagesModule } from "../system-messages/system-messages.module";

@Module({
  imports: [CrmIntegrationsModule, SystemMessagesModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
