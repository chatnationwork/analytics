import { Module } from "@nestjs/common";
import { DatabaseModule } from "@lib/database";
import { TemplatesController } from "./templates.controller";
import { TemplatesService } from "./templates.service";

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
