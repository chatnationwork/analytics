/**
 * Password validation against tenant password complexity config.
 * Used when claiming an invite or when changing/setting password.
 */

import type { PasswordComplexityConfig } from "../entities/tenant.entity";

const DEFAULT_MIN_LENGTH = 8;
const DEFAULT_MAX_LENGTH = 128;

/**
 * Default config when tenant has none set (e.g. signup, or legacy tenants).
 * Only enforces minimum length.
 */
export function getDefaultPasswordComplexity(): PasswordComplexityConfig {
  return { minLength: DEFAULT_MIN_LENGTH, maxLength: DEFAULT_MAX_LENGTH };
}

/**
 * Merge partial config with defaults so all fields are defined for validation.
 */
function normalizeConfig(
  config: PasswordComplexityConfig | null | undefined,
): Required<Omit<PasswordComplexityConfig, "maxLength">> & {
  maxLength: number;
} {
  const def = getDefaultPasswordComplexity();
  if (!config || typeof config !== "object") {
    return {
      minLength: def.minLength,
      maxLength: def.maxLength ?? DEFAULT_MAX_LENGTH,
      requireUppercase: false,
      requireLowercase: false,
      requireNumber: false,
      requireSpecial: false,
    };
  }
  return {
    minLength:
      typeof config.minLength === "number" && config.minLength > 0
        ? config.minLength
        : def.minLength,
    maxLength:
      typeof config.maxLength === "number" && config.maxLength > 0
        ? config.maxLength
        : DEFAULT_MAX_LENGTH,
    requireUppercase: Boolean(config.requireUppercase),
    requireLowercase: Boolean(config.requireLowercase),
    requireNumber: Boolean(config.requireNumber),
    requireSpecial: Boolean(config.requireSpecial),
  };
}

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate a password against the given complexity config.
 * Returns { valid: true } or { valid: false, message: "..." }.
 */
export function validatePassword(
  password: string,
  config: PasswordComplexityConfig | null | undefined,
): PasswordValidationResult {
  const c = normalizeConfig(config);

  if (password.length < c.minLength) {
    return {
      valid: false,
      message: `Password must be at least ${c.minLength} characters long`,
    };
  }

  if (password.length > c.maxLength) {
    return {
      valid: false,
      message: `Password must be no more than ${c.maxLength} characters`,
    };
  }

  if (c.requireUppercase && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (c.requireLowercase && !/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (c.requireNumber && !/\d/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }

  if (c.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one special character",
    };
  }

  return { valid: true };
}
