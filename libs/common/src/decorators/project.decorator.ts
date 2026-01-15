/**
 * =============================================================================
 * CURRENT PROJECT DECORATOR
 * =============================================================================
 * 
 * Custom parameter decorator to extract the authenticated project.
 * 
 * WHAT DOES IT DO?
 * ---------------
 * After WriteKeyGuard validates a request, it attaches the project object
 * to the request. This decorator extracts that project object so you can
 * use it in your controller method.
 * 
 * USAGE:
 * -----
 * @Post()
 * @UseGuards(WriteKeyGuard)
 * capture(@CurrentProject() project: Project) {
 *   console.log(project.projectId); // Access the authenticated project
 * }
 * 
 * WITHOUT THIS DECORATOR:
 * ----------------------
 * @Post()
 * @UseGuards(WriteKeyGuard)
 * capture(@Req() request: FastifyRequest) {
 *   const project = (request as any).project; // Ugly type casting
 * }
 * 
 * createParamDecorator():
 * ----------------------
 * This NestJS function creates a custom parameter decorator.
 * - data: Optional data passed to decorator (not used here)
 * - ctx: Execution context to access the request
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Project } from '../guards/write-key.guard';

/**
 * Extract the authenticated project from the request.
 * 
 * REQUIREMENTS:
 * - Must be used with WriteKeyGuard (guard sets the project)
 * - Without the guard, project will be undefined
 * 
 * @example
 * @Get()
 * @UseGuards(WriteKeyGuard)
 * findAll(@CurrentProject() project: Project) {
 *   return this.service.findAllByProject(project.projectId);
 * }
 */
export const CurrentProject = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Project => {
    // Get the request from the execution context
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    
    // Return the project that was attached by WriteKeyGuard
    return (request as any).project;
  },
);
