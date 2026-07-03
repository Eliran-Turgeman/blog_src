---
title: How Attackers Drain Your Cloud Budget
date: 2026-03-21 10:19:11
description: >-
  How cost amplification attacks work, why rate limits alone are not enough, and
  how to defend cost-triggering endpoints against automated abuse.
tags:
  - application-security
  - don't get hacked
readTime: 8
keywords:
  - cost amplification attack
  - cloud budget security
  - rate limiting
  - usage quotas
  - denial of wallet
  - API abuse
  - cloud cost attack
faq:
  - q: "What is a cost amplification attack?"
    a: "An attacker calls an endpoint where each request triggers an expensive backend operation (LLM inference, SMS delivery, image processing) at a cost that is absorbed by the service operator, not the caller. A modest volume of requests can generate a disproportionately large bill."
  - q: "Why are rate limits not sufficient to prevent cost attacks?"
    a: "Rate limits cap requests per time window, but they do not cap total consumption. An attacker staying just under the rate limit, or rotating across many accounts, can still accumulate significant cost over hours or days. Usage quotas that cap total spend per user per billing period are needed alongside rate limits."
  - q: "How do attackers exploit free tiers for cost abuse?"
    a: "They create throwaway accounts, consume expensive operations up to the free tier limit, abandon the account, and repeat. Email verification alone is usually weak friction for this pattern, so the important control is a tight allowance on the expensive action itself."
  - q: "What is the difference between a billing alert and a spending cap?"
    a: "A billing alert notifies you after a threshold is crossed, but does not stop spending. A hard spending cap enforces a maximum at the infrastructure or application level by rejecting or queuing requests once the limit is reached, preventing further cost accumulation."
---

You add a paid feature to your product. It might summarize text, send a verification code, transcode a video, or OCR a document. The HTTP request looks ordinary, but the route fans out into model tokens, SMS charges, or minutes of worker time, and a weekend of unexpected traffic turns into a bill you did not plan for.

What makes these endpoints dangerous is that the expensive part usually sits behind your controller. The request is cheap to send, but costly to serve. That gap creates its own attack surface, which is the same framing that matters in [Threat Modelling for Builders](/2026/03/01/threat-model/). The rest of this post walks through five ways cost-triggering features get abused in practice, and the controls that keep each one bounded.

## Directly expensive routes

Some endpoints are expensive one request at a time. LLM summarization, image generation, transcription, and geocoding all fit this pattern. The attacker does not need an exploit in the usual sense. They only need a cheap way to keep reaching the paid operation.

```python
import concurrent.futures
import requests

url = "https://yourapp.com/api/summarize"
payload = {"text": "A" * 16000}

def call_endpoint(_):
    requests.post(url, json=payload)

with concurrent.futures.ThreadPoolExecutor(max_workers=50) as pool:
    pool.map(call_endpoint, range(2000))
```

If the downstream model call costs one cent, 2,000 requests cost you $20, and the real problem is that a cheap script can keep running, can spread across accounts, and can keep charging your account while you're asleep.

The fix belongs at the endpoint boundary. Reject oversized input first, rate-limit bursts, consume quota before the paid call, and emit cost telemetry early enough that cloud or application alerts fire before one bad hour becomes an all-weekend incident.

```python
def summarize(request, account):
    text = request.json["text"]

    if len(text) > 12000:
        return Response({"error": "input too large"}, status=413)

    estimated_tokens = estimate_tokens(text)
    estimated_cost = estimate_llm_cost(text)

    if not rate_limit_ok(account.id, feature="summarize", per_minute=10):
        return Response({"error": "too many requests"}, status=429)

    if not consume_quota(account.id, feature="summarize", units=estimated_tokens):
        return Response({"error": "quota exceeded"}, status=429)

    record_estimated_cost(
        account_id=account.id,
        feature="summarize",
        estimated_cost_usd=estimated_cost,
    )

    return Response({"summary": llm_summarize(text)})
```

Authentication helps, but it does not solve this by itself. Free accounts, trial accounts, and stolen credentials all reach the same paid code path. The control that matters is the allowance attached to the feature.

## Free-tier farming

Free tiers create a different problem from burst abuse. The attacker does not need high request volume and does not need to bypass authentication. They create an account, use the expensive feature up to the allowance, discard the account, and repeat.

Rate limits do not solve that pattern because the attacker can stay well under them. What matters here is a hard allowance on the paid feature, especially for new accounts.

```python
def summarization_limit_for(account):
    if account.plan != "free":
        return 50000
    if account.age_days < 7:
        return 5000
    return 15000

def summarize(request, account):
    estimated_tokens = estimate_tokens(request.json["text"])
    daily_limit = summarization_limit_for(account)

    if not consume_quota(
        account.id,
        feature="summarize",
        units=estimated_tokens,
        daily_limit=daily_limit,
    ):
        return Response({"error": "quota exceeded"}, status=429)

    return Response({"summary": llm_summarize(request.json["text"])})
```

The practical rule is to start small and raise the ceiling only when the account has earned more trust. A payment method, a history of normal product usage, or a plan upgrade are all stronger signals than a low-friction signup step. Rate limits still matter, but free-tier abuse is mostly an allowance problem.

## Messaging fraud

Verification and notification routes look harmless because the payload is tiny. A phone number goes in, a code goes out, and the request finishes quickly. Behind that route, though, each request can trigger a telecom charge. Twilio publishes SMS pricing by region ([Twilio SMS pricing](https://www.twilio.com/en-us/sms/pricing/us)), and Lime describes cutting SMS pumping costs after mitigation ([Twilio customer story: Lime](https://customers.twilio.com/en-us/lime)).

The attack pattern is usually called SMS pumping: automated traffic repeatedly triggers paid messages, often against new accounts and verification flows. If your product only serves a narrow geography or does not need repeated sends right after signup, those constraints should exist in code.

```python
ALLOWED_COUNTRIES = {"US", "CA"}

def send_login_code(request, account):
    phone = normalize_phone(request.json["phone"])

    if country_for(phone) not in ALLOWED_COUNTRIES:
        return Response({"error": "unsupported region"}, status=403)

    if not rate_limit_ok(account.id, feature="login-code", per_hour=3):
        return Response({"error": "too many requests"}, status=429)

    if not consume_quota(account.id, feature="login-code", units=1, daily_limit=3):
        return Response({"error": "quota exceeded"}, status=429)

    send_sms(phone, build_login_message())
    return Response(status=204)
```

This route stays simple on purpose. It does not try to predict fraud perfectly. It limits what a new account can spend, restricts regions if the product only operates in a few of them, and forces repeated sends to stop before the telecom bill grows.

## Replays and duplicate jobs

Cost-triggering work often starts at a webhook or in a queue instead of a public product endpoint. A payment event arrives, your system generates an invoice PDF, emails a customer, and writes records. If the event can be replayed, or if the job retries without idempotency, the same paid work happens more than once. For the broader webhook boundary, sender verification, and replay problem, see [A Practical Security Audit for Builders](/2026/02/14/quick-security-audit/).

Stripe recommends verifying webhook signatures before you trust the event ([Stripe webhook signatures](https://docs.stripe.com/webhooks/signature)). That is only part of the fix. You also need an idempotency check before any expensive side effect starts.

```python
def handle_webhook(request):
    if not verify_stripe_signature(request):
        return Response(status=400)

    event = parse_event(request)

    if already_processed(event.id):
        return Response(status=200)

    mark_as_processing(event.id)
    generate_invoice_pdf(event.data)
    send_confirmation_email(event.data)
    mark_as_processed(event.id)
    return Response(status=200)
```

The same rule applies in workers. Deduplicate jobs, cap retries, and stop treating every retry as permission to repeat paid side effects.

```python
def process_invoice_job(job):
    if already_processed(job.event_id):
        return

    if job.retry_count > 3:
        move_to_dead_letter(job)
        return

    generate_invoice_pdf(job.payload)
    mark_as_processed(job.event_id)
```

Without those checks, a retry storm or replayed event stops being only an operational problem and starts spending money.

## Small inputs that become large jobs

Some routes are cheap on the wire but expensive after parsing. A scanned PDF can trigger OCR on hundreds of pages, a short uploaded video can fan out into multiple renditions and thumbnails, and a user request that looks small at the edge can turn into a long worker job after it enters your pipeline. This is the same pattern as a zip bomb in upload security, but expressed as spend instead of memory pressure, so the thing to budget is the expanded work, not just the upload size. The upload version of that failure mode is covered in [How to Not Get Hacked Through File Uploads](/2026/03/14/uploads-attack-surface/).

```python
def convert_pdf(request, account):
    file = request.files["file"]
    page_count = count_pdf_pages(file)

    if page_count > 50:
        return Response({"error": "file too large"}, status=413)

    estimated_units = page_count * 2 if needs_ocr(file) else page_count

    if not consume_quota(account.id, feature="pdf-convert", units=estimated_units):
        return Response({"error": "quota exceeded"}, status=429)

    enqueue_unique_job("pdf-convert", account.id, file.sha256)
    return Response(status=202)
```

Size limits still matter, but they are not enough here. The right question is how much downstream work the file creates after acceptance, because that is what your workers and vendors will bill you for.

## Track spend before billing does

Billing alerts are useful, but they are late. By the time the cloud invoice moves, the abuse has already happened. You need feature-level cost telemetry attached to the actor that caused it: account, tenant, API key, or webhook source. AWS Budgets supports automated budget actions ([AWS budget actions](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html)), and GCP documents programmatic budget notifications ([GCP budget notifications](https://cloud.google.com/billing/docs/how-to/budgets-programmatic-notifications)). Those are good backstops, but the application should see the problem earlier.

```json
{"account_id":"acct_142","plan":"free","feature":"summarize","tokens":4100,"estimated_cost_usd":0.012,"ts":"2026-03-20T10:14:00Z"}
{"account_id":"acct_142","plan":"free","feature":"summarize","tokens":3900,"estimated_cost_usd":0.011,"ts":"2026-03-20T10:14:11Z"}
{"account_id":"acct_142","plan":"free","feature":"summarize","tokens":4050,"estimated_cost_usd":0.012,"ts":"2026-03-20T10:14:22Z"}
```

Those fields are enough to drive action. Page the team when a new free account burns through its allowance immediately. Alert when one verification flow starts spending outside its normal range. Surface worker queues where one tenant suddenly owns most of the paid jobs.

## Putting it together

Cost-triggering endpoints fail in a few repeatable ways. Some are expensive on every call. Some get farmed through free tiers. Some hide telecom spend behind tiny requests. Some replay the same paid side effect, and some turn small uploads into large jobs. The controls are repetitive in a good way: bound the work before you do it, cap how much one actor can spend, deduplicate retries, and alert early when feature spend leaves its normal range.

**Cost defense checklist:**

- Paid routes identified explicitly in code or config
- Input size or job size checked before expensive work starts
- Per-account quotas enforced on every paid feature
- Rate limits used for bursts, quotas used for total allowance
- New and free accounts get much smaller paid-feature limits
- Messaging routes restricted to the regions and volumes the product actually needs
- Webhook handlers verify signatures and enforce idempotency before paid side effects
- Workers deduplicate jobs and cap retries
- Feature-level spend telemetry recorded per actor
- Provider-side budget alerts and budget backstops configured for expensive features

For the broader context on how cost boundaries fit into a security audit, see [A Practical Security Audit for Builders](/2026/02/14/quick-security-audit/). For understanding who is likely attacking your system and what they are after, see [Threat Modelling for Builders](/2026/03/01/threat-model/).

Cost abuse is the attack surface most teams discover last. There are others that get exploited earlier — [injection](/2026/03/06/malicious-user-input/), [file upload exploits](/2026/03/14/uploads-attack-surface/), [credential leaks](/2026/02/20/secrets-leaked/), [supply chain attacks](/2026/03/28/supply-chain-attacks/) — each with their own patterns. I write these deep-dives for engineers who'd rather learn this from a blog post than from a production incident. [Get them by email →](https://newsletter.eliranturgeman.com/)
