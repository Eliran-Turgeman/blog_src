---
title: CSRF for Builders
date: 2026-02-18T06:55:43.000Z
tags:
  - application-security
  - don't get hacked
  - best-practices
readTime: 6
---

If your `/logout` route is a GET endpoint, any website on the internet can log your users out by embedding `<img src="https://yourapp.com/logout">` in their page. The user's browser sends the request with cookies attached, and your server happily ends their session.

That's CSRF (Cross-Site Request Forgery). And logout is the least dangerous version of it.

This came up on X last week when Guillermo Rauch (vercel CEO) asked Grok to explain the problem to Aiden Bai, who had a GET-based `/signout` in production:

{% raw %}
<blockquote class="twitter-tweet"><p lang="en" dir="ltr"><a href="https://twitter.com/grok?ref_src=twsrc%5Etfw">@grok</a> explain CSRF to Aiden and why /logout should never be a GET. Also explain how this is actually difficult to implement in Next and how the framework guides you out of this pattern. Finally, explain why chasing clout this way is not a good idea</p>&mdash; Guillermo Rauch (@rauchg) <a href="https://twitter.com/rauchg/status/2023456541630996501?ref_src=twsrc%5Etfw">February 16, 2026</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
{% endraw %}

The rest of this post covers the actual attack mechanics, why POST alone doesn't fix it, and what does.

## What CSRF Is

Cross-Site Request Forgery is an attack where a malicious site tricks a user's browser into making a request to a different site - one where the user is already authenticated. The browser attaches cookies automatically, so the target server sees a legitimate session and processes the request.

The attacker never sees the response, and they don't need to. The damage is the request itself: transferring funds, changing an email address, deleting an account, logging someone out.

## How the Attack Works

Say your app has this endpoint:

```
GET /account/close
```

A user is logged in, their session cookie is set. Now imagine they visit a completely unrelated page (a forum, a blog comment section, an email with embedded HTML) that contains this:

```html
<img src="https://yourapp.com/account/close" />
```

The browser renders the page, sees the `<img>` tag, makes a GET request to `yourapp.com/account/close`, and attaches the user's cookies because the browser sees it as a normal request to a domain where the user has an active session. The server receives a valid authenticated request and closes the account. The user never clicked anything. They never even saw it happen.

This is why GET endpoints that change state are considered broken by design - the HTTP spec itself says GET should be safe and idempotent (it should not trigger side effects). Browsers, crawlers, prefetch mechanisms, and proxies all assume GET requests are safe to issue at any time.

## POST Doesn't Solve This

Some developers assume switching to POST solves everything. It raises the bar, but it is not sufficient on its own.

An attacker can trigger a POST request from a malicious page using a hidden form with auto-submit:

```html
<body onload="document.forms[0].submit()">
  <form action="https://yourapp.com/account/update-email" method="POST">
    <input type="hidden" name="email" value="attacker@evil.com" />
  </form>
</body>
```

The victim visits the malicious page, the form auto-submits, and the browser sends the POST with cookies attached. If the server has no CSRF protection, it processes the request.

You can't embed a POST in an `<img>` tag, but as shown above, a hidden auto-submitting form is four lines of HTML. The effort difference for an attacker is negligible.

## What Actually Protects You

CSRF protection requires the server to distinguish between requests that originated from its own pages and requests forged from external sites. There are several mechanisms, each with different tradeoffs.

### CSRF Tokens (Synchronizer Token Pattern)

The most established defense. The server generates a unique, unpredictable token per session (or per request) and embeds it in forms and headers. Every state-changing request must include this token. The attacker cannot read the token from another origin (same-origin policy prevents it), so they cannot forge a valid request.

Most server frameworks ship CSRF protection enabled by default. Django, Rails, Spring Security, Laravel all generate and verify tokens automatically on state-changing requests. Check your framework's documentation and verify that CSRF protection is actually active in your setup.

### SameSite Cookies

The `SameSite` cookie attribute tells the browser when to attach cookies on cross-site requests:

- `SameSite=Strict`: cookie is never sent on cross-site requests. Strong protection, but breaks legitimate flows like clicking a link from an email to a logged-in page.
- `SameSite=Lax`: cookie is sent on top-level navigations (clicking a link) but not on cross-origin sub-requests (form posts, image loads, fetches). This blocks the `<img>` and auto-submitting form attacks described above.
- `SameSite=None`: cookie is always sent cross-site. Requires `Secure` flag. Use only when you have a real cross-origin use case.

Modern browsers default to `Lax` when no `SameSite` attribute is specified. This is a meaningful improvement. The `<img src="https://yourapp.com/account/close">` attack no longer works with default cookie settings in modern browsers. But relying on browser defaults as your only defense is fragile. Older browsers, WebViews in mobile apps, and certain embedded contexts may not enforce `SameSite` consistently.

Set `SameSite=Lax` explicitly on session cookies as a baseline. Use `Strict` where the UX allows it.

### For API-Only Backends (SPA + API Architecture)

If your backend is a pure API serving a JavaScript frontend, the threat model is different. Browsers enforce that cross-origin `fetch()` or `XMLHttpRequest` calls with custom headers (like `Authorization: Bearer ...`) trigger CORS preflight checks. If your API uses token-based auth (JWT in an `Authorization` header) instead of cookies, CSRF is largely mitigated because the attacker's page cannot set custom headers on cross-origin requests.

If your API uses cookies for authentication (common with `httpOnly` session cookies for SPAs), you are still vulnerable to CSRF and need token-based or `SameSite` protections.

## Quick Reference

If you take nothing else from this post:

1. No GET mutations. Ever.
2. Use your framework's CSRF protection. Don't disable it without a documented reason.
3. Set `SameSite=Lax` explicitly on session cookies.
4. Cookie-based auth on an SPA? You still need CSRF tokens.

Also, use tooling that can help like [Semgrep](https://semgrep.dev/). It catches static patterns in your code: missing CSRF middleware, `@csrf_exempt` decorators, etc. It has rules for common frameworks and you can write custom ones. Run it in CI on every pull request.

---

The X thread that sparked this post is a useful reminder: every major framework ships CSRF protection by default, browsers default to `SameSite=Lax`, and the tooling exists. CSRF keeps happening because developers disable protections they don't understand, use GET for mutations out of convenience, or assume their SPA architecture makes them immune.
