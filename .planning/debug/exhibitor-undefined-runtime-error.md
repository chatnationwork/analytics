---
status: investigating
trigger: "TypeError: can't access property "name", exhibitor is undefined in packages/dashboard-ui/app/eos/exhibitor/[token]/page.tsx:153:27"
created: 2024-11-20T10:00:00Z
updated: 2024-11-20T10:00:00Z
---

## Current Focus

hypothesis: The 'exhibitor' object is null or undefined when the component tries to access its 'name' property on line 153.
test: Examine the code in packages/dashboard-ui/app/eos/exhibitor/[token]/page.tsx and check how 'exhibitor' is fetched and used.
expecting: To find a missing null/undefined check or a failed data fetch.
next_action: Read the content of packages/dashboard-ui/app/eos/exhibitor/[token]/page.tsx.

## Symptoms

expected: The exhibitor page should load successfully, displaying the exhibitor's name.
actual: Runtime error: can't access property "name", exhibitor is undefined.
errors: TypeError: can't access property "name", exhibitor is undefined at ExhibitorPortalPage (app/eos/exhibitor/[token]/page.tsx:153:27)
reproduction: Click on the link to the exhibitor page.
started: When clicking the exhibitor link.

## Eliminated

## Evidence

## Resolution

root_cause: 
fix: 
verification: 
files_changed: []
