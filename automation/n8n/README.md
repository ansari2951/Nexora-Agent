# Nexora n8n starter — 27 October 2026

This starter processes at most two **internal** Nexora tasks per run. It saves drafts/research through the existing validated task queue; proposals use confirmed publisher inventory on the server. It does not send emails or LinkedIn messages, invite/accept connections, change profiles, publish posts, accept orders or verify payments. Existing approval-based posting remains separate.

## 1. Start your n8n instance

If n8n already runs, keep that instance and import only the workflow JSON.

For a new local instance, open Docker Desktop. Extract this folder, open PowerShell in it, and run:

```powershell
docker compose up -d
```

Open http://localhost:5678 and finish the owner-account setup yourself. Keep the named volume: it stores workflow data and credential encryption material. Do not run `docker compose down -v` unless you intend to erase it. The editor is bound to your own computer only. You do not need a public tunnel for this polling workflow. Laptop off/asleep means the workflow stops; use an always-on host for continuous operation. This compose file is for local use; remote hosting needs HTTPS, backups and access configuration.

## 2. Import and connect

1. Import `nexora-n8n-workflow.json` in n8n.
2. Sign in to Nexora → Agent control → n8n workflow connection.
3. Create a runner credential. It is shown once, expires in 90 days, is hashed in Nexora and can be revoked. Replacing it pauses the runner and invalidates the old token.
4. In n8n create **Header Auth** named `Nexora internal runner`: Name `Authorization`, Value `Bearer YOUR_RUNNER_TOKEN`.
5. Assign it to **Claim 1**, **Save result 1**, **Claim 2**, **Save result 2**, **Verify runner**.
6. Create a separate Header Auth named `Google AI`: Name `x-goog-api-key`, Value your Gemini API key. Assign it to **Gemini 1** and **Gemini 2**. Do not paste either secret into code, exported JSON or chat.
7. Check the Gemini model in both nodes against your provider account. The prepared request uses the documented Interactions API and `gemini-3.8-flash`; model access, grounding, quotas and billing need a live check. No model API call has been made on your behalf.
8. In Nexora enable model processing (task context is shared with your configured model provider), then enable the runner. Agent control must also be enabled.
9. Run **Manual test**. Confirm `Verify runner` and check the completed/blocked job plus approval/alert in Nexora. Empty queue is healthy idle.
10. Publish/activate the workflow only after the live test. Its timer is every 30 minutes, PKT, with at most two internal tasks/run and Nexora's saved daily task limit.

## Failures and boundaries

- Authentication error: check runner expiry, revocation and credential assignment. No secrets in URLs.
- AI error/quota/malformed JSON: workflow blocks the claimed task with a concrete reason; review the task. HTTP automatic retries are disabled.
- Failed/uncertain save: inspect Nexora before rerunning; the existing exclusive lease and completion guard prevent duplicate completion. Do not assume an n8n node succeeded from its name alone.
- Pause Nexora agent or the n8n runner to stop new work. A paused runner does not commit output. Disable the n8n workflow separately if you no longer want timer checks.
- Keep execution data private; this export disables saved successful/error/manual execution data. Manual previews still expose task context to the authenticated n8n editor.
- Research output is evidence-limited. Google Search grounding can be absent; an unavailable exact profile must remain unknown, never fabricated.
- Real client recommendations, actual rates, client permission and payment receipts must come from real evidence.
- n8n Community can be self-hosted free; AI, search grounding, server and email services may have separate quotas/costs.

## Verification performed in development

See `tests/n8n.integration.mjs` and `tests/n8n-workflow.test.mjs` in Nexora source. Build and isolated DB tests cover authentication, workspace separation, token hashing, pause/revoke/expiry, exclusive leases, no external execution and saved approvals. Import into your actual n8n instance and the AI credential request remain to be tested.

## Official references

- https://docs.n8n.io/integrations/builtin/credentials/httprequest/
- https://docs.n8n.io/hosting/installation/docker/
- https://ai.google.dev/gemini-api/docs/text-generation
- https://ai.google.dev/gemini-api/docs/google-search

## Optional separate LinkedIn execution workflow (v19)

Import `nexora-n8n-accounts.json` separately. It is inactive by default. Assign the Nexora Header Auth credential to both HTTP nodes. In Nexora → Agent control → n8n, independently allow posting and/or network execution:

- **Posting** can use the existing posting connection. It publishes at most one due owner-approved scheduled post per cycle. It cannot approve a draft.
- **Network** requires an actual connected/enabled provider and saved per-feature rules. No-paid-provider mode must be deliberately turned off before provider execution. A runner checkbox does not connect Unipile. It syncs at most one connection page and executes at most one eligible account action per cycle. Supported headline/About edits require exact approval; this does not support every profile section.
- The workflow verifies actual saved receipts after execution and has no automatic retries. Unknown results must be checked on the account before any further action.
- Replacing a token clears both execution scopes. Revocation removes runner access. The original internal workflow remains separate.

For live activation, the n8n editor URL/access, securely stored AI credentials, and actual provider authorization are still required. No new paid provider subscription is created by these files.
