---
title: Threat Modelling for Builders
date: 2026-03-01T15:02:58.000Z
description: "A practical guide to threat modeling: identify what matters, map attack surfaces, estimate exploit difficulty, and prioritize which threats to fix."
tags:
  - application-security
  - don't get hacked
readTime: 13
---

If you asked most builders "what would hurt you most if it got breached?", they would need to think about it. That hesitation usually means the question has never been answered explicitly, and when it has not, security work becomes reactive. You fix whatever the last scan flagged, or whatever the last Hacker News post scared you about, without a clear sense of whether it actually matters for your system.

A threat model is how you answer that question before an incident forces you to. [OWASP frames it](https://owasp.org/www-community/Threat_Modeling) as a structured way to identify and assess threats within the context of protecting something of value, and their four-question framework covers most of what you need: What are we working on? What can go wrong? What are we going to do about it? Did we do a good job? This post walks through building that model for a typical product: identifying what actually matters, mapping your attack surfaces, estimating how easy each one is to exploit, and deciding which threats to address first.

## What you are actually protecting

Every product has a small number of things that would cause real damage if they were lost, leaked, or abused. These are unevenly distributed across your codebase, and some matter far more than others. Getting clear on which is which saves you from the trap of treating everything as equally critical, which in practice means nothing gets properly protected.

For most products, the assets that matter fall into three buckets.

**_User data:_** Email addresses, passwords, and personal information are the obvious ones. But think about what else users hand you: private prompts, uploaded files, generated outputs, usage history. Anything a user would reasonably expect to stay confidential counts here. A breach in this category creates legal exposure, reputational harm, and a trust deficit that compounds over time. The IBM Cost of a Data Breach Report puts the [average breach cost at $4.88M in 2024](https://www.ibm.com/reports/data-breach), with customer churn and regulatory response making up a significant share. That average skews toward large enterprises, but the components (legal fees, notification requirements, lost users) hit smaller teams just as hard with less runway to absorb them.

**_Credentials and credits:_** API keys for model providers, cloud services, payment processors, internal services. These are high-value because they are immediately usable. GitGuardian's 2025 State of Secrets Sprawl report found [23.7 million new secrets in public GitHub commits in 2024](https://www.gitguardian.com/state-of-secrets-sprawl-report-2025), a 25% increase year over year. The scanning that finds them is automated and fast. The window between a push and exploitation can be minutes. Someone who finds an exposed cloud or model-provider key just starts making calls. The result is runaway costs, service suspension, or a chain of secondary compromises if the key grants broad access. For a practical guide on preventing credential leaks and rotating exposed keys, see [A Builder's Guide to Not Leaking Credentials](/2026/02/20/secrets-leaked/).

**_Product integrity and reputation:_** This one is harder to put a number on. If someone can impersonate your service, send emails on your behalf, or manipulate what your product outputs, the damage outlasts the incident itself. For a small product without brand inertia, a single visible compromise can erode user trust faster than any marketing effort can rebuild it. The [2016 Uber breach](https://www.ftc.gov/business-guidance/blog/2018/04/ftc-addresses-ubers-undisclosed-data-breach-new-proposed-order) is an extreme example: the FTC described failures in credential handling and access governance that led to sustained reputational and regulatory fallout, and that was a company with massive brand equity.

These are the assets your security work exists to protect, and the rest of the model flows from understanding them clearly.

## Who is actually attacking you

Builders tend to picture a sophisticated attacker who specifically targets their product. In practice, the overwhelming majority of malicious traffic is automated and untargeted. Cloudflare's 2024 Application Security Report found that [about a third of all traffic they observe is automated, and of that, 93% is not from verified bots and is potentially malicious](https://blog.cloudflare.com/application-security-report-2024-update). The same report observed CVE exploitation attempts starting as fast as 22 minutes after proof-of-concept code was published, with the authors noting that "attackers are going for the easiest targets first."

Bots probe publicly reachable endpoints, test for known weaknesses, and move on. They are looking for patterns (exposed admin panels, default credentials, missing auth checks) that appear across thousands of targets. GitHub's public Events API streams every push event in near-real-time, and credential scanners [poll it continuously](https://docs.github.com/en/rest/activity/events). When a push comes in, they fetch the diff, match against known secret formats, and test discovered credentials automatically.

Because you are defending against volume, a vulnerability that automated tools can discover and exploit in minutes is far more urgent than one requiring insider knowledge or a multi-step chain. Focus on the things that are easy to find and easy to abuse first.

## Mapping your surfaces

You do not need a specialized framework for this. A single honest page beats a detailed diagram nobody maintains.

Start by tracing how data moves through your system. Where does it enter: API endpoints, file uploads, webhooks, form submissions? Where does it get stored: databases, object storage, caches, logs? And where does it leave: API responses, emails, exports, error messages, third-party API calls? Most builders fixate on entry points, but exit points are where information disclosure actually happens. A verbose error message that includes a stack trace or database query is an exit point leaking data. So is a log pipeline that captures full request bodies, including auth headers.

For each of these, mark where trust changes. A trust boundary is anywhere one context hands off data to another with different privileges. The browser to your API is one. Your API to the database is another. Your backend to a third-party API (OpenAI, Stripe, a logging service) is another. Security checks need to happen at every boundary. If you are only validating input at the frontend, you have a trust boundary at the API layer with no enforcement behind it.

Your surfaces include things you do not own. The third-party services your product depends on (hosting provider, CDN, package registries, model API, payment processor, CI/CD pipeline) are all part of your attack surface. A poisoned dependency in your build, a compromised provider credential, or a misconfigured CDN cache that serves one user's response to another are all things you need to account for, even though you did not write them. List these alongside your own components.

Then connect each surface to the assets above. What happens, concretely, if this surface is abused? Can someone read or modify user data through it? Drain credits? Perform actions without authorization? Write the answers down, especially the uncomfortable ones.

For each surface, run through six questions. These come from [STRIDE](https://en.wikipedia.org/wiki/STRIDE_%28security%29), a threat categorization developed at Microsoft, and they catch the categories builders most often overlook:

- Can someone pretend to be another user or service? (Spoofing)
- Can someone modify data in transit or at rest that they should not touch? (Tampering)
- Can someone perform an action and leave no trace? (Repudiation)
- Can someone access data they are not authorized to see? (Information Disclosure)
- Can someone degrade or shut down the service? (Denial of Service)
- Can someone escalate from a low-privilege context to a higher one? (Elevation of Privilege)

You do not need a full STRIDE matrix for every component. Just running these questions against each surface catches threats that a surface-by-surface review alone will miss, especially repudiation and tampering, which builders tend to underweight because they are less visible than a data leak or an outage. If an admin can delete user data in your system and there is no audit log recording who did it, that is a repudiation gap. If your webhook handler processes payloads without verifying the sender's signature, that is a tampering exposure.

The last piece is estimating difficulty. For each exposure, ask: how easy would this be for someone with zero knowledge of my system? Would they need to guess a URL? Steal a session token? Or just call a public endpoint with no auth check?

A one-liner per surface keeps this practical:

> If **[surface]** is abused, an attacker could **[impact]** by **[method]**, and this would require **[difficulty level]**.

For example:

> If the `/api/generate` endpoint is abused, an attacker could drain model credits by calling it at high volume, and this would require only a valid auth token from a free-tier account.

> If the file upload endpoint is abused, an attacker could access other users' uploads by enumerating predictable S3 keys, and this would require only knowledge of the URL pattern.

You will end up with a short, imperfect map, and that is fine. Completeness is less important than honesty about where the easy wins are for an attacker.

## Putting it together

To make this concrete, here is what a threat map might look like for a product that wraps an LLM API. Say a tool that lets users upload documents and ask questions about them. It has a React frontend, a Python backend, Stripe for billing, an S3 bucket for uploads, and calls OpenAI's API.

| Surface | Asset at risk | What happens if abused | Difficulty | Mitigation |
|---|---|---|---|---|
| `POST /api/chat` | Credits (OpenAI tokens) | Attacker calls at high volume from free-tier accounts, draining your API budget | Low: requires only signup and a valid session | Per-account and per-IP rate limiting on token-consuming routes; budget alerts with automatic throttling; consider requiring email verification before granting API access |
| `POST /api/upload` | User data (uploaded files) | Attacker uploads malicious files that get processed unsanitized, or enumerates other users' uploads if object keys are predictable | Medium: needs knowledge of key pattern, or low if keys use `user_id/filename` | Validate MIME type and file signature server-side; use opaque object keys (UUIDv4); store in private buckets; serve through short-lived signed URLs |
| `GET /api/documents/:id` | User data | IDOR: changing the document ID returns another user's files if the endpoint lacks ownership checks | Low: sequential IDs make this trivial | Enforce ownership at query time (`WHERE doc.owner_id = authenticated_user_id`); use UUIDs instead of sequential IDs; log and alert on authorization denials |
| `POST /webhook/stripe` | Product integrity (billing state) | Forged webhook grants premium access or credits without payment if signature verification is missing | Low: endpoint URL is guessable, payload format is [documented by Stripe](https://docs.stripe.com/webhooks) | [Verify Stripe webhook signatures](https://docs.stripe.com/webhooks/signatures) before any side effects; reject on mismatch; use idempotency keys to prevent replay |
| S3 bucket | User data (all uploaded documents) | Public or enumerable bucket exposes every file ever uploaded | Low if bucket is public; medium if keys are predictable and bucket allows authenticated reads | Block public access at the bucket level; use opaque keys; serve files only through signed URLs generated by your backend; enable access logging |
| `/admin` or internal dashboard | Credentials, user data | Full access to user data, configuration, and potentially secrets if admin panel is exposed without auth or uses weak credentials | Low if no auth; medium if behind basic auth with a weak password | Do not expose admin to the public internet; bind to internal network or VPN; require MFA; if it must be public, strong auth plus IP allowlisting |
| Environment variables / `.env` in repo | Credentials (all of them) | Attacker gets OpenAI key, Stripe secret, database URL. Full compromise | Low if committed to a public repo; automated scanners will find it in [minutes](https://www.gitguardian.com/state-of-secrets-sprawl-report-2025) | Run [gitleaks](https://github.com/gitleaks/gitleaks) in CI on every PR; add `.env` to `.gitignore` before first commit; use a secret store (Secrets Manager, Vault, Doppler) for production credentials; rotate anything that may have been exposed |

Reading this table, the priorities become obvious. The `/api/chat` endpoint and the Stripe webhook are both low-difficulty, high-impact surfaces, so they belong at the top of the list. The IDOR on document retrieval is equally urgent because it directly leaks user data with minimal effort. The S3 bucket configuration is a quick check that either confirms you're fine or reveals a serious problem. The admin panel and secret scanning are foundational hygiene.

Your product's table will look different, but the exercise is the same: list everything reachable, connect it to what matters, and be honest about how easy each attack would be. The items at the top-left of the difficulty/impact matrix are where your first week of security work should go.

## Deciding what to do about it

Once you have your map, the instinct is to start fixing everything, but not every threat calls for a code change. There are four responses to a threat, and only one of them involves writing code.

**Mitigate:** add a control that reduces the likelihood or impact. Rate limiting, input validation, encryption at rest. This is the default response, and it is appropriate for most items on your list.

**Eliminate:** remove the surface entirely. If you have an admin panel that nobody uses, take it offline. If a feature exposes a large attack surface for marginal user value, cut it. This is the most effective response and the least popular one, because builders are reluctant to remove things they built.

**Accept:** document the risk and move on. Some threats are low-likelihood and the cost of mitigating them exceeds the realistic damage. The key is making this a deliberate, recorded decision rather than a gap nobody noticed. Write down what the risk is, who accepted it, and when you will revisit it. A risk that nobody explicitly chose to accept is just a gap in your model.

**Transfer:** shift the risk to someone else. Cyber insurance covers some financial exposure. Using a managed database instead of running your own transfers operational security to the provider. Terms of service can transfer certain liabilities to users, though this has limits and varies by jurisdiction.

Most items on your threat map will land on "mitigate," and that is fine. But having the other three in your vocabulary prevents the trap of treating every threat as a coding task.

## The output

When you are done, you should have a one-page document that answers three questions:

1. What you cannot afford to lose.
2. Where those things are exposed.
3. Which exposures would be found and exploited first.

Everything downstream (what to harden, what to monitor, what to fix this week) flows from those answers. For a concrete checklist to act on, see [A Practical Security Audit for Builders](/2026/02/14/quick-security-audit/). The page gives you a way to make tradeoffs deliberately and explain them to your team, instead of drifting toward whatever feels urgent or whatever the last blog post you read was about.

This document needs regular upkeep to stay useful. Review it when you add a new integration, expose a new endpoint, or change how data flows through the system. A quarterly check (does this still reflect what we actually run?) takes thirty minutes and catches drift before it turns into a blind spot. [OWASP's process guidance](https://owasp.org/www-community/Threat_Modeling_Process) frames this as a separate step: assess your work. Are the controls you listed actually implemented, or just planned? A threat model that describes intended mitigations without tracking their status is a wishlist.

The best forcing function is to make it part of how you build. When a new feature or integration is being designed, the question "what row does this add to our threat map?" takes ten seconds to ask and occasionally prevents weeks of cleanup later.
