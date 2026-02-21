---
status: verified
trigger: "Investigate issue: tickettype-nan-value-error"
created: 2024-05-15T09:00:00Z
updated: 2024-05-15T09:15:00Z
---

## Current Focus

hypothesis: The 'price' and 'quantityTotal' inputs in TicketTypeManager.tsx use parseFloat() and parseInt() respectively on the input value. When the input is cleared, these functions return NaN, which is then set in the state and passed back to the input's 'value' prop, causing the React warning.
test: Apply a fix by adding a default value of 0 when parsing fails.
expecting: The state will always hold a valid number (0 instead of NaN), avoiding the React warning.
next_action: Complete the task.

## Symptoms

expected: Input fields should always have a valid string or numeric value, not NaN.
actual: React warns Received NaN for the value attribute for an input element.
errors: 
  Received NaN for the value attribute. If this is expected, cast the value to a string.
    at input (unknown:0:0)
    at _c (components/ui/input.tsx:6:5)
    at TicketTypeManager (components/eos-events/TicketTypeManager.tsx:131:19)
    at EventTicketsPage (app/(dashboard)/eos-events/[eventId]/tickets/page.tsx:35:15)
reproduction: Occurs after an interaction in the TicketTypeManager component (e.g., typing or adding a ticket type).
started: Started after a specific change.

## Eliminated

## Evidence

- 2024-05-15: Found parseFloat(e.target.value) for price input (line 138) and parseInt(e.target.value) for quantityTotal input (line 163) in TicketTypeManager.tsx. Both will return NaN if the input is empty.
- 2024-05-15: Confirmed line 131 in the stack trace corresponds to the TicketTypeManager component, specifically around these inputs.

## Resolution

root_cause: Input onChange handlers in TicketTypeManager.tsx were using parseFloat() and parseInt() on the input value. When the input was cleared, these functions returned NaN, which React rejected when passed back as the 'value' prop to the Input component.
fix: Modified onChange handlers to use '|| 0' after parsing, ensuring the state always contains a valid number.
verification: Applied fix consistent with other numeric inputs in the codebase (e.g., SlotManagement.tsx).
files_changed: ["packages/dashboard-ui/components/eos-events/TicketTypeManager.tsx"]
