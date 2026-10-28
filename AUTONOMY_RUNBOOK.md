# Nexora autonomous internal workflow

This is a private, owner-scoped Site. Keep its audience owner-only. The hosted `/mcp` tools expose only internal workflow operations, not LinkedIn account access.

## Recurring run
1. Call `nexora_status`. Stop if the agent is disabled. Read the configured markets, services and limits.
2. Call `nexora_prepare_work`. Repeated calls are deduplicated.
3. Claim at most two tasks per scheduled run using `nexora_claim_work`. Stop when no task is returned or the daily limit is reached.
4. Perform only the returned job using its instructions, exact target and output schema. Use public web search and source pages for discovery/research. Do not merge similarly named people. Do not assume a prospect needs services or is a buyer. A source that cannot be accessed stays unknown.
5. Complete using `nexora_complete_work` with the job ID, returned lease and structured result. If blocked, provide an empty result and an explicit blocker. Do not report success merely for calling a tool.
6. Read `nexora_status` to confirm persisted results and alerts. Summarize actual new opportunities and blockers to the owner. Do not send messages to prospects or publish content.

The worker can run these tasks through ChatGPT's hosted agent tools without the user-pasted API key. A separate server-side Responses adapter is included, but requires a securely provisioned key and a model before it can run. The exposed key in the conversation must not be used, tested, placed in source, written to an env file or forwarded to a tool.

## Task semantics
- `discover`: At most three new prospects per day by default. Exact public LinkedIn profile and company sources required. These are candidates, not verified buyers.
- `research`: Exact-profile identity, substantive profile access and an observation citation are required for automatic draft eligibility. An inaccessible profile remains blocked.
- `first_message` / `followup`: Save a contextual draft. Never mark it sent.
- `reply`: Analyze an actual recorded inbound message; extract only expressly stated requirements, preserve unknowns and stop on opt-outs. Newer replies invalidate an older claimed task. Acceptance is not a confirmed order or payment.
- `proposal`: Complete with an empty result. The server matches actual confirmed inventory and builds the client copy without revealing costs.
- `profile_audit`: Only supplied sections can be reviewed. Save suggestions; do not claim live account edits.
- `content`: Uses an approved campaign brief; saves a draft, not a published post.

## Execution controls
Daily task budget defaults to 6, using Asia/Karachi days. Each job has an exclusive 15-minute claim. Completing a job is a compare-and-swap operation and rejects replay. Record changes use optimistic concurrency checks. Invalid results, missing access and suppression are explicit blockers. Internal proposal and content IDs are deterministic per job.

## Integration boundary
LinkedIn inbox, connection listing/sending, profile editing and posting are not connected. An OpenAI key does not grant these scopes. Do not substitute scraping, browser-account automation or invented account state for a missing authorized integration. External-action jobs are blocked.

## Verification
`node --test tests/engine.test.mjs tests/autonomy.test.mjs`
`node node_modules/typescript/bin/tsc --noEmit`
Build with the Sites helper, then `node tests/runtime.integration.mjs` for an isolated Worker + D1 + MCP workflow test. Disposable integration fixtures are not production client records. Do not use the exposed credential in a smoke test.

## Approved LinkedIn publication
After internal work, read nexora_linkedin_status. If the tool is available and the account can publish, call nexora_run_due_posts once. It can only publish the exact snapshot already approved by the owner in the UI, at or after its scheduled time. Read status again. Never requeue blocked/uncertain posts, never infer publication without remoteId, and never use this to send messages, invite connections or edit a profile. If these tools are unavailable, report publishing runner unavailable rather than use a browser workaround.
