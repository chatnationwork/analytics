/**
 * =============================================================================
 * CONFIGURATION FACTORY FUNCTIONS
 * =============================================================================
 *
 * TYPE-SAFE CONFIGURATION IN NESTJS
 * ---------------------------------
 * NestJS provides a ConfigModule for loading environment variables.
 * These factory functions provide type-safe configuration objects.
 *
 * HOW IT WORKS:
 * ------------
 * 1. ConfigModule loads .env file and process.env
 * 2. registerAs() creates a named configuration namespace
 * 3. ConfigService.get('namespace.key') retrieves typed values
 *
 * BENEFITS:
 * --------
 * - Type safety: You get autocomplete and type checking
 * - Defaults: Provide fallback values if env vars are missing
 * - Organization: Group related config together
 * - Testing: Easy to mock configuration
 *
 * USAGE:
 * -----
 * const port = configService.get<number>('app.collectorPort');
 * const dbHost = configService.get<string>('database.host');
 */

import { registerAs } from "@nestjs/config";

/**
 * Validates that an environment variable is set.
 * Throws an error if the value is missing or empty.
 */
function validate(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(
      `Environment variable "${key}" is required but was not set.`,
    );
  }
  return value;
}

/**
 * Application configuration
 * Accessed via: configService.get('app.xxx')
 */
export const appConfig = registerAs("app", () => ({
  /** Current environment: 'development', 'production', 'test' */
  nodeEnv: validate("NODE_ENV", "development"),

  /** Port for the Collector API (default: 3000) */
  collectorPort: parseInt(validate("COLLECTOR_PORT"), 10),

  /** Port for the Dashboard API (default: 3001) */
  dashboardApiPort: parseInt(validate("DASHBOARD_API_PORT"), 10),
}));

/**
 * Database (PostgreSQL) configuration
 * Accessed via: configService.get('database.xxx')
 */
export const databaseConfig = registerAs("database", () => ({
  /** Database host */
  host: validate("DB_HOST"),

  /** Database port */
  port: parseInt(validate("DB_PORT"), 10),

  /** Database username */
  username: validate("DB_USERNAME"),

  /** Database password */
  password: validate("DB_PASSWORD"),

  /** Database name */
  database: validate("DB_DATABASE"),

  /** Auto-sync schema (Dangerous in prod, use with care) */
  synchronize: process.env.DB_SYNCHRONIZE === "true",
}));

/**
 * Redis configuration
 * Accessed via: configService.get('redis.xxx')
 */
export const redisConfig = registerAs("redis", () => ({
  /** Redis host */
  host: validate("REDIS_HOST"),

  /** Redis port */
  port: parseInt(validate("REDIS_PORT"), 10),
}));

/**
 * Rate limiting configuration
 * Accessed via: configService.get('rateLimit.xxx')
 */
export const rateLimitConfig = registerAs("rateLimit", () => ({
  /** Time window in seconds (default: 60 = 1 minute) */
  ttl: parseInt(validate("RATE_LIMIT_TTL"), 10),

  /** Maximum requests per time window (default: 100) */
  max: parseInt(validate("RATE_LIMIT_MAX"), 10),
}));

/**
 * Authentication configuration
 * Accessed via: configService.get('auth.xxx')
 */
export const authConfig = registerAs("auth", () => ({
  /** Secret key for JWT signing */
  jwtSecret: process.env.JWT_SECRET || "analytics-jwt-secret-dev",

  /** Token expiry (default: 7 days) */
  jwtExpiry: process.env.JWT_EXPIRY || "7d",

  /** Encryption key for CRM API keys (32 bytes = 64 hex chars) */
  encryptionKey: process.env.ENCRYPTION_KEY || "0".repeat(64),
}));

/**
 * Media upload configuration (for chat attachments)
 * Accessed via: configService.get('media.xxx')
 */
export const mediaConfig = registerAs("media", () => ({
  /** Directory to store uploaded files (relative to cwd or absolute) */
  uploadsDir: process.env.MEDIA_UPLOADS_DIR || "uploads/media",
  /** Base URL for public media (must be reachable by WhatsApp). e.g. https://api.example.com */
  publicBaseUrl:
    process.env.MEDIA_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    `http://localhost:${process.env.DASHBOARD_API_PORT || 3001}`,
  /** Max file size in bytes (default 10MB) */
  maxFileSizeBytes: parseInt(process.env.MEDIA_MAX_FILE_SIZE || "10485760", 10),
}));
