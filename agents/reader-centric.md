## Reader-Centric Writing Protocol

This protocol ensures all writing is built around the reader’s needs — not the writer’s thoughts.

---

## 0. Audience Profile (Non-Negotiable Context)

All writing MUST assume the following reader:

- **Who they are**:  
  AI-first builder / indie hacker / early-stage engineer shipping real products

- **Technical level**:  
  Can build and deploy working systems (APIs, Vercel apps, simple infra)  
  Not formally trained in security

- **Behavior**:
  - Moves fast, prioritizes shipping over correctness
  - Relies heavily on AI-generated code
  - Rarely reads documentation deeply
  - Copies patterns without fully validating them

- **Current problems**:
  - Doesn’t know what can actually get them hacked
  - Doesn’t know what matters vs noise in security
  - Overwhelmed by tools, scanners, and vague advice
  - Has blind spots in real-world attack surfaces

- **Goals**:
  - Avoid getting hacked
  - Ship safely without slowing down too much
  - Understand *practical* risks (not theory)

- **Mindset when reading**:
  - Low patience for fluff
  - Skeptical of generic advice
  - Wants concrete, actionable insight
  - Asks implicitly: “why should I care?”

If the content does not clearly map to this reader — it is incorrect.

---

## 1. Intent Audit (Who is this really for?)

Ask:

- Is this built around what *I want to say*, or what *the reader needs to hear*?
- Who is the focus — me or the reader?
- What problem is the reader trying to solve when they open this?

If the content is expressing thoughts without anchoring to a reader need:

> ❌ Writer-centric (must revise)

---

## 2. Reader Context Reconstruction

Before writing or editing, explicitly state:

- What situation is the reader in right now?
- What triggered them to read this?
- What mistake, risk, or confusion are they facing?

Example:
> “Reader just implemented X feature and doesn’t realize it introduces Y risk”

If you cannot answer this clearly — stop and refine.

---

## 3. Value Alignment Check

For every section / paragraph:

- What does the reader gain from this?
- Does this:
  - reduce risk?
  - clarify something confusing?
  - help them make a better decision?
  - show a concrete failure mode?

If not:

> ⚠️ Low-value (rewrite or remove)

---

## 4. Reframing Pass (Core Requirement)

Re-answer:

> If I rewrite this purely for the reader’s needs — how should it change?

Apply transformations:

### A. Remove writer-centric framing

- “I built…”
- “I want to explain…”
- “This is interesting…”

→ Replace with:

- “Here’s where this breaks in real systems”
- “What this means for your code”
- “Why this can get you hacked”

---

### B. Convert abstract → concrete

- Replace explanations with:
  - attack scenarios
  - failure modes
  - real consequences

Bad:
> “This can introduce vulnerabilities”

Good:
> “An attacker can upload X and execute Y because Z”

---

### C. Replace general → specific

- Use scenarios the reader recognizes:
  - file uploads
  - auth flows
  - API endpoints
  - webhooks
  - CI/CD pipelines

---

## 5. Clarity & Friction Reduction

Ensure the reader can quickly answer:

- What is this about?
- Why should I care?
- What should I do?

Remove:

- Generic intros
- Filler phrases
- Anything that delays value delivery

---

## 6. Actionability Requirement

Every meaningful section should answer at least one:

- What should the reader check in their system?
- What should they change?
- What should they avoid?

If the reader finishes without knowing what to do:

> ❌ Not acceptable

---

## 7. Final Reader Check

Evaluate:

- Does this feel written *for this exact reader*?
- Would they find this immediately useful?
- Would they keep reading past the first few paragraphs?

If not — revise.

---

## Output Requirement

Only produce final content after passing all steps.

Do NOT include this protocol or analysis in the output.