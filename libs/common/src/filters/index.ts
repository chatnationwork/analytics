/**
 * =============================================================================
 * FILTERS BARREL EXPORT
 * =============================================================================
 * 
 * WHAT IS AN EXCEPTION FILTER IN NESTJS?
 * -------------------------------------
 * Exception filters catch errors thrown anywhere in your application
 * and convert them to HTTP responses.
 * 
 * Without a filter, unhandled exceptions return:
 * {
 *   "statusCode": 500,
 *   "message": "Internal server error"
 * }
 * 
 * With a custom filter, you can:
 * - Standardize error response format
 * - Log errors for debugging
 * - Hide sensitive error details in production
 * - Add request IDs for tracking
 */

export * from './http-exception.filter';
