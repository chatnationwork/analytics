/**
 * =============================================================================
 * PIPES BARREL EXPORT
 * =============================================================================
 * 
 * WHAT IS A PIPE IN NESTJS?
 * ------------------------
 * Pipes transform or validate data BEFORE it reaches the handler.
 * 
 * Two main use cases:
 * 1. TRANSFORMATION: Convert data types (string → number, string → Date)
 * 2. VALIDATION: Check if data is valid, throw BadRequestException if not
 * 
 * BUILT-IN PIPES:
 * --------------
 * - ValidationPipe: Validates DTOs using class-validator decorators
 * - ParseIntPipe: Converts string to integer
 * - ParseUUIDPipe: Validates UUID format
 * - DefaultValuePipe: Provides default if value is undefined
 * 
 * EXAMPLE:
 * -------
 * @Get(':id')
 * findOne(@Param('id', ParseIntPipe) id: number) {
 *   // 'id' is now a number, not a string
 * }
 * 
 * CUSTOM PIPES:
 * ------------
 * We use the built-in ValidationPipe globally, so no custom pipes yet.
 * Add custom pipes here if needed in the future.
 */

// Re-export commonly used built-in pipes for convenience
export { ValidationPipe, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
