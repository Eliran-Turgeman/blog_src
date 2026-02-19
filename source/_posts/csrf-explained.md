---
title: "CSRF: The Attack That Rides Your Browser"
date: 2026-02-18 06:55:43
tags:
  - application-security
  - don't get hacked
  - best-practices
  - API
readTime: 8
---

A Twitter thread last week reignited a classic debate: should `/logout` be a GET request? Guillermo Rauch tagged Grok to explain CSRF to the creator of Million.js, who had a GET-based `/signout` route in production. The replies ranged from helpful to confused, which tells you something — CSRF is one of those vulnerabilities that most developers have heard of but few can explain the actual attack mechanics of.

This post breaks down what CSRF is, how an attacker exploits it, why GET endpoints that mutate state are especially dangerous, and what you should actually do about it.

## What CSRF Is

Cross-Site Request Forgery is an attack where a malicious site tricks a user's browser into making a request to a different site — one where the user is already authenticated. The browser attaches cookies automatically, so the target server sees a legitimate session and processes the request.

The key insight: the attacker never sees the response. They don't need to. The damage is the request itself — transferring funds, changing an email address, deleting an account, or logging someone out.

CSRF is not about stealing credentials. It is about borrowing the victim's authenticated session to perform actions they never intended.

## How the Attack Works

Say your app has this endpoint:

```
GET /account/close
```

A user is logged in, their session cookie is set. Now imagine they visit a completely unrelated page — a forum, a blog comment section, an email with embedded HTML — that contains this:

```html
<img src="https://yourapp.com/account/close" />
```

The browser renders the page, sees the `<img>` tag, makes a GET request to `yourapp.com/account/close`, and attaches the user's cookies because the browser sees it as a normal request to a domain where the user has an active session. The server receives a valid authenticated request and closes the account. The user never clicked anything. They never even saw it happen.

This is why GET endpoints that change state are considered broken by design. The HTTP spec itself says GET should be safe and idempotent — it should not trigger side effects. Browsers, crawlers, prefetch mechanisms, and proxies all assume GET requests are safe to issue at any time. When you violate that contract, you create an attack surface that extends far beyond CSRF.

## It Gets Worse with POST — But CSRF Still Applies

Some developers assume switching to POST solves everything. It raises the bar, but it is not sufficient on its own.

An attacker can trigger a POST request from a malicious page using a hidden form with auto-submit:

```html
<body onload="document.forms[0].submit()">
  <form action="https://yourapp.com/account/update-email" method="POST">
    <input type="hidden" name="email" value="attacker@evil.com" />
  </form>
</body>
```

The victim visits the malicious page, the form auto-submits, and the browser sends the POST with cookies attached. If the server has no CSRF protection, it processes the request. The email is changed, password reset follows, account is taken over.

POST makes the attack slightly harder to deliver — you can't embed it in an `<img>` tag — but hidden auto-submitting forms, JavaScript-driven fetches from the attacker's domain (in older configurations), and other vectors still work.

## What Actually Protects You

CSRF protection requires the server to distinguish between requests that originated from its own pages and requests forged from external sites. There are several mechanisms, each with different tradeoffs.

### CSRF Tokens (Synchronizer Token Pattern)

The most established defense. The server generates a unique, unpredictable token per session (or per request) and embeds it in forms and headers. Every state-changing request must include this token. The attacker cannot read the token from another origin (same-origin policy prevents it), so they cannot forge a valid request.

Most server frameworks have this built in:

- Django includes CSRF middleware enabled by default. Forms need `{% csrf_token %}`, and AJAX calls need the token in a header. Skipping it requires an explicit `@csrf_exempt` decorator — a clear signal in code review that something unusual is happening.
- Rails includes CSRF protection by default via `protect_from_forgery`. The token is embedded in forms and verified on every non-GET request.
- Spring Security enables CSRF protection by default for server-rendered applications, generating tokens automatically.
- Express has no built-in CSRF middleware post Express 5, but [`csrf-csrf`](https://github.com/Psifi-Solutions/csrf-csrf) (double-submit cookie pattern) and [`csrf-sync`](https://github.com/Psifi-Solutions/csrf-sync) (synchronizer token pattern) are well-maintained options.

If you are building a server-rendered application, use your framework's built-in CSRF protection. Don't disable it, don't forget it. It exists because this attack keeps happening.

### SameSite Cookies

The `SameSite` cookie attribute tells the browser when to attach cookies on cross-site requests:

- `SameSite=Strict` — cookie is never sent on cross-site requests. Strong protection, but breaks legitimate flows like clicking a link from an email to a logged-in page.
- `SameSite=Lax` — cookie is sent on top-level navigations (clicking a link) but not on cross-origin sub-requests (form posts, image loads, fetches). This blocks the `<img>` and auto-submitting form attacks described above.
- `SameSite=None` — cookie is always sent cross-site. Requires `Secure` flag. Use only when you have a real cross-origin use case.

Modern browsers default to `Lax` when no `SameSite` attribute is specified. This is a meaningful improvement — it means the `<img src="https://yourapp.com/account/close">` attack no longer works with default cookie settings in modern browsers. But relying on browser defaults as your only defense is fragile. Older browsers, WebViews in mobile apps, and certain embedded contexts may not enforce `SameSite` consistently.

Set `SameSite=Lax` explicitly on session cookies as a baseline. Use `Strict` where the UX allows it.

### Origin and Referer Header Validation

The server can check the `Origin` or `Referer` header on incoming requests to verify that the request came from its own domain. If a POST request to `yourapp.com` has an `Origin` of `evil.com`, reject it.

This works as an additional layer but should not be the only defense. Some browsers strip `Referer` headers for privacy, corporate proxies sometimes modify them, and certain request types may not include `Origin` at all.

### For API-Only Backends (SPA + API Architecture)

If your backend is a pure API serving a JavaScript frontend, the threat model shifts. Browsers enforce that cross-origin `fetch()` or `XMLHttpRequest` calls with custom headers (like `Authorization: Bearer ...`) trigger CORS preflight checks. If your API uses token-based auth (JWT in an `Authorization` header) instead of cookies, CSRF is largely mitigated because the attacker's page cannot set custom headers on cross-origin requests.

But — and this is important — if your API uses cookies for authentication (common with `httpOnly` session cookies for SPAs), you are still vulnerable to CSRF and need token-based or `SameSite` protections.

## The Logout Problem That Started This Thread

Back to the original Twitter discussion. Having `/logout` as a GET endpoint is technically a CSRF vulnerability — any page can embed `<img src="https://yourapp.com/logout">` and forcefully log users out. Is this the most dangerous attack? No. Forced logout is annoying, not catastrophic. But it reveals a pattern problem.

If `/logout` is GET, what else is? What other state-changing operations are reachable through simple GET requests? The logout endpoint is the canary. The real risk is the engineering culture that produced it — one where HTTP method semantics are treated as optional and state changes aren't protected.

The fix is simple: make `/logout` a POST (or DELETE) endpoint, protect it with a CSRF token, and move on. In Next.js, this means using a Server Action or an API route handler that only accepts POST. The framework nudges you in this direction, but it won't stop you from creating a `GET` route handler that mutates state.

## Practical Checklist

A few rules that cover most CSRF risk:

**Never use GET for state changes.** Not for logout, not for "quick" admin actions, not for anything that modifies data. This is HTTP semantics, not pedantry.

**Use your framework's built-in CSRF protection.** Django, Rails, Spring, Laravel — they all have it. Turn it on, keep it on. If you're explicitly disabling CSRF middleware, you should have a documented reason.

**Set `SameSite=Lax` (or `Strict`) on all session cookies explicitly.** Don't rely on browser defaults. Make it explicit so it is visible in code review and survives framework upgrades.

**For SPAs consuming APIs with cookie-based auth**, implement CSRF tokens or use the double-submit cookie pattern. Token-based auth (Bearer tokens in headers) sidesteps CSRF but introduces its own storage considerations (don't put JWTs in localStorage if XSS is a concern).

**Validate `Origin` headers** on state-changing requests as a defense-in-depth layer.

## Tooling That Helps

Automated scanning catches many CSRF issues before they reach production:

- [Semgrep](https://semgrep.dev/) — has rules for detecting missing CSRF middleware, `@csrf_exempt` usage, and state-changing GET routes. You can write custom rules targeting your framework's patterns.
- [ZAP (Zed Attack Proxy)](https://www.zaproxy.org/) — OWASP's free security scanner. Its active scan specifically tests for CSRF by submitting forged requests and checking if they succeed. Good for testing deployed applications.
- [Burp Suite](https://portswigger.net/burp) — the industry-standard web security testing tool. Its scanner automatically flags missing CSRF protections and lets you manually craft forged requests to verify exploitability.
- Framework-specific linters — ESLint plugins for Next.js, Django's system checks, Spring Security's debug logging — can surface misconfigurations early.

Run these in CI, not just during occasional security reviews.

## Wrapping Up

CSRF is not a new vulnerability. It has been in the OWASP Top 10 for over a decade, browser vendors have shipped mitigations like `SameSite` defaults, and every major framework has built-in protections. Yet it keeps showing up because developers either disable protections they don't understand, use GET for mutations out of convenience, or assume that cookie-based auth in an SPA is somehow immune.

The Twitter thread that sparked this post is a useful reminder: security mistakes are usually ordinary engineering decisions, not sophisticated oversights. A GET `/signout` route is not a critical vulnerability on its own, but the mindset that produces it — treating HTTP semantics as suggestions and skipping framework-provided protections — is how real breaches start.
