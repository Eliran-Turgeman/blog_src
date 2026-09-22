---
title: semantic linting for agents
# status:
date: 2026-09-22 8:15:20
subtitle:
description:
series:
tags:
	- ai engineering
	- ai agents
	- llm evaluation
keywords:
	- semantic linting
	- AI coding agents
	- agent feedback loops
	- probabilistic linting
	- automated code review
	- Jev
	- Reaper
---

It's pretty clear to everyone now, that designing a tight feedback loop for your coding agents is important.
Many do so by creating linters they wouldn't bother creating before coding agents became a thing. a few examples my agent found:

- [UN1T CRM added two rules](https://github.com/ivers9307-cyber/un1t-crm/pull/653) for Supabase-specific issues: calling `.catch()` on query builders and silently truncating results at 1,000 rows.
- Jovie used agents to create rules that [prevent Node-only imports in Edge routes](https://github.com/JovieInc/Jovie/pull/1299) and [prevent expensive clients from being created inside request handlers](https://github.com/JovieInc/Jovie/pull/2460).
- [PrimeThink used Claude to create seven custom AST rules](https://github.com/Primethink-AI/primethink-app-templates/pull/17), including one that catches database writes inside React state updaters.

Another practice is having a separate agent acting as the judge or reviewer given certain style/architecture guidelines for more semantic linting. again, a few examples my agent found:

- [Optimism added a separate Go reviewer agent](https://github.com/ethereum-optimism/optimism/pull/22561) that reads its Go, development workflow, flake prevention, and domain-specific guidelines before reviewing a change.
- [CMS Open Data uses an implementer and a read-only adversarial reviewer](https://github.com/turnerluke/cms-open-data/pull/116). The reviewer checks claims against real data and looks for scope creep, hardcoded values, silent behavior changes, and generated-file drift.
- [MinerTim created three repo-specific reviewer agents](https://github.com/stephen84s/miner-tim/pull/9), including one for its ARM64 JIT that checks instruction encoding, ABI rules, differential tests, and performance claims against the project's previous failures.

The tradeoffs are quite clear:
deterministic linters - fast, consistent, and cheap to run, but limited to the rules we explicitly write and maintain.
reviewer agents - can reason about higher-level decisions and intent, but are slower, more expensive, and less consistent. Their results also depend heavily on which context and instructions they receive.
 
There's now a middle ground thanks to [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), a system one model built to make fast, low-cost judgements over large amounts of contexts. It can enforce higher-level guidelines like a reviewer agent, while being cheap and fast enough to run as part of the regular coding loop.

<details>
<summary><b>More on Jev</b></summary>

here's an explainer video I generated using another project I'm building. It's still early and has plenty of room for improvement, but I found the result useful. Let me know what you think.

<video controls preload="metadata">
	<source src="/videos/jev-explainer.mp4" type="video/mp4">
	Your browser does not support embedded videos.
</video>

</details>

## So how Jev can help us with linting?
Being fast (70ms-500ms per request) and cheap (last 24h I sent 11k requests, which cost me 0.305$) - Jev unlocks a useful semantic linting paradigm that can be used every single agent turn which helps steer the agent in the right direction, instead of making big corrections, potentially hours after your agent started implementing something you didn't ask for.

It's not all rainbows, the drawbacks we do need to consider are the current context window is 32k tokens, and reasoning capabilities are limited, which means we have to curate context and we have to assume the model is less capable than what we are used to.

With that in mind, I was coming up with a set of semantic linting rules that take that into account. That meant the rules couldn't ask Jev to broadly review the change and figure out what might be wrong. each rule had to focus on one specific question, with carefully selected context that fits within the 32k limit. for example: did this change turn an error into a successful response? did it remove a validation that still needs to happen? did it weaken what a test actually verifies? the narrower the question and the more relevant the context, the less reasoning Jev has to do to reach a useful answer.

Let's take silent error handling as an example. imagine an agent makes this change:
```go
 profile, err := store.GetProfile(ctx, userID)
 if err != nil {
-    return Profile{}, fmt.Errorf("get profile: %w", err)
+    return Profile{}, nil
 }
```

The code compiles, and depending on the existing tests it might even pass CI. but the behavior changed in an important way: callers can no longer tell the difference between a user with an empty profile and a failure to load the profile.

A regular lint rule can't easily flag this. returning an empty value with no error is perfectly valid Go, and in some cases it might even be the intended behavior. but we can turn the concern into a narrow semantic question for Jev:

>did this change convert a failure into a successful return value?

We don't need to send the entire repository to answer that. we can send the changed function, its before and after versions, the diff, and the task the agent was given. this gives Jev enough context to identify the behavior change while keeping the question and the amount of required reasoning small.

## Reaper
With this approach in mind, I started building [Reaper](https://github.com/Eliran-Turgeman/reaper) to make these kinds of checks reusable. Reaper looks at the current git change, collects the context needed by each rule, asks Jev a set of narrow 
semantic questions, and reports the results like regular lint diagnostics:

```bash
service/profile.go:42-44: error [silent-failure-fallback] confidence=0.94
    Changed code appears to replace a visible failure with success or a default value.
```
This creates the same tight feedback loop we get from regular linters, but for problems that require understanding what the code change actually means.

To get started with Reaper, let your agent follow the [README](https://github.com/Eliran-Turgeman/reaper/blob/main/README.md) installation and usage guidelines, and you can take inspiration from my [AGENTS.md](https://github.com/Eliran-Turgeman/reaper/blob/main/AGENTS.md) in the repo to integrate Reaper in your agentic loop.

## Breaking rules into signals
Even though Jev is only a few days old, Reaper already changed dramatically in how it uses it. apparently, designing probabilistic lint rules involves more than writing a prompt and choosing a sufficiently confident-looking number.

The first version had one question per rule and some were quite broad: "is this a shallow module? does this layer add meaningful abstraction? is this generality actually justified?"

Jev didn't have enough context to answer these questions, it only saw the hunk. it could see the wrapper, but not necessarily its callers, other implementations, or why the boundary existed. we could potentially go the opposite extreme and give context to the entire repo but remember there's a 32k context window, and I suppose we would hit different issues even if context window was sufficent.

One middle-ground I was thinking about was to collect all the **related** code (build AST, find callers, references, etc..). this sounded like way too much work and I can't justify it at this point, so instead of that, I tried changing what the rules claimed instead - breaking broad rules into a combination of local signals.

For example, instead of asking whether a certain abstraction layer was architecturally valuable, we broke it down to three local questions:

- does the change introduce a callable that primarily invokes another callable?
- does it expose the same operation and pass through substantially the same arguments?
- does it add no visible validation, policy, translation, lifecycle management, or error handling?

This made the finding much easier to defend. Reaper was no longer claiming that an abstraction was useless everywhere, only that the supplied change introduced a callable that visibly forwarded the same operation without adding behavior.

This wasn't the end of it, splitting the rules into signals didn't magically make the results good, but it made them much easier to understand and iterate on (improving a single very specfic question is much easier compared to improving a large question that actually contains 3 questions in it)

## Getting the signals right wasn't enough

Another important aspect of Reaper, is getting the gist of the user task, and determining whether a certain code change adheres to the task.

We had cases where a rule would flag a code change, even though the code change matches the user request - what do we do then?
I decided to introduce a new signal, that asks Jev whether a certain change is permitted by the user request. 
To make things simple, imagine we have a rule that detects "weakend tests" (removing assertions, making tests tautological, etc..).
A user asks their agent - "Remove property X from object Y", then the cascade of that would be the agent removing all lines asserting anything on Y.x - and that would be a valid change the user requested for.

You guessed it right, in order to actually do semantic linting effectively, we have to capture intent! (otherwise we end up with a bunch of FP inspired by the old-age determinstic linters)

The current mechanism I chose is guiding the agent to set the intent in an env var so that Reaper could use it verbatim to assess whether a certain code change matches the intent. (checkout my [AGENTS.md](https://github.com/Eliran-Turgeman/reaper/blob/main/AGENTS.md))


## Conclusion
There's much more to do, but I think [Reaper](https://github.com/Eliran-Turgeman/reaper) has a good starting point to experiment with, so give it a try.
