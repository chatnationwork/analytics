/**
 * =============================================================================
 * TEMPLATE RENDERER SERVICE
 * =============================================================================
 *
 * Responsible for rendering message templates with contact data.
 * Supports placeholder syntax: {{fieldName}} and {{fieldName|fallback}}
 *
 * Examples:
 * - {{name}} → "John Doe" or "" (if name is null)
 * - {{name|Guest}} → "John Doe" or "Guest" (if name is null)
 * - {{email|No email}} → "john@example.com" or "No email"
 * - {{metadata.company}} → "Acme Inc" or "" (from JSONB metadata field)
 * - {{metadata.company|Unknown}} → "Acme Inc" or "Unknown"
 */

import { Injectable } from "@nestjs/common";
import { ContactEntity } from "@lib/database";

@Injectable()
export class TemplateRendererService {
  /**
   * Render a message template by replacing placeholders with contact data.
   *
   * Supports two placeholder formats:
   * 1. {{field}} - Replace with field value or empty string if null
   * 2. {{field|fallback}} - Replace with field value or fallback if null
   *
   * @param template - Message template string with placeholders
   * @param contact - Contact entity with data to fill placeholders
   * @param context - Optional extra context for template variable substitution (prioritized)
   * @returns Rendered message with placeholders replaced
   */
  render(template: string, contact: ContactEntity, context?: Record<string, unknown>): string {
    // Match all {{...}} placeholders
    return template.replace(/\{\{([^}]+)\}\}/g, (match, content) => {
      // Split by pipe to get field and optional fallback
      const parts = content.split("|").map((s: string) => s.trim());
      const field = parts[0];
      const fallback = parts[1] || "";

      // Resolve the field value from contact
      const value = this.resolveField(field, contact, context);

      // Return value if exists, otherwise return fallback
      return value ?? fallback;
    });
  }

  /**
   * Resolve a field path to its value in the contact entity.
   *
   * Supports:
   * - Trigger context: ticketCode, qrCodeUrl (highest priority)
   * - System variables: today, tomorrow, greeting
   * - Direct fields: name, email, contactId, pin, yearOfBirth
   * - Nested metadata: metadata.company, metadata.city, etc.
   *
   * @param field - Field path (e.g., "name" or "metadata.company")
   * @param contact - Contact entity
   * @param context - Optional extra context
   * @returns Field value as string, or null if not found/empty
   */
  private resolveField(field: string, contact: ContactEntity, context?: Record<string, unknown>): string | null {
    // 1. Check transient context first (high priority for event-driven data)
    if (context && context[field] !== undefined && context[field] !== null && context[field] !== "") {
      return String(context[field]);
    }

    // 2. Handle system variables
    if (field === "today") {
      return new Date().toLocaleDateString("en-GB"); // DD/MM/YYYY
    }
    if (field === "tomorrow") {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toLocaleDateString("en-GB");
    }
    if (field === "greeting") {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 18) return "Good afternoon";
      return "Good evening";
    }

    // 3. Handle nested metadata fields: metadata.company, metadata.city, etc.
    if (field.startsWith("metadata.")) {
      const metaKey = field.substring(9); // Remove "metadata." prefix
      const metaValue = contact.metadata?.[metaKey];

      // Return null if metadata field doesn't exist or is empty
      if (metaValue === null || metaValue === undefined || metaValue === "") {
        return null;
      }

      return String(metaValue);
    }

    // 4. Handle direct contact fields
    const value = contact[field as keyof ContactEntity];

    // Return null if field is null, undefined, or empty string
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return String(value);
  }

  /**
   * Extract all placeholder fields from a template (for validation).
   *
   * @param template - Message template string
   * @returns Array of field names found in template
   *
   * @example
   * extractPlaceholders("Hello {{name}}, email: {{email|none}}")
   * // Returns: ["name", "email"]
   */
  extractPlaceholders(template: string): string[] {
    const placeholders: string[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      const content = match[1].trim();
      // Extract field name (before pipe if fallback exists)
      const field = content.split("|")[0].trim();
      if (!placeholders.includes(field)) {
        placeholders.push(field);
      }
    }

    return placeholders;
  }
}
