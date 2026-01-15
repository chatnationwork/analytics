/**
 * =============================================================================
 * DECORATORS BARREL EXPORT
 * =============================================================================
 * 
 * WHAT ARE DECORATORS?
 * -------------------
 * Decorators are special functions that add metadata or modify behavior.
 * They use the @ syntax: @Controller(), @Get(), @Injectable()
 * 
 * TYPES OF DECORATORS IN NESTJS:
 * -----------------------------
 * 1. Class decorators: @Controller(), @Injectable(), @Module()
 * 2. Method decorators: @Get(), @Post(), @UseGuards()
 * 3. Parameter decorators: @Body(), @Query(), @Param()
 * 4. Property decorators: @Inject()
 * 
 * CUSTOM PARAMETER DECORATORS:
 * ---------------------------
 * NestJS lets you create custom parameter decorators to extract
 * data from the request. We use this for @CurrentProject().
 */

export * from './project.decorator';
