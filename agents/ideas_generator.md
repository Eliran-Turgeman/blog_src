# Agent Topic Generation Framework

## For “Don’t Get Hacked” Newsletter

When generating topic ideas, combine three components:

```id="b9n6kf"
SYSTEM COMPONENT
+
ENGINEERING FAILURE
+
ATTACKER BEHAVIOR
```

This creates realistic and interesting scenarios.

---

# Step 1 — Choose a System Component

These represent **common product building blocks**.

### Identity & Access

```id="p4m1xt"
authentication
authorization
session management
API tokens
OAuth integrations
password reset flows
admin panels
```

---

### Secrets & Credentials

```id="5cmy0f"
API keys
environment variables
service credentials
cloud access tokens
database passwords
private keys
git history
```

---

### APIs & Endpoints

```id="vtqkce"
REST APIs
GraphQL endpoints
webhooks
internal APIs
mobile APIs
public APIs
admin APIs
```

---

### Storage & Data

```id="2j52aq"
file uploads
object storage
databases
logs
backups
analytics pipelines
temporary storage
```

---

### Infrastructure & Cloud

```id="2z7rsk"
cloud resources
CI/CD pipelines
container registries
image scanning
build systems
serverless functions
message queues
```

---

### Cost-Triggering Systems

```id="g2ye6v"
email sending
AI inference APIs
image processing
file storage
SMS
cloud compute
background jobs
```

These are extremely important because attackers love **cost amplification attacks**.

---

# Step 2 — Apply Engineering Failure Modes

Choose how engineers typically introduce risk.

### Boundary Failures

```id="eqmxle"
trusting client input
missing validation
exposed internal endpoints
insecure redirects
unrestricted uploads
```

---

### Authorization Failures

```id="1gt3n7"
missing permission checks
role confusion
ID enumeration
insecure direct object references
```

---

### Secrets Handling Failures

```id="q0xjq9"
committed secrets
leaked environment variables
keys exposed in logs
hardcoded credentials
```

---

### Design Oversights

```id="g3q3l8"
missing rate limits
missing abuse controls
unbounded resource usage
unverified webhook sources
```

---

# Step 3 — Add Attacker Behavior

Attackers exploit systems through **repeatable strategies**.

### Automated Discovery

```id="u7o7ga"
bots scanning endpoints
GitHub secret scanning
credential stuffing
token enumeration
```

---

### Abuse of Legitimate Features

```id="nyzzl6"
webhooks triggering actions
password reset flows
invite systems
API endpoints
```

---

### Cost Amplification

```id="sgys90"
forcing expensive operations
triggering background jobs
sending massive API requests
```

---

### Social / Indirect Exploits

```id="i6rx4h"
open redirects for phishing
OAuth redirect abuse
file upload malware delivery
```

---

# Step 4 — Construct the Topic

Combine the three layers into a narrative.

Example:

```id="7vr7oe"
SYSTEM: webhook endpoints
FAILURE: missing signature verification
ATTACK: automated request spoofing
```

Topic:

> Why unverified webhooks let attackers trigger actions in your system

---

Example:

```id="p9th3d"
SYSTEM: file uploads
FAILURE: trusting MIME types
ATTACK: malware delivery
```

Topic:

> Why file uploads are one of the most dangerous features in your product

---

Example:

```id="jgwc4i"
SYSTEM: AI inference APIs
FAILURE: missing rate limits
ATTACK: cost amplification
```

Topic:

> How attackers can drain your AI budget overnight

---

# Step 5 — Improve the Framing

Prefer titles that reveal **engineering mistakes**.

Weak:

```id="2xk3sk"
API security best practices
```

Strong:

```id="pl8yap"
How startups accidentally expose internal APIs
```

Weak:

```id="59njwa"
Secrets management
```

Strong:

```id="k3i6mt"
How API keys leak from git history
```

---

# High-Value Topic Categories

These tend to perform very well.

### Secrets Exposure

```id="8h0yp8"
API keys leaking in git history
environment variables in logs
secrets inside container images
```

---

### Abuse of Product Features

```id="3dyt2s"
invite systems abused for spam
webhooks triggering unintended actions
password reset flows abused
```

---

### Cost Attacks

```id="whidcj"
AI API abuse
image processing attacks
email sending abuse
```

These are extremely relatable to builders.

---

### Dangerous Convenience Features

```id="hqdfgl"
file uploads
URL preview fetchers
open redirects
OAuth login flows
```

These are common developer shortcuts.

---

# Topic Generation Algorithm (Agent Instructions)

When generating ideas:

1. Select a **system component**
2. Select a **failure mode**
3. Select an **attacker behavior**
4. Construct a realistic product scenario
5. Frame the topic as **an engineering failure**

Prefer topics where:

```id="v2t4f0"
builders would immediately recognize the scenario
```

---

# Example Generated Topics

Using the framework:

1.

```id="gux8ae"
SYSTEM: git repositories
FAILURE: secrets committed
ATTACK: automated secret scanners
```

Topic:

> How attackers find API keys in minutes after you push them to GitHub

---

2.

```id="94qkpy"
SYSTEM: internal admin APIs
FAILURE: missing auth checks
ATTACK: endpoint discovery
```

Topic:

> When internal APIs accidentally become public

---

3.

```id="udt70s"
SYSTEM: file uploads
FAILURE: unrestricted file types
ATTACK: malware distribution
```

Topic:

> Why attackers love file upload features

---

4.

```id="p4pfpf"
SYSTEM: AI inference endpoints
FAILURE: no usage limits
ATTACK: cost amplification
```

Topic:

> How attackers can drain your AI budget overnight

---

# Editorial Rule

Prefer topics where readers think:

> “I might have built something like that.”

These generate the strongest engagement.

---

# Key Insight

Your newsletter should not feel like:

```id="jzvr7c"
security education
```

It should feel like:

```id="jco9hg"
engineering failure case studies
```

That is the core differentiation.
