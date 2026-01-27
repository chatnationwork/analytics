/**
 * =============================================================================
 * CAPTURE MODULE
 * =============================================================================
 * 
 * Feature module for the event capture endpoint.
 * This is the heart of the Collector - it receives all analytics events.
 * 
 * DESIGN DECISION: Mock Project Service
 * -------------------------------------
 * For the MVP, we use a mock project service that accepts any valid-looking
 * write key. In production, you'd connect this to the database to validate
 * write keys against actual projects.
 * 
 * DEPENDENCY INJECTION TOKEN:
 * --------------------------
 * We use PROJECT_SERVICE as a "token" - a unique identifier that NestJS
 * uses to look up which provider to inject. This allows us to easily
 * swap the mock service for a real database-backed service later.
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '@lib/database';
import { PROJECT_SERVICE } from '@lib/common';
import { CaptureController } from './capture.controller';
import { CaptureService } from './capture.service';
import { ProjectService } from './project.service';
import { MessageStorageService } from './message-storage.service';
import { MessageEntity, InboxSessionEntity } from '@lib/database';

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [CaptureController],
  providers: [
    CaptureService,
    MessageStorageService,
    {
      provide: PROJECT_SERVICE,
      useClass: ProjectService,
    },
  ],
})
export class CaptureModule {}
