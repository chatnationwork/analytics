# CSAT WhatsApp send – curl examples

## 1. Trigger CSAT send via dashboard (resolve session)

Resolving a session triggers sending the CSAT CTA message to the contact over WhatsApp. Use your dashboard JWT and an existing inbox session ID.

```bash
# Replace: BASE_URL, JWT, SESSION_ID
curl -X PUT "https://BASE_URL/api/dashboard/agent/inbox/SESSION_ID/resolve" \
  -H "Authorization: Bearer JWT" \
  -H "Content-Type: application/json" \
  -d '{"category":"general","notes":"Resolved via curl","outcome":"resolved"}'
```

Optional body fields: `category`, `notes`, `outcome`, `wrapUpData` (when team has wrap-up form).

---

## 2. WhatsApp Cloud API – direct CSAT CTA request (the “WhatsApp part”)

This is the exact HTTP request the dashboard backend makes to send the CSAT interactive CTA message. Use it to test against Meta’s API or a proxy without going through resolve.

**Substitute:**

- `BASE_URL` – CRM integration `apiUrl` (e.g. `https://graph.facebook.com` or your proxy base).
- `PHONE_NUMBER_ID` – WhatsApp Business phone number ID from CRM integration config.
- `ACCESS_TOKEN` – WhatsApp Cloud API access token (from CRM integration).
- `TO_PHONE` – Recipient phone in digits only (e.g. `254745050238`).
- `CSAT_URL` – Full URL for the CSAT survey (from CRM `csatLink` or `webLink` + `/csat`).

Backend uses path `/api/meta/v21.0` (see `WhatsappService.WHATSAPP_MESSAGES_PATH`).

```bash
curl -X POST "https://BASE_URL/api/meta/v21.0/PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "TO_PHONE",
    "type": "interactive",
    "interactive": {
      "type": "cta_url",
      "header": { "type": "text", "text": "How did we do?" },
      "body": { "text": "Your chat has been resolved. We'\''d love your feedback." },
      "footer": { "text": "Tap the button below to rate your experience." },
      "action": {
        "name": "cta_url",
        "parameters": {
          "display_text": "Rate your experience",
          "url": "CSAT_URL"
        }
      }
    }
  }'
```

**Example with placeholders filled:**

```bash
curl -X POST "https://graph.facebook.com/api/meta/v21.0/123456789012345/messages" \
  -H "Authorization: Bearer EAAxxxx..." \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "254745050238",
    "type": "interactive",
    "interactive": {
      "type": "cta_url",
      "header": { "type": "text", "text": "How did we do?" },
      "body": { "text": "Your chat has been resolved. We'\''d love your feedback." },
      "footer": { "text": "Tap the button below to rate your experience." },
      "action": {
        "name": "cta_url",
        "parameters": {
          "display_text": "Rate your experience",
          "url": "https://your-crm.example.com/csat"
        }
      }
    }
  }'
```

Success response from Meta includes `messages[0].id`. Errors are in the JSON body (e.g. `error.message`).
