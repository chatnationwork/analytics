CHATNATION CRM
Module Requirements, Separation of Concerns & Developer Work Plan
Version 1.0 | February 2026 | Internal Technical Reference
Module I
Events & Exhibitor OS
Module II
Surveys & Insight
Module III
Campaigns &
Automations
Module IV
HypeCards
Saidimu
Events (EOS) + Surveys (USI) + HypeCards
Saruni
Campaigns Engine + Automations + TV/Radio
1. INTRODUCTION & PLATFORM ARCHITECTURE
1.1 What is ChatNation CRM?
ChatNation is a multi-tenant, AI-powered WhatsApp engagement platform. It enables
organizations — event companies, radio stations, NGOs, government agencies, churches and
businesses — to create intelligent WhatsApp experiences without writing code. Think of it as the
Shopify of WhatsApp: the platform provides the infrastructure; the organizations build the
experiences.
1.2 The Four Modules
The platform is built around four distinct but deeply interconnected modules. Each module can
operate independently yet all of them rely on shared infrastructure — especially the Campaigns
Engine which is the delivery backbone for nearly every outbound communication.
Module Description
Module I — EOS Events & Exhibitor Operating System. Full lifecycle management for
events: pre-event hype, ticketing, exhibitor booths, during-event QR
flows and post-event analytics.
Module II — USI Universal Survey & Insight Engine. AI-assisted survey builder. Delivers
surveys over WhatsApp with multimedia responses (text, audio, image,
video). AI generates insights and reports.
Module III — MPCE Multi-Purpose Content & Engagement Engine. The Campaigns
backbone. Handles broadcasts, scheduled programs, automations,
polls and the TV/Radio show management system.
Module IV — HypeCards Viral personalized card generator. Users receive branded cards via
WhatsApp after uploading a photo. AI removes backgrounds,
enhances images and renders the final card.
1.3 The Campaigns Engine — Backbone of the Platform
The Campaigns Engine (Module III / MPCE) is the single delivery mechanism for all outbound
communications across the platform. It is not just a feature — it is shared infrastructure. Every
module that needs to send a message to an audience at a specific time routes through it.
Campaign vs Automation — The Core Distinction
A Campaign is a manually created, deliberate broadcast — the user goes to the Campaigns
section and creates one. An Automation is a system-triggered delivery created contextually
inside another module (e.g. a post-event follow-up inside the Events module). Both use the
same underlying engine and write to the same campaigns table. The difference is in how they
are created and how they surface in the dashboard.
Type Description
Campaign (Manual) Created directly in the Campaigns dashboard. Standalone broadcasts
not tied to a specific event or trigger. E.g. a government ministry
sending a citizen update, a church sending a weekly announcement.
Automation (Event-Driven) Created contextually inside Events, Surveys or Content modules when
a trigger condition is defined. E.g. send a follow-up survey 24hrs after
an event ends. Visible in the Campaigns dashboard under the
Automations tab.
1.4 Module Interdependence Map
The following describes how the modules relate to each other at a functional level:
Relationship How It Works
Events → Campaigns Events creates Automations for pre-event reminders, during-event
announcements and post-event follow-ups. All are delivered through
the Campaign Engine.
Events → Surveys Post-booth-visit feedback, session ratings and post-event surveys are
Survey payloads delivered via Event-triggered Automations.
Events → HypeCards Registration triggers HypeCard generation. Exhibitors use HypeCards
as their branded booth brochure. Speaker cards are HypeCards
delivered pre-event.
Surveys → Campaigns Survey distribution is always a Campaign. A survey is a payload; the
Campaign Engine handles the audience targeting and delivery timing.
TV/Radio → Campaigns Every show poll is a Campaign with a time-based trigger. The show
schedule in the Content module fires Campaigns at the right times
automatically.
HypeCards → Campaigns A Campaign can announce a HypeCard and prompt users to generate
one. The HypeCard itself is generated on-demand, not via campaign.
2. MODULE I — EVENTS & EXHIBITOR OS (EOS)
👤 Developer Owner: Saidimu — Module I: Events, Exhibitor OS, QR Flows, Venue Mapping,
Ticketing
2.1 Purpose & Overview
The Events module is the most commercially critical module and the most complex. It covers the
complete lifecycle of an event — from initial creation and pre-event hype, through the live event
experience, to post-event analytics and follow-up. It supports two distinct operating modes:
Event Mode (Organizer → Exhibitors → Participants) and Independent Exhibitor Mode (exhibitor
runs their own always-on WhatsApp storefront without needing an event).
2.2 User Personas
Persona Role Interface
Organizer Creates and owns the event. Manages agenda,
speakers, sessions, venue map, exhibitor approvals
and all analytics.
Web Dashboard +
WhatsApp
Exhibitor Presents products/services at a booth. Captures leads
via QR scan. Can be event-linked or independent
(always-on storefront).
Web Dashboard +
WhatsApp
Participant /
Attendee
Registers, receives tickets, navigates the event, visits
booths, answers surveys and receives follow-ups.
WhatsApp only
2.3 Three Operational Pillars
2.3.1 PRE-EVENT
Everything that happens from event creation to the moment doors open. This is where the
Campaign Engine is first called.
• Event workspace creation: white-labelled, themed, scoped to the organizer's tenant
• Agenda, speakers and sessions upload — agenda is browsable by participants via
WhatsApp
• Venue layout upload and booth map editor (Leaflet-based drag-and-drop in the
dashboard)
• Exhibitor invitation and onboarding — organizer invites exhibitors; each gets a scoped
sub-workspace
• Ticketing setup: free or paid, M-Pesa STK Push or card, QR code generation per ticket
• Registration flow: participant registers via WhatsApp → details captured → payment (if
paid) → ticket QR issued → subscribed to reminders
• HypeCard auto-generation on registration: 'I am attending TechExpo 2025' card sent to
participant
• Pre-event Campaigns: reminders, speaker spotlights, agenda previews — all delivered
via the Campaign Engine as Automations triggered by the event schedule
• AI builds event FAQs, registration copy and reminder templates automatically
2.3.2 DURING EVENT
The live event experience. The primary user interface is WhatsApp for participants and
exhibitors, with the dashboard providing real-time visibility to the organizer.
• Entry check-in: participant QR scanned at the door — attendance logged, check-in time
recorded, audit trail written
• Exhibitor booth QR scan flow: participant scans exhibitor QR → WAMID captured for
contact → brochure (dynamic experience / HypeCard) delivered → feedback/poll/review
triggered post-visit
• Exhibitor lead capture: every QR scan creates a lead record scoped to that exhibitor with
contact, timestamp and interests
• Live announcements: organizer pushes broadcast campaigns in real-time to all
checked-in participants
• Session reminders: automated per-session reminders to participants who bookmarked
that session
• AI booth navigation: participant asks 'Where is Microsoft?' → AI queries venue map →
returns directions or map image
• Exhibitor real-time dashboard: live visitor count, lead list, booth traffic compared to event
average
• Organizer real-time dashboard: attendance heatmap, session attendance, most visited
booths, check-in velocity
2.3.3 POST-EVENT
Everything after the event ends. The Campaign Engine takes over — automations fire based on
the event end trigger.
• Post-event survey automation: 24hrs after event ends, survey campaign fires to all
registered participants
• Per-booth feedback: after a participant leaves an exhibitor booth (triggered by QR scan),
a short poll/feedback is sent via automation
• Session feedback: each session completion triggers a short feedback automation to
attendees of that session
• Exhibitor lead export: CSV or CRM export of all captured leads scoped to the exhibitor
• AI executive summary report: AI generates attendance, engagement and revenue report
for the organizer
• AI booth performance report: individual exhibitor-level report with visitor personas,
product interest metrics and conversion funnel
• Participant journey summary: each attendee receives a personal summary of booths
visited, sessions attended and resources downloaded
• Retargeting automations: opt-in visitors can be sent follow-up product information by
exhibitors post-event
2.4 Independent Exhibitor Mode
An exhibitor does not require an event to use ChatNation. The Independent Exhibitor Mode
gives them an always-on WhatsApp storefront with their own QR code, product catalog,
payment acceptance and AI sales assistant. This is a standalone sub-product within the Events
module.
• Dedicated WhatsApp number (premium) or shared router number (budget tier)
• Permanent QR code for storefront access — can be placed on physical materials
• Product catalog upload with AI-optimised descriptions
• Lead capture from any QR scan: WAMID captured, lead record created
• Accept payments via M-Pesa directly through the WhatsApp flow
• AI Daily Sales Summary delivered to exhibitor admin each evening
• AI customer interest prediction and lead scoring
• Discoverable by organizers for future event invitations
2.5 The QR Scan Flow — Technical Detail
The QR scan is the most critical interaction in the Events module. It must be fast, auditable and
reliable. The following is the exact flow from scan to data:
1. Participant scans exhibitor QR code using phone camera
2. QR resolves to a WABA deep link or WhatsApp-compatible URL
3. Participant sends a pre-filled message via WhatsApp to the event/exhibitor number
4. WAMID (WhatsApp Message ID) is captured — this contains the sender's phone number
5. Lead record created in the database: phone, timestamp, exhibitor_id, event_id,
scan_location
6. Brochure / digital product delivered immediately via WhatsApp (HypeCard or document)
7. Automation queued: feedback/poll sent after a configurable delay (e.g. 15 minutes
post-scan)
8. Full audit log entry written: action=qr_scan, actor=participant_phone, entity=exhibitor_id,
timestamp, metadata
2.6 Organizer vs Exhibitor Dashboard — Loop in a Loop
The organizer and exhibitor dashboards share the same underlying data layer and many of the
same UI components. The distinction is in scope and permissions. The organizer sees
everything across all exhibitors. The exhibitor sees only their slice. This is enforced at the
database level via Row-Level Security (RLS) and at the API level via the RBAC permission
hierarchy.
Feature Organizer Exhibitor
Event creation & configuration Yes — full control No — read only (their event
context)
Venue map & booth assignment Yes — full editor Yes — own booth preview
only
All exhibitor leads Yes — aggregate view No — own leads only
Own booth leads Yes Yes
Real-time attendance heatmap Yes — full event Yes — own booth traffic only
Push announcements to all Yes No
Post to own visitors No Yes — own opt-in leads
Revenue & ticketing reports Yes — full event No
AI executive summary Yes — event level Yes — booth level only
Export all exhibitor data Yes No — own export only
2.7 Events Module — API Endpoints (Saidimu Owns)
Endpoint Responsibility
POST /events Create a new event workspace
GET /events/{id} Fetch event details, sessions, speakers
PUT /events/{id} Update event configuration
POST /events/{id}/exhibitors Add exhibitor to event
GET /events/{id}/exhibitors List all exhibitors for an event
POST /tickets/purchase Purchase ticket (triggers M-Pesa flow)
POST /tickets/checkin Scan ticket QR at door — writes audit log
POST /qr/booth-scan Exhibitor booth QR scan — capture WAMID, create lead
GET /exhibitors/{id}/leads Fetch leads for an exhibitor
GET /events/{id}/analytics Attendance, heatmap, session stats
GET /events/{id}/map Fetch venue map with booth positions
PUT /events/{id}/map Update booth positions on venue map
2.8 Events Module — Data Entities
Table Purpose
organizations Tenant root — every event, exhibitor and participant belongs to one
org
events Core event record: name, dates, venue, config, status, theme
sessions Agenda sessions: title, speaker_id, start_time, end_time, room
speakers Speaker profiles linked to sessions
tickets Ticket types: name, price, quantity, event_id
ticket_purchases Individual purchase records: user_id, ticket_id, qr_code, payment_ref,
status
exhibitors Exhibitor profiles: org_id, event_id (nullable for independent mode),
booth_location
exhibitor_products Product catalog entries per exhibitor
leads Captured contacts: phone, exhibitor_id, event_id, scan_timestamp,
interests
checkins Entry scan records: participant_phone, event_id, timestamp,
scanned_by
venue_maps JSON blob of booth layout: positions, dimensions, exhibitor
assignments
audit_logs Immutable action log: actor, action, entity, timestamp, metadata (all
modules write here)
3. MODULE II — UNIVERSAL SURVEY & INSIGHT ENGINE
(USI)
👤 Developer Owner: Saidimu — Module II: Survey Builder, WhatsApp Delivery, AI Insight
Engine
3.1 Purpose & Overview
The Survey module gives organizations a powerful data collection engine that operates entirely
inside WhatsApp. No links to external forms, no app downloads. Respondents answer questions
using text, voice notes, images, video and button taps — all from within the WhatsApp chat. The
builder is a drag-and-drop web interface. AI assists in creating questions, and after collection, AI
generates insights, sentiment analysis and executive reports.
Key Distinction: Survey vs Poll
A Survey is a structured, multi-question data collection instrument built in the Survey Builder
and delivered via a Campaign. A Poll is a simpler, single-question interaction primarily used
in the TV/Radio context and as post-event feedback. Polls are a lightweight subset of the
survey system — technically they are survey records with a single question and a
button-response type. Both use the same delivery infrastructure.
3.2 Three Components
3.2.1 Survey Builder (Dashboard — Web)
The builder is a drag-and-drop interface in the Next.js dashboard. It is one of the two most
complex frontend components in the platform (alongside the HypeCard Studio).
• Drag-and-drop question canvas using dnd-kit (SortableContext)
• QuestionNode: draggable card for each question with type selector
• PropertiesPanel: right sidebar that adapts to the selected question type
• LogicEditor: SVG-drawn conditional branching — 'If answer = Yes, jump to Q5'
• Zustand for state management — no prop drilling across canvas, node and panel
• WhatsAppPreview component: shows how each question will look in the WhatsApp chat
as the builder works
• AI assist: user types a topic — AI generates a complete survey structure including
questions, logic and answer options
• On save: Zod validation → JSON survey schema sent to FastAPI backend
3.2.2 Survey Delivery (WhatsApp)
Surveys are delivered and answered entirely within WhatsApp. The Campaign Engine handles
distribution. The LangGraph AI router handles incoming responses and routes them to the
Survey Engine.
Response Type How It Works
Text Short or long text typed directly in WhatsApp
Voice Note (Audio) Whisper API transcribes; original file stored in S3; AI analyses tone and
sentiment
Image GPT-4o Vision analyses; OCR extracts text; classification applied (e.g.
clean/damaged)
Video Audio extracted via Whisper; keyframes analysed; scene summary generated
Document PDF/Word parsed; key information extracted
Button / Quick Reply Best UX — single tap. Used for Yes/No, ratings, multiple choice
Location Optional. GPS pin captured and stored for field surveys
3.2.3 AI Insight Engine
After responses are collected, the Insight Engine processes them and produces reports. This is
a background Celery task triggered either on-demand or automatically at survey close.
• Executive summary: key findings in plain language, suitable for boardroom presentation
• Sentiment analysis: percentage positive / neutral / negative across all text and audio
responses
• Topic clustering: groups free-text responses into themes automatically
• Quote extraction: pulls notable verbatim responses (from transcripts) for the report
• Trend lines: response rate over time, completion drop-off by question
• Segment comparison: compare responses by demographic group or geographic region
• AI alerts: flags if responses contain urgent issues (safety, fraud, health) or if results are
being manipulated
• PDF report generation using WeasyPrint — delivered to admin via WhatsApp and email
3.3 Survey Question Types
Type Input Method Use Case
Short text Simple text input General feedback, names, open
answers
Long text Multi-line text Detailed opinions, complaints,
suggestions
Single choice Pick one from a list Multiple choice polls, preference
questions
Multiple choice Pick many from a list Feature selection, interest mapping
Rating (1-5) Numeric or emoji scale Satisfaction scores, NPS
Yes/No Binary button tap Eligibility checks, consent, quick polls
Audio response Voice note upload Radio listener submissions,
testimonials
Image upload Photo from camera or gallery Field evidence, product feedback,
compliance
Video upload Short video clip TV viewer submissions, training
assessments
Date/Time Calendar or time picker Scheduling, availability
Poll mode Single question, live results TV/Radio audience polls, event polls
Form mode Registration-style data collection Job applications, event registration,
intake forms
3.4 Distribution Settings
A survey is always distributed via the Campaign Engine. Distribution settings defined in the
Survey Builder are passed to the Campaign Engine when the survey is published:
• Send to a specific contact list or phonebook segment
• Embed inside an event flow (triggered by registration, check-in or QR scan)
• Trigger automatically after a user interaction (post-booth visit, post-session)
• Schedule for a specific date and time (cron survey)
• Deliver via QR code — scan opens a WhatsApp deep link that starts the survey
3.5 TV/Radio Poll Implementation
The TV/Radio use case is a specialized instance of the Survey module. It is time-based and
show-aware. The radio station configures their show schedule in the Content module. When a
show slot starts, an Automation fires a poll campaign to the station's subscriber list. The poll is a
single-question survey with button responses.
• Show schedule configured in Content module (MPCE) — e.g. Breakfast Show 6–10AM,
Drive Time 4–7PM
• Each show can have a default poll template that AI pre-fills based on the show name
and topic
• Admin reviews and approves AI-generated poll before it fires — one-click approval
workflow
• Poll fires automatically at show start time via the Campaign Engine Automation
• Responses aggregate in Redis for real-time speed — results visible in dashboard within
seconds
• AI processes all audio/text responses and shows 'Top 5 listener sentiments today'
• Different poll per show slot — morning show has different questions from evening show,
all managed in one dashboard
3.6 Survey Module — API Endpoints (Saidimu Owns)
Endpoint Responsibility
POST /surveys Create a new survey (full JSON schema)
GET /surveys/{id} Fetch survey structure and settings
PUT /surveys/{id} Update survey questions or logic
POST /surveys/{id}/publish Publish survey — hands off to Campaign Engine for distribution
GET /surveys/{id}/responses Fetch all responses (paginated)
GET /surveys/{id}/insights Fetch AI-generated insights and report
POST
/surveys/{id}/insights/generate
Trigger on-demand AI insight generation
GET /surveys/{id}/analytics Completion rates, drop-off by question, response timeline
POST /polls Create a lightweight poll (single-question survey shortcut)
GET /polls/{id}/results Live poll results (Redis-backed for real-time)
4. MODULE III — CAMPAIGNS & AUTOMATIONS ENGINE
(MPCE)
👤 Developer Owner: Saruni — Module III: Campaign Engine, Automations, Scheduler,
Broadcast Infrastructure, TV/Radio Programs
4.1 Purpose & Overview
The Campaigns & Automations Engine is the delivery backbone of the entire platform. It is the
single system responsible for sending any outbound communication to any audience at any
time. Every other module — Events, Surveys, HypeCards — routes its outbound delivery
through this engine. It also has its own standalone user-facing features: broadcast campaigns,
program scheduling and the TV/Radio content management system.
4.2 Campaign Types — The Two Surfaces
Type Description
Campaign (Manual /
Standalone)
Created directly in the Campaigns dashboard by an admin. Not tied to
a specific event or automated trigger. User sets audience, payload,
schedule and sends. Examples: government ministry update, church
weekly announcement, business promotion.
Automation (Event-Driven) Created contextually inside another module when a trigger condition is
defined. Stored as a campaign record with type='automated' and a
trigger definition. Examples: post-registration confirmation,
post-booth-visit feedback, daily morning show poll.
4.3 Campaign Data Model
Both Campaigns and Automations write to the same campaigns table. This is the core design
decision that keeps the engine unified while allowing surface-level differences:
Field Description
id UUID primary key
org_id Tenant identifier — enforces data isolation
type Enum: 'manual' | 'automated'
payload_type Enum: 'message' | 'survey' | 'template' | 'hypecard_announce' | 'poll' |
'broadcast'
payload_id Foreign key to the specific survey, template or poll record
audience_segment JSONB: list of phone numbers or reference to a phonebook segment
schedule Datetime for one-time, or cron expression for recurring
trigger JSONB (nullable): for automations — trigger type, source module, source
entity id, delay
status Enum: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled' | 'failed'
event_id Nullable FK — links automation to a specific event if applicable
created_by User who created the campaign (for audit log)
token_cost Tokens reserved for this campaign delivery
delivery_stats JSONB: sent_count, delivered_count, failed_count, open_rate
4.4 Broadcast Delivery Infrastructure
The Campaign Engine must handle delivery at scale — from a small 50-person church group to
a government broadcast of 100,000+ citizens. Saruni owns the entire delivery pipeline:
Audience Size Delivery Strategy
Under 1,000 recipients Immediate serial delivery — messages sent one by one with minimal
delay
1,000 – 10,000 recipients Chunked batches of 100 messages with 1-second delay between
batches
10,000 – 100,000 recipients Distributed Celery queue with rate limiting — multiple workers process
chunks in parallel
Over 100,000 recipients Scheduled delivery windows + CDN pre-caching of media assets —
phased send over time
WhatsApp Rate Limiting — Critical Constraint
WhatsApp Business API enforces per-number rate limits. The Campaign Engine must
respect these limits and implement exponential backoff on rate limit errors. For large
broadcasts, the engine distributes load across multiple registered WhatsApp numbers if the
organization has them, or queues messages across time windows. Failed deliveries are
retried up to 3 times with increasing delays and logged in the audit system.
4.5 Audience Segmentation
The audience for any campaign is defined at creation time. Saruni owns the segmentation
engine which pulls from the phonebook (subscriber list) and applies filters:
• Static list: upload a CSV of phone numbers or select a saved contact group
• Dynamic segment: filter by registration status, ticket type, booth visited, session
attended, survey completion, subscription tier
• Event-scoped segment: 'all registered participants of Event X', 'all participants who
visited Exhibitor Y'
• Subscription-based segment: paid subscribers vs free subscribers for premium content
• Exclusion rules: exclude users who have opted out, already received this campaign, or
are in a locked survey state
4.6 Scheduler & Time-Based Triggers
APScheduler runs inside the FastAPI container as Celery Beat. Saruni owns the scheduling
layer:
• One-time schedule: fires at a specific datetime — used for event announcements,
pre-event reminders
• Recurring schedule: daily, weekly or custom cron — used for church devotionals, radio
show polls, NGO weekly updates
• Event-relative schedule: 'fire X hours/days before/after event start/end' — used for all
event automations
• Interaction-triggered: 'fire Y minutes after QR scan' — used for post-booth feedback
automations
• Show-based schedule: tied to the TV/Radio program schedule — fires when show slot
starts
4.7 TV/Radio Program Management (Saruni Owns)
The TV/Radio system is a specialized use of the Campaigns Engine combined with the Content
module's program scheduler. It addresses the pain point where presenters manually create polls
for every show — replacing that with AI-assisted, schedule-aware automation.
4.7.1 The Problem Being Solved
A radio presenter like Maina runs a morning show and an evening show. Each show needs a
different poll. Currently this is manual. With ChatNation: the show schedule is defined once, AI
generates poll options for each slot based on show name and topic, the presenter approves with
one click, and the campaign fires automatically at show start time.
• Show schedule configuration: name, days, start time, end time, topic/theme per slot
• AI poll generation: given show name and theme, AI generates 3 poll options for admin to
choose from
• One-click approval workflow: admin sees AI-generated poll, approves or edits, saves —
automation queued
• Automatic campaign fire at show start — no manual action required once approved
• Real-time response aggregation in Redis — results update live in dashboard
• Audio/video response handling — listeners send voice notes; AI transcribes and
summarises
• 'Top 5 listener sentiments' AI summary generated at show end
• Different poll configurations per show slot — morning Maina show vs evening Patanisho
show, fully independent
4.8 Standalone Campaigns Dashboard (Saruni Owns — Frontend)
The Campaigns section of the admin dashboard is a standalone module. It surfaces both
manual Campaigns and Automations in a unified view:
• Campaigns tab: list of manual broadcasts with status, audience size, delivery stats and
open rates
• Automations tab: list of all automations across all modules — shows owning module,
trigger type, how many times fired, last fired timestamp
• Campaign builder: audience selector → payload picker (survey / template / message /
poll) → schedule setter → preview → launch
• Calendar view: shows all scheduled campaigns and automations on a calendar — helps
spot conflicts and gaps
• Analytics: per-campaign delivery rates, response rates, token consumption
4.9 Campaigns Module — API Endpoints (Saruni Owns)
Endpoint Responsibility
POST /campaigns Create a manual campaign (full configuration)
GET /campaigns List all campaigns for the org (paginated, filterable by type/status)
GET /campaigns/{id} Fetch campaign details and delivery stats
PUT /campaigns/{id} Update campaign (only allowed in draft/scheduled status)
DELETE /campaigns/{id} Cancel a scheduled campaign
POST /campaigns/{id}/launch Manually trigger a scheduled campaign immediately
POST /automations Create an automation (called by other modules internally)
GET /automations List all automations with owning module info
PUT /automations/{id}/pause Pause a recurring automation
PUT /automations/{id}/resume Resume a paused automation
GET /segments List available audience segments
POST /segments Create a new audience segment with filters
GET /campaigns/{id}/analytics Delivery stats, open rates, response rates per campaign
POST /broadcasts Shortcut endpoint for simple one-off broadcasts
CRUD /programs TV/Radio show schedule management
POST
/programs/{id}/polls/generate
AI-generate poll options for a show slot
POST
/programs/{id}/polls/approve
Approve AI-generated poll — queues the campaign automation
5. MODULE IV — HYPECARD ENGINE
👤 Developer Owner: Saidimu — Module IV: HypeCard Studio, Template Builder, Rendering
Pipeline
5.1 Purpose & Overview
HypeCards are personalized, shareable digital cards generated via WhatsApp. A participant
uploads their photo, enters their name, and receives a branded 'I am attending TechExpo 2025'
card that they share on LinkedIn, Instagram and WhatsApp Status. For the event, this is free
viral marketing. For exhibitors, it's a branded booth presence card. For the organizer, every
share creates organic reach.
5.2 HypeCard Generation Pipeline
9. Admin creates template in HypeCard Studio: background, logo, text placeholders, QR
position
10. Template published — WhatsApp Flow auto-generated for the participant interaction
11. Participant triggers HypeCard flow (via campaign announcement, QR scan, or direct
message)
12. Participant uploads photo via WhatsApp
13. AI processing: face detection, background removal (rembg), smart crop, lighting
correction, noise removal
14. Playwright loads HTML template, injects processed photo + participant name/title/QR
15. Screenshot taken — PNG rendered at 1080x1080 (square) + portrait and landscape
variants
16. Image uploaded to DigitalOcean Spaces (S3-compatible) — CDN URL generated
17. URL returned to WhatsApp worker — card sent to participant
5.3 HypeCard Studio — The WYSIWYG Editor
The HypeCard Studio is the second of the two high-complexity frontend components. The
critical design constraint is pixel-perfect parity: what the admin sees in the Studio must match
exactly what the Python/Playwright renderer produces. This is achieved by sharing the same
HTML/CSS template structure between the frontend renderer component and the Python
rendering script.
• Canvas (centre): live preview of the card — exactly as it will be generated
• Layers panel (left): background, logo, user photo zone, text blocks, QR code zone
• Design tools (right): font selector, colour picker, X/Y position inputs, size controls
• Moveable/React-Draggable: drag text blocks and elements around the canvas
• Background options: upload own image, choose from 50+ industry templates, or
AI-generate from a text prompt
• Dynamic variable system: {name}, {role}, {company}, {ticket_type}, {event_name},
{qr_code}
• Version control: template v1, v2, v3 — revert to previous version at any time
• Multi-format output: square (WhatsApp Status), portrait (LinkedIn), landscape (Twitter/X)
5.4 HypeCard Module — API Endpoints (Saidimu Owns)
Endpoint Responsibility
POST /hypecards/templates Create a new HypeCard template
GET /hypecards/templates List all templates for the org
GET /hypecards/templates/{id} Fetch template configuration (layers, variables, positions)
PUT /hypecards/templates/{id} Update template design
POST
/hypecards/templates/{id}/genera
te
Generate a HypeCard for a specific user (renders + returns URL)
POST /hypecards/ai/background Generate AI background from text prompt — returns 3-8 options
POST /hypecards/photo/process Process uploaded photo: face detect, background remove,
enhance
GET /hypecards/analytics HypeCards generated, QR scans, viral reach estimate
6. CROSS-CUTTING REQUIREMENTS
These requirements apply to every module and must be designed as shared infrastructure.
Neither developer owns these exclusively — they are platform-level concerns that both must
implement consistently in their respective modules.
6.1 Audit Logging
Given the government and enterprise client targets, auditability is a non-negotiable requirement.
Every significant action in the system must produce an immutable audit log entry. The
audit_logs table is shared across all modules.
Field Description
id UUID
org_id Tenant — all logs scoped to an organisation
actor_id User or system process that performed the action
actor_type Enum: 'user' | 'system' | 'api'
action Namespaced string e.g. 'event.created', 'qr.scanned', 'campaign.sent',
'survey.response.submitted'
entity_type The type of record affected: 'event', 'ticket', 'lead', 'campaign',
'survey_response'
entity_id UUID of the affected record
before_state JSONB snapshot of the record before the action (for update/delete actions)
after_state JSONB snapshot of the record after the action
ip_address IP of the actor (where applicable)
user_agent Browser/device info (where applicable)
timestamp UTC timestamp — immutable, never updated
metadata JSONB: additional context specific to the action
Immutability Rule
Audit log entries are INSERT-only. No UPDATE or DELETE is ever permitted on the
audit_logs table. This is enforced at the PostgreSQL level via a trigger that raises an
exception on any UPDATE or DELETE attempt. Access to raw audit logs is restricted to
Platform Admin and Organization Owner roles only.
6.2 Role-Based Access Control (RBAC)
Every module implements the same permission hierarchy. Roles are global by default but can
be overridden at the team or module level (local rules override global rules for role-based
assignment within a module scope).
Role Permissions Scope
Platform Admin Full system access across all tenants. Internal
ChatNation use only.
All
Organisation Owner Full access to their own organisation's data and
settings. Billing control.
All within org
Organisation Admin Manages modules, team members, campaigns.
Cannot manage billing.
All except billing
Event Manager Creates and manages events within the org.
Cannot access other module settings.
Events only
Survey Manager Creates and manages surveys. Can view
campaign analytics for their surveys.
Surveys + relevant
campaigns
Content Manager Creates and manages campaigns, programs
and broadcasts.
Campaigns + Content
Exhibitor Admin Manages their own booth, products, leads.
Scoped to their exhibitor record.
Own booth only
Exhibitor Staff Views own booth traffic and leads. No
configuration access.
Own booth read-only
Viewer Read-only access to dashboards and reports. Read-only across all
Local Rule Override
For module-specific scenarios, local role rules can override global ones. Example: a Survey
Manager can be granted Exhibitor Admin rights for a specific event's exhibitor without
becoming an org-wide Exhibitor Admin. These overrides are stored as explicit permission
grants scoped to a module + entity ID, and are visible in the audit log.
6.3 Multi-Tenancy & Data Isolation
Every database table that stores organisation data includes an org_id column. PostgreSQL
Row-Level Security (RLS) policies enforce that queries only return rows matching the current
session's org_id. This is set at the application level when a connection is established. No
organisation can ever access another's data — even through API misconfiguration.
• RLS policy set on all tenant-scoped tables
• org_id injected automatically into every INSERT — not trusted from the request body
• Platform Admin queries bypass RLS using a superuser connection (internal use only,
fully audited)
• Multi-tenant aware caching: Redis keys always prefixed with org_id
6.4 Security Requirements
Concern Mitigation
Authentication JWT with refresh tokens for admin users. API keys with scopes for
programmatic access. Phone number verification via WABA for end users.
Data at Rest AES-256 encryption for PostgreSQL and S3. Field-level encryption for PII
(phone numbers).
Data in Transit TLS 1.3 on all connections — internal and external.
API Security Rate limiting on all endpoints. Input validation via Pydantic (backend) and
Zod (frontend). CORS restricted to known origins.
Secrets Management Environment variables in Coolify secrets — never committed to code.
Rotated quarterly.
GDPR / Kenya DPA Data export and deletion request workflows. Consent tracking for
WhatsApp opt-ins. Local data residency option for government clients.
WhatsApp Policy Opt-in required before any outbound message. 24-hour session window
compliance enforced by the Campaign Engine. Opt-out honoured
immediately.
6.5 Billing & Token Economy
The token billing system is shared infrastructure. Every module action that consumes tokens
calls the Billing Service. The Billing Service is not owned by either developer exclusively — it is
a shared internal service that both call.
Action Token Cost
Campaign send (per 100 users) 2–5 tokens
AI survey generation 2 tokens
AI insight report 10–25 tokens
Voice note transcription 2 tokens per file
Image analysis (GPT-4o Vision) 2 tokens per image
HypeCard generation (basic) 2 tokens
HypeCard with AI background 5 tokens
Photo enhancement 1 token
Broadcast (per 1,000 users) 5 tokens
Daily analytics dashboard 1 token/day
Token Reservation Pattern
Before any campaign or AI task is started, the Billing Service reserves the estimated token
cost from the organisation's wallet. If the actual cost differs, the difference is debited or
refunded on completion. This prevents overdraft scenarios and gives organisations
predictable costs. A low-balance alert fires when wallet drops below a configurable threshold.
7. DEVELOPER WORK SPLIT — SAIDIMU & SARUNI
This section defines the explicit ownership boundary between the two developers. The split is
designed around a shared foundation that both developers must complete before diverging into
their respective modules. This prevents duplication of effort and ensures the interfaces between
modules are clean.
7.1 Shared Foundation — Both Developers
Before either developer starts their module work, the following shared infrastructure must be
built and agreed. Both developers are responsible for implementing these in their own code and
respecting the contracts defined here.
• Database schema: all core tables, RLS policies, indexes — designed together, reviewed
together
• Authentication system: JWT, refresh tokens, middleware — built once, imported by both
• RBAC permission system: usePermission hook (frontend) and permission_required
decorator (backend) — shared library
• Audit logging service: a single write_audit_log() function that all modules call — not
reimplemented per module
• Multi-tenancy: org_id injection middleware and RLS policy setup — platform-level,
shared
• Token billing service: debit_tokens(), reserve_tokens(), release_tokens() — shared
internal API
• WhatsApp webhook gateway: the inbound message handler and LangGraph router —
shared
• Design system: Shadcn/UI component library, Tailwind config, colour tokens — agreed
once
7.2 Saidimu — Module Ownership
👤 Developer Owner: Saidimu: Events (EOS) + Surveys (USI) + HypeCards
Backend (FastAPI / Python)
• Event Management Service: CRUD for events, sessions, speakers, venue maps
• Ticketing Service: ticket types, M-Pesa purchase flow, QR code generation, check-in
scanner
• Exhibitor Service: booth management, product catalog, lead capture from QR scans
• Mapping & Navigation Engine: venue layout storage, booth coordinates, AI navigation
queries
• Survey Service: survey schema storage, logic engine, question routing
• Response Engine: inbound WhatsApp response parsing for surveys — text, audio,
image, video
• Transcription Service: integration with OpenAI Whisper for audio responses
• Vision Service: integration with GPT-4o Vision for image responses
• Insight Engine: AI report generation using Pandas + WeasyPrint
• HypeCard Template Service: template CRUD, version control, variable definitions
• HypeCard Rendering Service: Playwright renderer, rembg background removal, photo
enhancement
• HypeCard AI Service: DALL-E/AI background generation, auto-positioning
• QR Service: QR code generation for tickets, booths, HypeCard links
Frontend (Next.js / TypeScript)
• Events section: event list, event creation wizard, event overview dashboard
• Venue map editor: Leaflet-based drag-and-drop booth placement
• Exhibitor management: exhibitor list, booth configuration, lead viewer
• Real-time event dashboard: attendance heatmap, check-in feed, session attendance
• Survey builder: dnd-kit drag-and-drop canvas, QuestionNode, PropertiesPanel,
LogicEditor
• WhatsApp Preview component: shared component used in survey builder and campaign
builder
• Survey results dashboard: response viewer, multimedia playback, AI insights display
• HypeCard Studio: WYSIWYG template editor, layer system, design tools, canvas
renderer
• HypeCard gallery: template library view
7.3 Saruni — Module Ownership
👤 Developer Owner: Saruni: Campaigns Engine + Automations + TV/Radio Programs +
Broadcast Infrastructure
Backend (FastAPI / Python)
• Campaign Engine core: campaign record CRUD, status machine, delivery orchestration
• Automation system: trigger definition storage, trigger evaluation engine, Celery task
queuing
• Broadcast Engine: chunked delivery pipeline, rate limiting, retry logic, WhatsApp API
batching
• Audience Segmentation Service: segment creation, dynamic filter evaluation, phonebook
integration
• Scheduler (APScheduler + Celery Beat): one-time, recurring and event-relative schedule
management
• Program Scheduler: TV/Radio show schedule storage, time-slot configuration
• Poll Engine: poll creation shortcut, real-time vote aggregation in Redis,
Redis-to-Postgres flush
• AI Poll Generator: GPT integration for poll question generation from show context
• Content Library Service: multimedia asset management for scheduled content
• Subscription Manager: subscriber lists, paid vs free tiers, opt-in/opt-out handling
• Campaign Analytics Service: delivery stats, open rates, response rates, token
consumption per campaign
• Internal Campaign API: the internal endpoint that other modules call to create
campaigns and automations
Frontend (Next.js / TypeScript)
• Campaigns dashboard: campaigns list, automations list, status indicators, delivery stats
• Campaign builder: audience selector, payload picker, schedule setter, WhatsApp
preview, launch
• Automations view: list of all automations across modules, owning module badge, trigger
summary, fire history
• Calendar view: FullCalendar implementation showing all scheduled campaigns and
automations
• TV/Radio program manager: show schedule configuration, time slot management
• Poll approval workflow: AI-generated poll review interface, one-click approve/edit/reject
• Broadcast analytics: per-campaign delivery charts (Recharts), token consumption tracker
• Audience segment builder: filter UI for creating dynamic segments
7.4 The Interface Contract — How the Modules Connect
The Campaign Engine exposes an internal API that Saidimu's modules call. This is the single
contract between the two developers. It must be designed and agreed before either developer
builds their module delivery logic.
Internal Campaign Creation Contract
When Saidimu's Events module needs to send a post-event survey, it calls the Campaign
Engine's internal API: POST /internal/campaigns with a body containing: payload_type,
payload_id, audience_segment, schedule (or trigger definition), event_id, org_id,
token_estimate. The Campaign Engine takes it from there. Saidimu's modules never
implement their own delivery logic.
Scenario Flow
Event reminder (pre-event) Events module creates automation → Campaign Engine delivers
template at scheduled time
Post-registration HypeCard
announcement
Events module creates automation → Campaign Engine sends
HypeCard prompt message
Post-booth-visit feedback Events module creates automation with 15min delay trigger →
Campaign Engine sends poll
Post-event survey Events module creates automation triggered by event end →
Campaign Engine sends survey link
TV/Radio show poll Programs scheduler triggers automation at show start →
Campaign Engine sends poll campaign
Standalone broadcast Admin creates campaign directly in Campaigns dashboard →
Campaign Engine delivers
Survey distribution Survey Builder publishes survey → Events or admin defines
audience → Campaign Engine distributes
8. TECHNOLOGY STACK & INFRASTRUCTURE
8.1 Backend Stack
Layer Technology Purpose
API Gateway FastAPI (Python 3.11+) High-performance async API, native AI
support, Pydantic validation
Task Queue Celery + Redis Async job processing — decouples
webhook response from AI processing
AI Orchestration LangGraph Stateful AI agent workflows — manages
multi-step conversations
LLM GPT-4o-mini / GPT-4o Intent routing, content generation, insight
reports
Speech-to-Text OpenAI Whisper Audio response transcription for surveys
and polls
Vision GPT-4o Vision Image analysis for surveys, photo
classification
Image Rendering Playwright (Python) HypeCard HTML-to-image rendering
Background Removal rembg Photo background removal for HypeCards
Report Generation Pandas + WeasyPrint Survey data processing and PDF report
generation
Scheduler APScheduler (Celery Beat) Time-based campaign and automation
triggers
8.2 Frontend Stack
Layer Technology Purpose
Framework Next.js 16 (App Router) React with SSR for dashboards, CSR for
interactive builders
Language TypeScript Type safety — critical for complex survey and
HypeCard data structures
Styling Tailwind CSS Utility-first — essential for HypeCard renderer
parity with backend
Components Shadcn/UI (Radix) Accessible primitives — team owns the code,
not a locked library
Server State TanStack Query Data fetching, caching, live polling for real-time
analytics
Global State Zustand Survey builder store, HypeCard studio store, UI
state
Forms React Hook Form + Zod Validation schemas that mirror Pydantic
backend models
Drag & Drop dnd-kit Survey builder canvas, HypeCard layer
reordering
Charts Recharts Campaign analytics, survey results, attendance
charts
Maps React Leaflet Venue map editor, booth heatmaps
Calendar FullCalendar Campaign and program scheduling calendar
view
8.3 Data Stack
Layer Technology Purpose
Primary Database PostgreSQL 16 + pgvector Relational data + vector embeddings for
RAG in same DB
Cache & Queue Redis 7 Session state, Celery queue, real-time poll
aggregation
Object Storage DigitalOcean Spaces (S3) HypeCard images, survey media files,
document uploads
Search PostgreSQL FTS + pg_trgm Full-text search for events, exhibitors,
content
8.4 Infrastructure Stack
Layer Technology Purpose
Hosting DigitalOcean + Coolify Docker-based PaaS — simple deployment
for 2-person team
Containers Docker Compose / Swarm 5 containers: nextjs, fastapi, python-worker,
postgres, redis
Reverse Proxy Traefik SSL termination, routing, load balancing
CI/CD GitHub Actions Automated test and deploy on push to main
Monitoring Prometheus + Grafana Infrastructure and application metrics
Logging Loki + Promtail Centralised log aggregation
Error Tracking Sentry Exception monitoring with source maps
9. IMPLEMENTATION ROADMAP
The roadmap is structured around the shared foundation first, then parallel module
development. Both developers work together in Phase 1 before splitting into their respective
modules.
Phase 1 — Shared Foundation (Both Developers)
Goal
Core platform infrastructure that every module depends on. Neither developer can build their
module without this.
• PostgreSQL schema design: all core tables with RLS policies — reviewed by both
• FastAPI project structure: routers, middleware, dependency injection patterns
• JWT authentication system with refresh tokens
• RBAC permission system: roles, permission guards, usePermission hook
• Audit logging service: write_audit_log() function and audit_logs table
• Multi-tenancy middleware: org_id injection, Redis key prefixing
• WhatsApp webhook handler: inbound message parsing, 200 ACK, Redis queue push
• LangGraph router: basic intent classification and module routing
• Next.js project structure: App Router, layout, auth middleware, design system
• Token billing service: wallet read, reserve, debit, release operations
Phase 2 — Parallel Module Development (Split)
Saidimu
• Events basic CRUD: create, list, update
events
• Ticketing: M-Pesa flow, QR generation
• QR booth scan: WAMID capture, lead
creation
• Survey builder: backend schema +
frontend DnD canvas
• Survey delivery: basic text + button
responses
• HypeCard: template CRUD + basic
rendering pipeline
Saruni
• Campaign Engine core: CRUD, status
machine
• Broadcast engine: serial delivery pipeline
• Audience segmentation: static list upload
and selection
• Scheduler: one-time and recurring
campaign triggers
• Internal campaign API: the contract
endpoint for other modules
• Campaigns dashboard: list, builder,
analytics (basic)
Phase 3 — AI Integration & Advanced Features
Saidimu
• Whisper audio transcription for survey
responses
• GPT-4o Vision for image survey
responses
• AI insight engine: reports, sentiment,
topic clusters
• Venue heatmap: Leaflet map with booth
traffic overlay
• HypeCard AI: rembg, photo
enhancement, AI backgrounds
• AI booth navigation via LangGraph
sub-agent
Saruni
• Automation engine: event-driven trigger
evaluation
• Dynamic segmentation: filter-based
audience segments
• TV/Radio program scheduler and show
management
• AI poll generation + approval workflow
• Scaled broadcast: batching, rate limiting,
retry logic
• Automations dashboard + calendar view
Phase 4 — Polish, Analytics & Launch
• Advanced analytics dashboards across all modules
• White-label theming: design token system, per-tenant branding
• Performance optimisation: PgBouncer, Redis cluster, CDN configuration
• Monitoring and alerting: Grafana dashboards, PagerDuty integration
• Government compliance: data residency options, enhanced audit export
• Beta customer onboarding: first event organizer, first radio station
• Documentation: API reference, admin user guide, developer guide
This document is a living reference and should be updated as architectural decisions evolve. All API
contracts between modules must be agreed between both developers before implementation begins on
either side of the contract.
ChatNation CRM | Internal Technical Reference | February 2026