# Archived: earlier Sites/Cloudflare documentation

This describes the previous deployment. Use the root README for the current Vercel app.

# Nexora
Private LinkedIn research and sales workspace for Faizan. See START_HERE_ROMAN_URDU.md for usage and DEVELOPER.md for the hosting framework. Public-profile evidence is captured only where accessible; unknown sections are never invented.

Data is saved to Cloudflare D1 and isolated by ChatGPT user ID. All record and agent endpoints require authentication; writes also enforce same-origin requests. LinkedIn OAuth and approved text-post publishing are implemented; app credentials and member authorization must be configured before live use. Personal messaging, connection access and profile editing remain blocked without an approved integration. AI runs require server-side configuration and are limited to 15 requests per owner per hour. Client proposal exports exclude publisher costs. See tests/engine.test.mjs for critical workflow verification.

See LINKEDIN_SETUP.md for connection setup and AUTONOMY_RUNBOOK.md for background execution. Secrets are never returned to the client or MCP tools.


## Account access

The public entry route is a real ChatGPT sign-in page; workspace records and all API mutations require platform-authenticated identity. `/login` and `/privacy` are available without sign-in. Each visitor has a private workspace. Do not build a separate password database or accept an identity from request bodies.

`NEXORA_OWNER_EMAIL` and `NEXORA_OWNER_WORKSPACE_ID` are server configuration. They map the platform-authenticated business owner's exact email to the existing workspace; the original account retains access. Other visitors cannot see that workspace. This changes application access, not the Sites project's hosting ownership. Changing a name or email in a saved settings record does not grant access. Set both values with native runtime settings and deploy; never put tokens or credentials in source.

LinkedIn authorization and approved publication history belong to the resolved workspace. Each unrelated account must connect separately. Partner messaging, invitations and profile-edit permissions are not provided by OpenID Connect or w_member_social; do not mark those capabilities enabled without a working, authorized integration.


## Client requirement intake

In a saved prospect’s Requirements tab, create a private, seven-day, single-use link. Only the raw browser session receives the full token; the database stores its SHA-256 hash. The token is carried in a URL fragment and an Authorization header, not a request URL. The owner can revoke open links; replacing an open link revokes the prior one. No messages are sent to the client by creating or copying a link.

Clients submit a two-step brief without ChatGPT sign-in. One atomic D1 batch fills missing requirements, appends one clearly labelled inbound brief, marks early contacts Replied, and creates an owner-only alert. Current owner-entered requirements are preserved, and the full client submission is available for comparison. The submitted service updates early leads only; advanced deal stages retain their existing scope. Research/response/proposal planning remains internal and deduplicated. No form field can confirm an order, accept pricing or verify payment.

Submission IDs and canonical payload hashes make exact retries safe. Concurrent submissions cannot append duplicate messages or alerts. Expired, revoked, suppressed or replaced links cannot submit. Client identity is not independently verified by possession of a link. The public form exposes no private workspace records, publisher costs or conversation history.

Run `node tests/intake.integration.mjs` against a fresh built Worker to verify the entire API/D1 flow, including isolation, expiry, concurrency, idempotency, suppression and payment-forgery rejection.

### Background work from workspace buttons
Without a separate server AI key, research/review/draft buttons enqueue the selected saved record for the connected ChatGPT runner. Tasks are owner-scoped, deduplicated and visible in Agent control. Completion remains subject to the configured daily limit and runner schedule. Copy-brief controls remain optional. These internal requests never send LinkedIn messages, invitations, profile edits or posts.

### Owner approvals and account entry
- `/login` and `/signup` are separate pages backed by Sites ChatGPT authentication. Signup creates private workspace defaults only after an authenticated user submits the form; it never resets existing settings.
- `Approvals` stores immutable post, message and profile before/after snapshots. Each request creates a private in-app alert. Generated posts, messages and profile suggestions request approval automatically. The notification bell refreshes while the workspace is open; email and closed-browser push are not configured.
- Approved posts enter the existing LinkedIn queue only with actual posting authorization. Approval/rejection and insertion are transactional; changed source/conversation requires fresh review. Messages and profile changes record approval only: execution is not connected.
- LinkedIn login is not full-account API permission. Nexora does not accept passwords or browser cookies, and there is no hosted browser-session bridge. Publishing uses the OAuth account and granted posting scope.
- Validation: 15 policy/engine checks plus built Worker/D1 account, intake, OAuth, publishing and review suites. LinkedIn network calls are mocked, with no external test messages/posts.

### Growth rules
- Follow-up timing supports calendar days (2 days = 48 hours, including weekends) and business days. Existing preferences without a unit retain business-day behavior. The planner and completion checks use each account's saved settings; replies, suppression, a newer sent message or a changed due date cancel stale work. This prepares approval requests, not background LinkedIn messages.
- Public owner-profile research runs weekly when an exact personal URL is saved and automatic research is enabled. The runner extracts accessible sections before preparing optimization previews; missing sections remain unknown. It does not fetch private connection lists or edit LinkedIn.
- Explicit client offers require a quote from the latest incoming message. The saved offer retains its message reference and receipt date and creates an owner alert; it never confirms an order or payment. General interest is not an offer.
- Internal work prioritizes replies, due follow-ups and proposals before new discovery. Content generation creates approval requests; publishing uses the separately connected posting account.
- Validation: 19 policy checks and six built Worker/D1 integration suites, including growth, intake, account isolation, reviews and mocked LinkedIn publishing.

### Action center and direct approved publishing
- Action center groups live owner-scoped workflow state, pending decisions, calculated follow-up dates and evidence-backed client offers. It refreshes while open and links to the relevant workflow or current client record.
- Plan all eligible work uses the existing persistent planner, preserving limits, deduplication and review requirements. Pause/resume controls internal jobs; previously approved posts are managed separately.
- Approvals offers `Approve & publish now` for due content, plus publication of a specific already-approved due post. The owner-selected post ID is validated and filtered server-side; another queued post is never substituted. Future, missing, foreign, published and uncertain posts cannot be resent through this action.
- Client offer/requirements/proposal notifications open the associated private client record. Publication alerts open posting history.
- Validation: production build and TypeScript, existing review/growth integration suites, and expanded mocked LinkedIn tests for selected-post isolation, owner boundaries, future-date blocking and no retries of uncertain outcomes. Local preview authentication prevents checking private screens without a signed-in hosted session.

### Unipile account execution (optional, separate from official posting)
- `LinkedIn` now includes owner-scoped Unipile DSN/API-key setup, Hosted Auth, verified callback binding, separate standing-authorization switches, daily cap, connection pagination and action receipts. Keys are encrypted with workspace-bound authenticated encryption in a private server table, never generic records/exports or MCP output.
- Set up a Unipile API account (billing/trial managed there), enter its DSN/key in the private setup form, save the exact LinkedIn URL in Profile studio, then connect through Hosted Auth. New credentials, provider terms, checkpoints and any subscription need the user's participation. No paid plan is purchased by Nexora.
- A successful callback must have a live, healthy LinkedIn account, matching exact saved profile, single-use unexpired nonce and no other workspace's account binding. A mere login/redirect is not proof of connection.
- `nexora_sync_network` imports one page of connections. `nexora_run_network` syncs up to three tracked conversations and dispatches at most one authorized write under an exclusive owner lease. The runner and UI expose actual state; stale histories, opt-outs, changed reviews, unknown identities and changed accounts block writes. No InMail spend is enabled.
- Message/reply/follow-up automation uses existing researched review snapshots. Per-message approval is required unless the owner saves the explicit auto-message authorization. Follow-ups still require the saved due time; a new reply or existing intro conversation cancels stale work. Confirmed provider message IDs are recorded as sent before follow-up timing starts.
- Invitations/acceptance require owner switches and matching researched prospects. Profile execution supports only approved headline/About changes, compares live before text and verifies after text. Featured/experience removal and arbitrary post deletion remain unsupported.
- External writes are persisted/claimed before dispatch. Unknown or interrupted outcomes never retry; confirmed receipts survive record-update errors. Cancel affects queued actions; disconnect stops Nexora execution but provider access must also be revoked in Unipile.
- New native agent operations are separate from internal-only task tools. Existing posting remains through official OAuth and explicit owner approval.
- Validation: built Worker and isolated D1 tests mock every provider call. Coverage includes encrypted keys, DSN restrictions, auth/CSRF, one-use identity-bound callbacks, account isolation, real-schema sync/send/edit, live opt-out, owner lease/concurrent runs, daily cap and uncertain outcomes never retried. A real Unipile account is still required for live end-to-end validation.

## No-provider workflow
The owner can choose **Activate without paid provider** on Overview, LinkedIn or Settings.
This saves an owner-scoped `noPaidProvider` control, enables the internal research/drafting
workflow, selects the linked ChatGPT queue rather than direct model API calls, and sets
follow-up timing to two calendar days. Existing maximum-follow-up preferences, records,
approvals and official posting authorization are preserved. Unipile HTTP access and
credential setup are rejected while this mode is active; saved provider execution rules
are turned off. This does not revoke a provider session or cancel provider billing.
It does not create a free AI subscription or promise unlimited hosting/ChatGPT usage.
Messages, invitations and profile edits remain manual. An outbound message recorded
by its owner starts the follow-up timer; a recorded reply stops the no-reply sequence.
Approved posts can still use the separately connected official LinkedIn posting flow.
Choosing optional provider setup only removes the provider gate; it never enables sends,
purchases a subscription, or authorizes new provider access by itself.

## Public inbound campaign page
`/work-with-faizan` is a public service and inquiry page for the configured business owner.
Its form creates an unverified incoming lead and a private in-app alert; it never sends
email, accepts an order, publishes a post or verifies payment. `NEXORA_OWNER_WORKSPACE_ID`
is server-controlled; request bodies cannot select a recipient workspace. Inquiries use
strict consent/schema/origin validation, a honeypot, idempotent receipts and atomic hourly
submission limits (5 per hashed network address, 20 total). Existing email suppression is
preserved. No raw network address is persisted in the lead record. Public-page clients do
not need a Nexora account. The contact email is visible only to the owner of the receiving
workspace. Configure inbound-only growth in Agent control to stop cold discovery and
first-message queueing while keeping profile/content work and actual inquiry replies.
