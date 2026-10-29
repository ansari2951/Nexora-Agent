# Nexora Agent

A private LinkedIn research, content and sales workspace.

**Live app:** [Open Nexora](https://nexora-agent-ansari-9b3a.vercel.app/)

Nexora mein prospects aur campaign details save karo, research aur drafts tayyar karo, client requirements organize karo aur external action se pehle review karo. **Draft, approval aur actual LinkedIn execution alag stages hain.**

## Features

| Feature | Kaam |
| --- | --- |
| Private workspace | Clerk identity ke mutabiq har account ke records alag |
| Prospect management | LinkedIn URLs, company, research evidence, notes, stages aur supported CSV import |
| Research & profile studio | Accessible public evidence se research aur profile suggestions; missing facts invent nahi hote |
| Message planning | Personalized drafts, recorded replies aur follow-up dates |
| Content & posts | Drafts, exact-content approval, scheduling aur publishing history |
| Approvals | Saved post, message aur supported profile-change snapshots |
| Client requirements | Campaign brief aur private, expiring, single-use requirement links |
| Publisher inventory | Saved options ko budget, currency, niche aur margin se match karna |
| Proposals & sales | Client offers, requirements, order/payment records aur private alerts |
| Agent control | Persistent queues, limits, pause controls aur blocked reasons |
| Optional integrations | Official LinkedIn posting, Unipile, n8n aur AI processing |
| Diagnostics | `/system` connection guide; `/api/health` minimal database check |
| Public service page | `/work-with-faizan` services, samples aur inquiry form |

## Current status — 29 October 2026 (PKT)

Yeh last verified checkpoint hai, continuously monitored status nahi.

| Part | Verified / implemented | Pending |
| --- | --- | --- |
| Hosting | Next.js production deployment on Vercel is READY | Hosting limits/account availability still apply |
| Login | Google/email sign-in and sign-up screens load through Clerk | Full real-user signup/session flow not yet verified; Clerk development mode |
| Database | Live Turso connection/schema initialization passed health check | Two real signed-in users not yet tested end to end |
| Isolation | Verified server identity and owner-scoped queries; local tenant-filter test passed | Not a complete security audit |
| Other login methods | — | Phone, Facebook and GitHub not configured |
| LinkedIn posting | OAuth and approved-post execution code implemented | Connect/verify in the new Vercel workspace |
| Network actions | Optional Unipile integration code implemented | Live messages/invitations/profile edits not connected or verified here |
| Background runner | Two inactive n8n workflow exports and scoped runner authentication | Credentials, current URLs, activation and actual scheduled execution |
| Previous workspace | Previous app remains separate | Old data, tokens, approvals and connections not migrated |

**Full 24/7 LinkedIn automation is not verified active.** App deployment does not itself activate a workflow, provide an AI subscription or grant LinkedIn access.

## Use kaise karna hai

### 1. Account banao

1. [Nexora](https://nexora-agent-ansari-9b3a.vercel.app/) kholo aur **Create account** select karo.
2. Google ya email ka available option choose karo aur Clerk ki required verification complete karo.
3. Agli baar isi identity se sign in karo. Doosra account alag workspace kholega.
4. Password, OTP aur API key chat ya GitHub issue mein mat likho.

Vercel app ke liye ChatGPT sign-in required nahi. Purane Sites workspace ka data naye account mein automatically nahi aata.

### 2. Profile aur settings save karo

- Settings mein naam, services, markets aur follow-up preferences review karo.
- Profile studio mein apna exact LinkedIn profile URL save karo.
- Agent control mein operating rules, limits aur actual connection status dekho.

### 3. Prospect research karo

1. **Prospects** mein exact profile URL, name, company aur available notes save karo; supported CSV bhi import kar sakte ho.
2. Research request karo aur source evidence verify karo.
3. Missing information ko verified mat mark karo. Incomplete research message planning ko block kar sakti hai.
4. Agar task queued/blocked ho, Agent control mein reason dekho. Queue entry completion ka proof nahi.

AI output ke liye configured model service ya working runner chahiye. Repository mein live AI credentials included nahi.

### 4. Message aur follow-up prepare karo

1. Saved prospect par draft tayyar karo.
2. Recipient, research, facts, offer aur tone review karo.
3. **Is project ka operating rule: har LinkedIn post, message, invitation aur profile edit se pehle explicit approval.**
4. Optional provider ke automatic send/invitation switches off rakho jab individual approval required ho. Connector install karna action ki approval nahi.
5. Provider connected na ho to approved text manually use karo; isay Nexora ki execution receipt mat samjho.
6. Actual sent message/reply sahi record karo. Replies, paused contacts aur opt-outs stale follow-ups rokne ke liye use hote hain.

### 5. Post approve aur publish karo

1. Post draft save karo aur **Approvals** mein exact text review karo.
2. LinkedIn section mein correct account, permission aur token expiry verify karo.
3. Exact post approve karo, phir available publishing/scheduling control use karo.
4. Publishing history mein confirmed state aur remote post ID/receipt dekho.

**Draft → approval → queue → confirmed provider receipt.** Timeout ya uncertain outcome par provider result check kiye baghair retry mat karo.

### 6. Client brief aur proposal banao

1. Prospect ke **Requirements** mein campaign details save karo ya private brief link create karo.
2. Link copy karna client ko message nahi bhejta. Intended client ko authorized channel se share karo.
3. Submitted brief review karo, missing details confirm karo aur relevant publisher inventory save karo.
4. Availability, audience, budget, currency, deadline aur margin check karke proposal prepare karo.
5. Brief submission order acceptance ya payment confirmation nahi. Sirf actual evidence par status update karo.

Public inquiry form ko receiving owner workspace ki server configuration chahiye; naya deployment purane owner records automatically import nahi karta.

## Laptop band ho to background kaam kaise chalega?

1. **Agent control → n8n** se apne workspace ka runner credential create karo.
2. Internal/account workflow export n8n Cloud mein import karo. Exports inactive start hote hain.
3. Workflow origin is app ke current URL par set karo; old Sites URLs automatically update nahi hote.
4. n8n Header Auth mein securely set karo: `Authorization: Bearer <runner credential>`.
5. Internal workflow ke AI nodes ki provider credential assign karo.
6. Sirf required scopes enable karo: model processing, approved posting aur network execution separate permissions hain.
7. Pehle manual internal test chalao aur saved result ya legitimate empty-queue outcome check karo.
8. Test ke baad workflow publish karo. Exported schedule har 30 minute, `Asia/Karachi`, hai.
9. Manual click ke baghair actual scheduled run aur matching saved result verify karo. External action test ke liye exact approval aur working integration chahiye.

n8n Cloud laptop ke baghair chal sakta hai, magar subscription/trial, credentials, quotas aur published schedule active hone chahiye. ChatGPT subscription API key ya n8n subscription nahi hai.

## Background architecture

| Component | Role |
| --- | --- |
| Next.js / Vercel | Pages, API routes and execution handlers |
| Clerk | Verified sessions and enabled login methods |
| Turso / libSQL | Persistent SQLite records and atomic batches |
| n8n Cloud — optional | Scheduled authenticated runner calls |
| AI provider — optional | Research/drafts; n8n export uses Gemini, optional server path uses OpenAI |
| Official LinkedIn API — optional | OAuth and exact approved text-post publication |
| Unipile — optional | Provider-supported messages, connections and limited profile edits |

Server identity, owner scope, validation, saved permissions and relevant approvals are checked before execution. No automatic payment verification is implemented.

## Errors aur fixes

| Problem | Check / next step |
| --- | --- |
| Login fail | Correct identity, Clerk configuration, enabled provider aur domain check karo |
| Account khaali | Data separate hai; historical workspace migration pending ho sakti hai |
| Database unavailable | `/api/health`, Vercel function logs aur Turso configuration dekho; data reset mat karo |
| Task queued/blocked | Agent control reason, AI credential, quota, limit aur runner execution dekho |
| n8n nahi chal raha | Published state, current URL, Header Auth, expiry aur node credentials verify karo |
| LinkedIn action nahi hua | Correct account, actual permission, exact approval, due time aur provider connection check karo |
| Timeout/uncertain | Provider result aur saved receipt pehle inspect karo; immediate resend nahi |
| Public inquiry unavailable | Receiving owner workspace configure karo; page ka email alternative use karo |

Keys, tokens, client briefs aur private logs public issues mein post mat karo.

## Developer quick start

Use the Node version compatible with `package.json` and its declared package manager. Vercel currently uses Node 24.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:unit
pnpm build
```

Before `pnpm dev`, configure real development resources and an untracked environment file. Required auth/storage variable names:

```dotenv
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

Do not use placeholder keys or commit values. LinkedIn, AI, owner routing and optional network execution need separate configuration. Existing `.env.example` includes optional/legacy settings; a listed name is not proof that a credential is provisioned.

`lib/runtime.ts` adapts parameterized SQLite queries to libSQL. It initializes bundled migrations on first database use, with a migration ledger inside a write transaction. This does not copy the previous D1 database.

### Verification limits

Migration checkpoint checks: production build, TypeScript, 26 unit tests, local libSQL migration/tenant-filter/atomic-rollback test, live database health, auth-screen rendering and signed-out API rejection passed.

These checks do not prove a completed real-user login, two-user live isolation, scheduled n8n execution or external LinkedIn action. Worker/D1 integration scripts are legacy coverage, not Vercel end-to-end tests.

## More guides

- [Roman Urdu starting guide](START_HERE_ROMAN_URDU.md)
- [LinkedIn setup](LINKEDIN_SETUP.md)
- [Background execution runbook](AUTONOMY_RUNBOOK.md)
- [Audit checkpoint](PROJECT_AUDIT.md)
- [Original repository setup](GITHUB_SETUP.md)
- [Archived Sites/Cloudflare README](docs/LEGACY_SITES_README.md)

Some older guides describe the Sites/Cloudflare deployment. Current README, source and live diagnostics describe the Vercel/Clerk/Turso path; legacy instructions do not establish current activation.
