# Smart Contact Import & Configurable Export Feature

## 1. System Overview

The **Contact Management System** has been upgraded to support flexible, user-friendly data ingestion and extraction.

-   **Import**: Moved from fixed-column CSV import to a dynamic mapping wizard.
-   **Export**: Moved from fixed-column dump to a configurable column selection with filtering.
-   **Persistence**: Added support for saving mapping templates to speed up recurring imports.

## 2. Architecture

```mermaid
graph TD
    subgraph Frontend [Dashboard UI]
        A[Contacts Page] --> B[ImportWizard]
        A --> C[ExportDialog]
        B --> D[ColumnMapper]
        B --> E[PapaParse (Client-side)]
        C --> F[TanStack Query Mutation]
    end

    subgraph Backend [Dashboard API]
        G[WhatsappAnalyticsController]
        H[WhatsappAnalyticsService]
        I[ContactRepository]
        J[ImportMappingTemplate Entity]
    end

    subgraph Database [PostgreSQL]
        K[contacts table]
        L[import_mapping_templates table]
    end

    B -- POST /import-mapped --> G
    C -- POST /export --> G
    B -- GET/POST /mapping-templates --> G
    G --> H
    H --> I
    H --> J
    I --> K
    J --> L
```

## 3. Database Schema

### `import_mapping_templates` table
Stores saved column mappings for tenants.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique identifier |
| `tenantId` | VARCHAR | Tenant context |
| `name` | VARCHAR | Template name (Unique per tenant) |
| `mapping` | JSONB | Key-value pair: `{ "CSV Header": "Target Field" }` |
| `createdBy` | VARCHAR | User ID who created it |
| `createdAt` | TIMESTAMPTZ | Creation timestamp |

### `contacts` table updates
No schema changes, but `bulkUpsert` logic was extended to support upserting `email`, `pin`, `yearOfBirth`, `tags`, `paymentStatus`, and `metadata`.

## 4. API Endpoints

### Import
-   **`POST /whatsapp-analytics/contacts/import-mapped`**
    -   **Body**: `FormData` (file, mapping JSON, strategy)
    -   **Logic**: Parses CSV, applies mapping, normalizes phone numbers, performs bulk upsert based on strategy (`first`, `last`, `reject`).

### Export
-   **`POST /whatsapp-analytics/contacts/export`**
    -   **Body**: `{ columns: string[], filters: { tags?: string[] } }`
    -   **Response**: CSV Stream
    -   **Logic**: Streams data from DB using a cursor, transforms rows to match requested columns, handles metadata extraction dynamically.

### Templates
-   **`GET /whatsapp-analytics/mapping-templates`**: List all templates for tenant.
-   **`POST /whatsapp-analytics/mapping-templates`**: Create new template.
-   **`DELETE /whatsapp-analytics/mapping-templates/:id`**: Delete template.

## 5. Frontend Components

### `ImportWizard.tsx` (Multi-step Dialog)
1.  **Upload**: Accepts CSV.
2.  **Mapping**: Uses `ColumnMapper` to let user align headers.
    -   *Auto-suggest*: Fuzzy matches "Mobile" -> "phone", "Organization" -> "metadata.company".
3.  **Options**: Select duplicate strategy (Update/Skip/Reject) and save template.
4.  **Progress**: Shows upload/processing status.

### `ColumnMapper.tsx`
-   Displays a table with CSV headers on the left and Target Fields (Select) on the right.
-   Shows 3 sample rows for context.
-   Supports "Ignore Column" and custom metadata field entry.

### `ExportDialog.tsx`
-   Checkboxes for standard fields (`Name`, `Phone`, `Email`, etc.).
-   Text input for custom metadata keys.
-   Tag filter input.

## 6. Key Algorithms

### Streaming Export (`getExportStream`)
To support large datasets without memory verification errors:
1.  **QueryBuilder Stream**: Uses `TypeORM` stream method to open a DB cursor.
2.  **Transform Stream**: Pipes DB rows through `csv-stringify`.
3.  **Dynamic Selection**: Only requested columns are written to the CSV output.
4.  **Metadata Handling**: The `usage` of partial JSON selection is avoided in favor of selecting the full `metadata` object and extracting keys in Node.js, balancing DB load vs App memory.
