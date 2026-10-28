# Nexora source handover

Source snapshot: published Sites version 20, 28 October 2026.

This repository contains application source, API routes, D1 migrations, n8n exports, tests and operating guides. It does not contain the live database, access tokens, API keys, provider sessions, node_modules or generated build output.

## Start here
- README.md: architecture and feature scope
- START_HERE_ROMAN_URDU.md: usage
- DEVELOPER.md: hosting/build setup
- LINKEDIN_SETUP.md: official posting configuration
- AUTONOMY_RUNBOOK.md: internal background processing
- automation/n8n/README.md: workflow import and credentials
- /system on the hosted application: read-only live diagnostics and troubleshooting

## Deployment boundary
The app currently depends on Sites-provided authenticated identity headers and Cloudflare Workers/D1. Copying it to GitHub does not deploy it or create authentication. An external deployment must replace or reproduce a trusted identity boundary; never trust client-supplied identity headers on a publicly reachable origin. Direct Google, Facebook, GitHub OAuth and phone OTP are not configured. The optional phone field is private contact information, not an authentication method.

## Latest verified state
- Login/signup, contact-phone validation and persistence, private diagnostics and troubleshooting were implemented.
- Production build, built-worker integration checks, and 17 workflow/rules tests passed.
- Official LinkedIn posting permission was connected and one earlier publication receipt was recorded.
- Both workflows were imported into nexoraaiagent.app.n8n.cloud; runner permission was enabled. Credential mapping, a new scheduled execution and end-to-end background proof remain pending.
- Unipile network/provider connection was not configured. Messages, invitations and profile edits are not verified active.
- Optional OpenAI server credential was not configured. Gemini credential and model access must be tested in n8n.

## Secrets and access
Configure credentials only in hosting runtime secrets and n8n Credentials, never source or workflow JSON. Required setup names are documented in the setup guides. Keep exact owner approval for LinkedIn posts, messages, invitations and profile edits unless the owner explicitly changes that requirement. Do not enable standing auto-send rules just because the source implements them.

This repository is a source backup and development project, not proof of full automation activation.
