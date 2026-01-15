/**
 * =============================================================================
 * SESSIONS MODULE
 * =============================================================================
 * 
 * Feature module for session management.
 * Groups the sessions controller and service together.
 */

import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

import { DatabaseModule } from '@lib/database';

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
