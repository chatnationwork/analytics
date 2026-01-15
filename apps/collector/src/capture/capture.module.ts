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
import { CaptureController } from './capture.controller';
import { CaptureService } from './capture.service';
import { PROJECT_SERVICE } from '@lib/common';

/**
 * Mock Project Service
 * --------------------
 * Temporary implementation for MVP/testing.
 * Validates write keys without hitting the database.
 * 
 * In production, replace this with:
 * - Import DatabaseModule.forFeature()
 * - Use { provide: PROJECT_SERVICE, useClass: ProjectRepository }
 */
const MockProjectService = {
  provide: PROJECT_SERVICE, // The "token" that identifies this provider
  useValue: {
    /**
     * Find a project by its write key.
     * 
     * MVP Implementation: Accept any key longer than 10 characters
     * Production: Query database for actual project
     * 
     * @param writeKey - The write key from the SDK
     * @returns Project object if valid, null if not
     */
    async findByWriteKey(writeKey: string) {
      if (writeKey && writeKey.length > 10) {
        return {
          projectId: 'default-project',
          tenantId: 'default-tenant',
          writeKey,
          allowedOrigins: ['*'], // Allow all origins for MVP
        };
      }
      return null;
    },
  },
};

@Module({
  controllers: [CaptureController],
  providers: [CaptureService, MockProjectService],
})
export class CaptureModule {}
