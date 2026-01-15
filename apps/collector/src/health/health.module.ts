/**
 * =============================================================================
 * HEALTH MODULE
 * =============================================================================
 * 
 * Simple module for the health check endpoint.
 * 
 * WHY HEALTH CHECKS?
 * -----------------
 * Load balancers and container orchestrators (Docker, Kubernetes) use
 * health check endpoints to know if your service is running properly.
 * 
 * If the health check fails:
 * - Load balancers stop sending traffic to that instance
 * - Kubernetes may restart the container
 * - Monitoring systems can alert you
 */

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  // No providers - this module only needs the controller
})
export class HealthModule {}
