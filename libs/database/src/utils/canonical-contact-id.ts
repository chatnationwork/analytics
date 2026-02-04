/**
 * Canonical contact ID (phone number) for consistent lookups.
 * Trims whitespace and strips leading/trailing '+' so that
 * "+254745050238", "254745050238", " +254745050238 " all become "254745050238".
 * Use whenever writing contactId to contacts or inbox_sessions to avoid duplicates.
 */
export function toCanonicalContactId(
  contactId: string | null | undefined,
): string {
  if (contactId == null || typeof contactId !== "string") return "";
  const trimmed = contactId.trim();
  return trimmed.replace(/^\++/, "").replace(/\++$/, "");
}

/**
 * Normalize contact ID to digits only for storage and lookup.
 * Ensures "254745050238", "+254745050238", "254 745 050 238" all match
 * and avoid duplicate sessions when handover and processor use different formats.
 */
export function normalizeContactIdDigits(
  contactId: string | null | undefined,
): string {
  if (contactId == null || typeof contactId !== "string") return "";
  return contactId.trim().replace(/\D/g, "");
}
