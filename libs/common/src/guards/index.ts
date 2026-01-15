/**
 * =============================================================================
 * GUARDS BARREL EXPORT
 * =============================================================================
 * 
 * WHAT IS A GUARD IN NESTJS?
 * -------------------------
 * Guards are a way to protect routes. They run BEFORE the request handler
 * and can allow or deny the request.
 * 
 * Common uses for guards:
 * - Authentication: "Is the user logged in?"
 * - Authorization: "Does the user have permission?"
 * - Feature flags: "Is this feature enabled?"
 * - Rate limiting (though NestJS has ThrottlerGuard for this)
 * 
 * GUARD LIFECYCLE:
 * ---------------
 * Request → Middlewares → Guards → Interceptors → Handler → Interceptors → Response
 *                           ↑
 *                     Can reject here
 */

export * from './write-key.guard';
