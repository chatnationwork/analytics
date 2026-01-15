/**
 * =============================================================================
 * FUNNEL SERVICE
 * =============================================================================
 * 
 * This service handles the business logic for funnel analysis.
 * A "funnel" represents the steps users take through a journey (e.g., MRI tax filing).
 * 
 * WHAT IS A SERVICE IN NESTJS?
 * ----------------------------
 * Services contain the business logic of your application. They are separated
 * from controllers to maintain the Single Responsibility Principle:
 * - Controllers handle HTTP requests/responses
 * - Services handle the actual work (database queries, calculations, etc.)
 * 
 * Services are marked with @Injectable() so NestJS can inject them into other
 * classes using Dependency Injection (DI).
 * 
 * OOP PRINCIPLES USED:
 * -------------------
 * - Encapsulation: Business logic is encapsulated in this class
 * - Dependency Injection: EventRepository is injected via constructor
 * - Single Responsibility: Only handles funnel-related operations
 */

import { Injectable } from '@nestjs/common';
import { EventRepository } from '@lib/database';

/**
 * @Injectable() Decorator
 * -----------------------
 * Marks this class as a provider that can be managed by NestJS's
 * Dependency Injection (DI) container. This means:
 * 
 * 1. NestJS can create instances of this class automatically
 * 2. NestJS can inject dependencies (like EventRepository) into this class
 * 3. This class can be injected into other classes (like FunnelController)
 * 
 * Without @Injectable(), NestJS wouldn't know how to handle this class.
 */
@Injectable()
export class FunnelService {
  /**
   * Constructor with Dependency Injection
   * -------------------------------------
   * The EventRepository is automatically injected by NestJS when this
   * service is instantiated. This is the "Inversion of Control" principle:
   * instead of creating the repository ourselves, NestJS provides it.
   * 
   * Benefits of Dependency Injection:
   * - Easier testing (we can inject mock repositories)
   * - Loose coupling (service doesn't know how repository is created)
   * - Single instance shared across the application
   * 
   * @param eventRepository - Repository for querying event data
   */
  constructor(private readonly eventRepository: EventRepository) {}

  /**
   * Analyze a dynamic funnel defined by the client.
   * 
   * This method:
   * 1. Takes a list of steps from the request
   * 2. Queries the database for unique session counts for each event type
   * 3. Calculates conversion rates relative to the first step
   * 
   * @param tenantId - The tenant (organization) ID
   * @param steps - Array of steps defining the funnel
   * @param startDate - Start of the date range
   * @param endDate - End of the date range
   * @returns Funnel data with step names, counts, and percentages
   */
  async analyze(
    tenantId: string,
    steps: { name: string; eventName: string }[],
    startDate: Date,
    endDate: Date,
  ) {
    if (!steps || steps.length === 0) {
      return { steps: [] };
    }

    // Extract just the event names for the database query
    const eventNames = steps.map((step) => step.eventName);

    // Query the database to count unique sessions for each event type
    const counts = await this.eventRepository.countByEventName(
      tenantId,
      eventNames,
      startDate,
      endDate,
    );

    // Convert array to Map for O(1) lookup by event name
    const countMap = new Map(counts.map((c) => [c.eventName, c.count]));
    
    // Get the first step count for percentage calculation
    // Using || 1 to avoid division by zero
    const firstStepCount = countMap.get(steps[0].eventName) || 1;

    // Build the response with calculated percentages
    return {
      steps: steps.map((step) => {
        const count = countMap.get(step.eventName) || 0;
        return {
          name: step.name,
          eventName: step.eventName,
          count,
          // Calculate percentage relative to first step
          percent: Math.round((count / firstStepCount) * 100),
        };
      }),
    };
  }
}
