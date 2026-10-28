# LinkedIn account connection

Nexora uses ChatGPT authentication for workspace ownership. LinkedIn OAuth grants posting access to a separately connected LinkedIn account; it does not replace workspace authentication.

1. Create/select your LinkedIn developer application. Enable **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn**. LinkedIn may require a verified associated company page and product approval.
2. Register the exact HTTPS redirect URL shown in Agent control → LinkedIn connection & publishing. For this Site it is `https://nexora-growth-faizan.taliagranger9.chatgpt.site/api/linkedin/callback`.
3. In the Site's server environment settings, set `LINKEDIN_CLIENT_ID`, secret `LINKEDIN_CLIENT_SECRET`, secret `LINKEDIN_TOKEN_ENCRYPTION_KEY` (32 cryptographically random bytes encoded as base64), and `LINKEDIN_API_VERSION` (a supported YYYYMM version of the Posts API; implementation verified against 202610 documentation). Generate the encryption key securely; do not paste it into chat or source control. Preserve it while accounts are connected; changing it requires reconnection.
4. Deploy those server settings, open Agent control, click **Connect LinkedIn**, and authorize on LinkedIn. Verify the displayed account name. The token stays encrypted server-side and is bound to the workspace owner. Authorization expires; refresh/reconnect is manual.
5. Select a saved post or write exact text, review it, approve it and queue it. Blank date means eligible for the next runner cycle. Use **Publish next due post** to process one immediately; a linked cloud schedule can call the same publishing operation while the Site is closed. The schedule cadence, rather than the queued minute alone, determines actual execution time.

Confirmed publication requires HTTP 201 and LinkedIn's post ID. Unknown outcomes are never retried automatically; inspect LinkedIn first. Disconnecting removes the saved token and cancels queued posts. It does not revoke the app grant inside LinkedIn; revoke that separately in LinkedIn settings if wanted.

The requested `openid profile w_member_social` permissions provide basic member identity and posting. They do not unlock the complete profile, all connections, inbox, automated invitations, or profile editing. The Messages API is partner-restricted and requires a specific member send action; scheduled events do not qualify. These capabilities are visibly blocked, not simulated as successful.

References:
- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages

No real account authorization or publication has been tested yet. Isolated integration tests intercept all LinkedIn network calls and cover state replay, owner isolation, encryption, publication IDs, concurrency, denials, uncertainty and cancellation.
