# Nexora — LinkedIn Growth & Sales

Yeh private working workspace hai. Is version mein profile text, connections, research evidence, drafts, conversation history, publisher rates, proposals aur order/payment records database mein save hote hain.

## Shuru kaise karein
1. Private link kholein aur apne ChatGPT account se sign in karein.
2. Profile studio mein apni current headline, About, experience, Featured aur posts ka text paste karein. Proposed text ko review karke save karein. LinkedIn par changes aap khud apply karte hain.
3. Prospects mein Add prospect karein ya apna official LinkedIn CSV export import karein. CSV template bhi download kar sakte hain. Import initial snapshot hai, live LinkedIn sync nahi.
4. Exact profile ka context, role, company aur source URL dalein. Ek actual observation likhein aur source check karne ke baad verification checkbox select karein.
5. Messages mein Guided draft input se rule-based draft banata hai. Yeh AI research ka claim nahi karta. Draft copy karke LinkedIn par khud send karein; phir actual sent message record karein.
6. Client reply exact paste karke Record reply karein. Is se no-reply follow-ups band ho jate hain. Do-not-contact permanent suppression hai.
7. Requirements mein actual budget, target audience, quantity/scope aur deadline collect karein. Interest, accepted quote, confirmed order aur verified payment alag stages hain.
8. Publishers mein apni real inventory add karein. Proposal matching ke liye availability 30 din ke andar confirmed, currency/audience/niche/budget aur minimum margin match hona zaroori hai. Client export mein private cost nahi hoti.
9. Content studio mein posts draft aur save karein. Planned time sirf planning hai; LinkedIn native scheduler par actual schedule karein.

## AI connection
Optional AI research, profile review, content aur reply generation ka server adapter source mein included hai, live tested nahi. Yeh tab tak active nahi hota jab tak server par OPENAI_API_KEY aur OPENAI_MODEL configure na hon. Current version ChatGPT-assisted mode use karta hai; separate automatic API generation active nahi. API key browser, chat text, source repository ya is workspace mein paste na karein. AI provider usage ka separate cost ho sakta hai. Is build mein live provider call verify nahi hui.
Copy research/review/content brief ko ChatGPT mein use karna bhi available hai. AI output owner review ke baghair verified observation nahi banta. Web sources clickable show hote hain.

## Profile access ka actual result
User-supplied URL: https://www.linkedin.com/in/faizan-seo-outreach/
Date: 22 October 2026.
Public fetch failed (DisabledError); exact URL ka indexed verified content search mein nahi mila. Similar-name profiles exclude ki gayi hain. Current headline, experience, posts, connections count, endorsements aur account active/restricted status verify nahi hue. Prefilled proposed headline/About user ke described services par based hain, existing profile ke audit findings nahi.

## Included / pending
Working foundation: account-isolated persistent records, CSV import, evidence gates, guided drafts, sent/reply logging, business-day follow-up queue, publisher matching, client proposal export, manual order/payment tracking, content library, private backup export.
Pending connection: live AI provider; LinkedIn account/API integration; automatic external messaging, account edits, connection sending and native post publishing; unattended background discovery/notifications; payment gateway; client login/order portal. In cheezon ko connected ya running nahi dikhaya gaya.

## Developer commands
Use Node 22+. Dependencies and lifecycle use the Sites helpers documented in the skill. Tests: node --test tests/engine.test.mjs. Built Worker integration checks: node tests/runtime.integration.mjs (build first). Type check: node node_modules/typescript/bin/tsc --noEmit. Schema: npm run db:generate. Local migration/build follow the starter notes in DEVELOPER.md.
