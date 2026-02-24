---
title: A Builder's Guide to Not Leaking Credentials
date: 2026-02-20T09:37:17.000Z
tags:
  - application-security
  - don't get hacked
readTime: 8
---

Stolen or leaked credentials have been the single largest breach vector for a decade, appearing in [31% of all breaches according to Verizon's DBIR](https://www.verizon.com/business/resources/Te3/reports/2024-dbir-data-breach-investigations-report.pdf). Not SQL injection, not zero-days — credentials. And early-stage products are especially exposed, because they tend to have fewer guardrails: no secret scanning in CI, no rotation policy, and developers committing API keys to repos, pasting tokens into Slack, or pushing `.env` files "just for testing."

## The Threat Model Builders Usually Get Wrong

The mental model most early-stage builders operate with is something like: "My repo is small, nobody's looking at it, and it's private anyway."

The "nobody's looking" part is wrong because the looking is automated. GitHub's public Events API streams every push event in near-real-time, and credential scanners poll it continuously. When a push event comes in, they fetch the diff, match it against known secret formats (AWS access keys, Stripe tokens, database connection strings), and test discovered credentials against provider APIs automatically. GitGuardian reported finding [23.7 million new hardcoded secrets in public GitHub commits in 2024](https://www.gitguardian.com/state-of-secrets-sprawl-report-2025), a 25% increase year over year. The time between a push and exploitation can be minutes, because there's no human in the loop. The entire pipeline from discovery to abuse is automated.

A private repo does protect against the automated scraping problem specifically, and that's worth being honest about. But the reason secrets shouldn't live in version control goes beyond repo visibility. Git is a distributed system designed for permanence and full replication. Every clone is a complete copy of every secret ever committed. Access control is at the repo level, not the secret level, so you can't revoke access to one key without rotating it. And the history is append-only by default, so a secret committed once persists across every copy of the repo even if you delete it in a later commit. Those properties are what make version control the wrong storage layer for credentials, regardless of whether the repo is public or private.

## Common Mistakes

1. **Hardcoding secrets in source files,** even temporarily. A common pattern is committing a key "just to test," then removing it in the next commit. But git history is append-only by default, and the previous commit still contains the secret in plaintext, and any scanner or anyone running `git log -p` will find it. This applies even if the key was only present for a single commit that was pushed and then reverted within minutes. The same goes for `.env` files: your `.gitignore` should prevent them from being tracked, but if the file was added before the ignore rule existed, or the rule wasn't configured correctly, it's already in history. Adding it to `.gitignore` after the fact doesn't remove it from previous commits.

2. **Using production credentials locally.** The problem here is that you're multiplying the number of places where the credential exists. It ends up in your `.env` file, your shell history, your database GUI's saved connections, maybe a local docker-compose override. Each of those is another place it can get committed, backed up, or synced somewhere unintended.

3. **Sharing keys outside of proper channels.** Slack messages, Discord threads, support tickets, email, and screenshots are obvious ones, but LLM prompts are worth calling out separately. Depending on the provider and plan, prompts may be logged, stored in conversation history visible to org admins, and in some cases used for model training. A secret pasted into a prompt is a secret shared with a third party, with retention policies you probably haven't read. All of these channels share the same fundamental problem: credentials shared through them sit outside your rotation lifecycle, with no expiry and no audit trail.

## Check If You've Already Leaked Something

### Scan your current state

[Gitleaks](https://github.com/gitleaks/gitleaks) is what I reach for. It matches against a curated ruleset of regex patterns for known secret formats (AWS access keys, GCP service account keys, Stripe tokens, database URIs, and a few hundred others), runs entirely offline, and is fast enough to use both locally and in CI. [TruffleHog](https://github.com/trufflesecurity/trufflehog) is a good alternative if you want fewer false positives, since it verifies discovered credentials against provider APIs to confirm they're still live.

```bash
gitleaks dir .
```

This scans the files in your working directory. Useful as a starting point, but it only covers what's on disk right now.

### Scan your full git history

```bash
gitleaks git --log-opts="--all" .
```

This walks every commit across every branch, and it's the step that tends to get skipped. If a secret existed for a single commit six months ago and was removed in the next one, this will find it. For public repos, that commit is still accessible to anyone browsing the history — there's no "window" of exposure that closes when you push a fix. The secret remains in the repo's commit graph until you rewrite history with something like `git filter-repo` and force-push. Even then, any clone or fork made before the rewrite retains the original commits.

### If something is found

Priorities, in order:

1. **Rotate the key immediately.** Generate a new credential and deploy it. The old one is compromised regardless of what you do next.
2. **Deactivate the old credential explicitly.** In most systems (Stripe, database passwords, single-key APIs), generating a new credential automatically invalidates the old one. But some systems allow multiple concurrent active credentials. In those cases, creating a new key doesn't disable the old one, and you need to deactivate it as a separate step.
3. **Check your provider's access logs.** AWS CloudTrail, Stripe dashboard, database audit logs. Look for unauthorized usage during the exposure window.
4. **Consider rewriting git history.** Tools like `git filter-repo` can strip secrets from history, but this matters less than rotation. A rewritten history doesn't help if the leaked credential is still active.

The instinct is usually to clean up the repo first, but an attacker with your key doesn't care about your commit history. Rotation should happen before any cleanup.

## How Secrets Should Be Handled

Your application reads credentials from environment variables or injected files at runtime (`os.environ["DB_URL"]` or equivalent). The credential itself lives in a `.env` file (gitignored), a CI secret variable, or a managed secret store, never in source code. Use different credentials per environment (dev, staging, production) so that a leak in one doesn't compromise another.

For a solo founder or a small team, a gitignored `.env` file per machine is a reasonable starting point. The main risk at that scale is accidentally committing it, so the effort should go into preventing that: a properly configured `.gitignore`, a pre-commit hook, and CI scanning as described above.

Once you have multiple services, a staging environment, or more than a couple of people who need access, scattered `.env` files start to break down. Managed stores (AWS Secrets Manager, Vault, Doppler) give you audit trails, programmatic rotation, and scoped access. More importantly, they centralize the answer to "who has access to what" in a way that scattered env vars never will. The operational cost is worth it at that point because the alternative is having copies of keys in deploy scripts, CI configs, developer machines, and Notion docs, with no visibility into which ones are stale or overprivileged.

The next step beyond that is short-lived credentials: IAM roles instead of static access keys, OIDC tokens for CI, database users provisioned per session. These reduce the blast radius because a leaked credential expires before anyone can use it. The setup cost is real (OIDC federation, token exchange flows, session-scoped provisioning), and for an early product with one or two services it's usually not worth the complexity. Where it starts to pay off is when you have credentials that would give broad access if leaked, like a static AWS access key with wide IAM permissions, a database superuser password, or API keys to payment or identity providers.

## Enforce It in CI

Relying on people to run gitleaks locally before every push is fragile. Someone will forget, or push from a machine that doesn't have it installed, or merge a PR in a rush. If your process allows secrets into `main` without an automated check, a secret will eventually land there.

```yaml
- name: Scan for secrets
  run: gitleaks git .
```

Add this to your CI pipeline so a detected secret fails the build (gitleaks exits with code 1 by default when leaks are found). CI is the right enforcement point because it runs regardless of what's installed on someone's local machine. A pre-commit hook is a nice complement, but not a gate you can rely on.

One practical issue: if you enable this on a repo with existing history, you'll likely get failures from old commits. Gitleaks supports a `.gitleaksignore` file where you can allowlist known false positives or already-rotated secrets by their fingerprint. Get your baseline clean first, then enforce going forward. Without this step, teams tend to disable the check after the first few false-positive failures, which defeats the purpose.

---

**The checklist:**

- Scanned current repo state with `gitleaks dir`
- Scanned full git history (`gitleaks git --log-opts="--all"`)
- Rotated any exposed keys
- Added secret scanning to CI
- Removed secrets from source code


