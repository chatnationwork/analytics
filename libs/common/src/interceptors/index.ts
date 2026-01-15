/**
 * =============================================================================
 * INTERCEPTORS BARREL EXPORT
 * =============================================================================
 * 
 * WHAT IS AN INTERCEPTOR IN NESTJS?
 * ---------------------------------
 * Interceptors are like middleware that can transform requests and responses.
 * They run BEFORE and AFTER the request handler.
 * 
 * Use cases:
 * - Transform response format (wrap in { status, data })
 * - Add logging (time how long requests take)
 * - Cache responses
 * - Handle errors
 * - Add headers
 * 
 * INTERCEPTOR LIFECYCLE:
 * --------------------
 * Request → Guards → INTERCEPTOR (before) → Handler → INTERCEPTOR (after) → Response
 * 
 * RXJS OPERATORS:
 * --------------
 * Interceptors use RxJS operators to transform the response stream:
 * - map(): Transform the response
 * - tap(): Perform side effects (logging) without changing response
 * - catchError(): Handle errors
 * - timeout(): Add request timeouts
 */

export * from './response.interceptor';
export * from './logging.interceptor';
