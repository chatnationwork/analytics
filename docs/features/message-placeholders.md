# Message Placeholders Guide

This feature allows you to insert dynamic content into your campaign messages, personalized for each recipient.

## Syntax

Placeholders use the double curly brace syntax: `{{...}}`

### Basic Usage

- `{{name}}` → Replaced with the contact's name (e.g., "John Doe")
- `{{email}}` → Replaced with the contact's email address

### Fallback Values

You can provide a default value to use if the contact's field is empty or missing. Separate the field name and the fallback value with a pipe `|` character.

- `{{name|Valued Customer}}`
  - If name is "Alice", result: "Alice"
  - If name is missing, result: "Valued Customer"

- `{{email|not provided}}`
  - Result: "john@example.com" or "not provided"

**Why use fallbacks?**
WhatsApp message templates will fail to send if a variable resolves to an empty string. Always use fallbacks for optional fields like email or custom metadata.

---

## Supported Fields

### Standard Contact Fields

| Placeholder | Description | Example |
| :--- | :--- | :--- |
| `{{name}}` | Full name of the contact | John Doe |
| `{{contactId}}` | Phone number (ID) | 254712345678 |
| `{{email}}` | Email address | john@example.com |
| `{{pin}}` | Tax ID / PIN | A001234567Z |
| `{{yearOfBirth}}`| Start Year / Birth Year | 1990 |

### System Variables (Dynamic)

These values are calculated at the time of sending and do not depend on contact data.

| Placeholder | Description | Example |
| :--- | :--- | :--- |
| `{{today}}` | Current date (DD/MM/YYYY) | 17/10/2023 |
| `{{tomorrow}}`| Tomorrow's date | 18/10/2023 |
| `{{greeting}}`| Time-based greeting | Good morning / Good afternoon |

### Custom Metadata

You can access any field stored in the contact's `metadata` JSON object using dot notation.

- `{{metadata.company}}` → Accesses `contact.metadata.company`
- `{{metadata.city}}` → Accesses `contact.metadata.city`

**Recommendation**: Always use fallbacks with metadata fields, as they are not guaranteed to exist for every contact.
- `{{metadata.company|your company}}`

---

## Validation & Preview

### Live Preview
The campaign editor includes a "Live Preview" card that updates in real-time. It uses sample data to show you how your message might look.
- **Warnings**: If a placeholder is invalid (e.g., typo like `{{nmae}}`) or missing a fallback, an alert will appear in the preview.

### Validation API
The system automatically validates your template before saving or sending.
- **Invalid Fields**: It checks if `{{...}}` contains a known field.
- **Empty Fields**: It warns if you use fields like `{{email}}` without a fallback, as many contacts may not have an email.

---

## Examples

**Appointment Reminder**
```
{{greeting}} {{name|there}},
This is a reminder for your appointment on {{tomorrow}}.
Please request a pass using ID: {{pin|your ID}}.
```

**Promotional Message**
```
Hello {{name|Valued Customer}}!
We have a special offer for {{metadata.company|your business}} valid until {{today}}.
Reply YES to claim.
```
