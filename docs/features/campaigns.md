# Campaign Management Guide

Campaigns allow you to send broadcast messages to your audience. This guide covers how to create and manage campaigns, including using WhatsApp templates with dynamic variables.

## Campaign Types

1.  **Send Now (Manual)**: Broadcasts messages immediately to the selected audience.
2.  **Scheduled**: Pick a future date and time for the broadcast.
    -   **Recurring Campaigns**: Supports daily, weekly, monthly, and yearly repetition.

## Message Types

### 1. Custom Text
Write a one-off message manually. Supports placeholders like `{{name}}` and `{{greeting}}`.
See the [Message Placeholders Guide](./message-placeholders.md) for more details.

### 2. WhatsApp Templates
Select a pre-approved template from the Meta Business API. 
Templates are managed in **Settings > Templates**.

#### Template Variables
WhatsApp templates use numbered placeholders (e.g., `{{1}}`, `{{2}}`). When using a template in a campaign:
1.  **Select Template**: Choose from the dropdown.
2.  **Fill Variables**: Input fields will appear for each variable detected.
3.  **Dynamic Content**: You can use placeholders (e.g., `{{name}}`) inside these variable input fields.

**Example**:
- Template Body: `Hello {{1}}, your balance is {{2}}.`
- Variable 1: `{{firstName|Customer}}`
- Variable 2: `{{metadata.balance|0}}`

## Audience Selection
Use the **Audience Filter Builder** to target specific segments of your contacts.
- Filter by tags, custom metadata, or contact fields.
- Use `AND`/`OR` logic to combine multiple conditions.

## Review and Launch
Before launching, you can see an **Audience Estimation** in the sidebar:
- **In-Window (Free)**: Recipients who have interacted with your business in the last 24 hours.
- **Out-of-Window (Tiered)**: Recipients who require a business-initiated template message and count against your conversation quota.

---

## Technical Details

- **Backend Logic**: `CampaignsService` handles the hydration of template messages.
- **Queueing**: Messages are processed by `SendWorker` using BullMQ.
- **Rate Limiting**: Integrated with WhatsApp Cloud API limits (80 msgs/sec per number).
