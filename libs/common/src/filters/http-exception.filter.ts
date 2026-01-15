/**
 * =============================================================================
 * HTTP EXCEPTION FILTER
 * =============================================================================
 * 
 * Global exception filter that formats all errors consistently.
 * 
 * ERROR RESPONSE FORMAT:
 * ---------------------
 * {
 *   "status": "error",
 *   "statusCode": 400,
 *   "message": "Validation failed",
 *   "error": "Bad Request",
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 * 
 * HANDLED EXCEPTION TYPES:
 * -----------------------
 * 1. HttpException (NestJS built-in)
 *    - BadRequestException (400)
 *    - UnauthorizedException (401)
 *    - NotFoundException (404)
 *    - etc.
 * 
 * 2. Standard Error
 *    - Converted to 500 Internal Server Error
 * 
 * 3. Unknown errors
 *    - Converted to 500 with generic message
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

/**
 * Shape of error responses from this API.
 */
export interface ErrorResponse {
  /** Always "error" for error responses */
  status: 'error';
  /** HTTP status code (400, 401, 404, 500, etc.) */
  statusCode: number;
  /** Human-readable error message(s) */
  message: string | string[];
  /** Error type (e.g., "Bad Request", "Unauthorized") */
  error?: string;
  /** ISO timestamp of when error occurred */
  timestamp: string;
}

/**
 * Global exception filter.
 * 
 * @Catch() DECORATOR:
 * ------------------
 * - @Catch() with no arguments catches ALL exceptions
 * - @Catch(HttpException) would only catch HttpException
 * - @Catch(CustomError) would only catch CustomError
 * 
 * We catch everything to ensure consistent error responses.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  /**
   * Handle caught exceptions.
   * 
   * @param exception - The thrown exception
   * @param host - Provides access to request/response
   */
  catch(exception: unknown, host: ArgumentsHost) {
    // Get the HTTP response object
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    // Default values for unknown errors
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error: string | undefined;

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // HttpException response can be a string or object
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || exception.message;
        error = resp.error;
      }
    }
    // Handle standard Error
    else if (exception instanceof Error) {
      message = exception.message;
      // Log unexpected errors for debugging
      this.logger.error(exception.message, exception.stack);
    }

    // Build and send the error response
    const errorResponse: ErrorResponse = {
      status: 'error',
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
    };

    response.status(status).send(errorResponse);
  }
}
