import { Module } from "@nestjs/common";
import { DatabaseModule } from "@lib/database";
import { SystemMessagesService } from "./system-messages.service";

@Module({
  imports: [DatabaseModule.forFeature()],
  providers: [SystemMessagesService],
  exports: [SystemMessagesService],
})
export class SystemMessagesModule {}
