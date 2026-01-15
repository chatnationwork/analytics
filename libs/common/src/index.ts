/**
 * =============================================================================
 * COMMON LIBRARY - BARREL EXPORT (index.ts)
 * =============================================================================
 * 
 * WHAT IS A BARREL EXPORT?
 * -----------------------
 * A barrel is a file that re-exports items from other files.
 * Instead of importing from many different files:
 * 
 *   import { WriteKeyGuard } from '@lib/common/guards/write-key.guard';
 *   import { ResponseInterceptor } from '@lib/common/interceptors/response.interceptor';
 * 
 * You can import everything from one place:
 * 
 *   import { WriteKeyGuard, ResponseInterceptor } from '@lib/common';
 * 
 * This makes imports cleaner and hides internal file structure.
 * 
 * WHAT'S IN THIS LIBRARY?
 * ----------------------
 * The common library contains shared utilities used across all apps:
 * - Guards: Authentication/authorization checks
 * - Interceptors: Request/response transformation
 * - Filters: Error handling
 * - Pipes: Data transformation/validation
 * - Decorators: Custom decorators for controllers
 * - Config: Environment configuration helpers
 */

// Guards - Check if requests are allowed
export * from './guards';

// Interceptors - Transform requests/responses
export * from './interceptors';

// Filters - Handle errors consistently
export * from './filters';

// Pipes - Transform/validate data
export * from './pipes';

// Decorators - Custom parameter decorators
export * from './decorators';

// Config - Environment configuration
export * from './config';
