---
title: Introduction
slug: introduction
order: 1
subtitle: Why Vulnerability Scanning Is Hard
summary: >
  Vulnerability scanners do not observe running systems or concrete risk.
  They infer results from static artifacts, incomplete information, and
  external data sources that change over time. This chapter explains why
  that process is inherently uncertain, how engineering decisions shape
  scan results, and why building a scanner from scratch is the best way
  to understand those constraints.
---

Most engineers use vulnerability scanners without thinking much about how they work. An artifact goes in, a list of CVEs comes out, and the process in between is rarely questioned. 

That process determines how static metadata such as a package listed in your lock file becomes a security finding labeled Critical.

What is less obvious is that this transformation is not a straightforward lookup. It is a chain of design decisions made under uncertainty, where small modeling choices can dramatically change the output.

Building a scanner from scratch is the best way to demystify this process. Much like building anything from scratch, the value isn't in replacing the industry-standard tools, but in mastering the system design and data modeling challenges that these tools solve behind the scenes.

## The Mental Model
A vulnerability scanner is essentially an inference engine. It does not observe a living, breathing system. Instead, it acts more like an archaeologist: it examines "fossilized" artifacts such as source code, lockfiles, OS package manager files, and attempts to reconstruct a static model of what the system looks like.

It then compares this reconstructed model against external data to draw conclusions.

The core challenge of building such a tool is acknowledging that this reconstruction is inherently lossy.

* It lacks State: A scanner sees the file on the disk, but not the process in memory. It sees the library libssl, but not the configuration flag that disables the vulnerable cipher suite.

* It lacks Intent: A scanner sees code that could run, but not the execution path that actually runs.

This creates the _Inference Gap_, the distance between the static artifact and the dynamic reality of the software.
It is important to recognize that this gap is inherent to the nature of static vulnerability scanners. While other classes of tools such as runtime agents, eBPF-based monitors, or dynamic analysis engines, can be combined to narrow this gap by providing live context, they are outside the scope of this book. Our focus is on mastering the fundamental logic and data modeling required to build a robust, static inference engine.

![](./scanner_view.png)

This gap is not a philosophical problem. It is an engineering constraint. Every scanner must eventually turn partial evidence into a concrete finding, even when the data does not fully justify that certainty.

## Engineering Under Uncertainty
Once you accept that scanners operate on incomplete evidence, the core engineering challenge becomes unavoidable: you must build systems that produce deterministic results from ambiguous inputs.

### Modeling Challenges
An artifact is a snapshot in time. Some data is missing, some version strings are ambiguous, and some dependencies are hidden inside others (transitive dependencies). As the architect, you have to decide:

* How do we represent a package when the version string is missing or corrupted?

* How do we reconstruct a dependency graph when the manifest file is missing, but the binaries are present?

* Where do we draw the line between an observed fact (e.g., "I found this file") and an inferred guess (e.g., "I think this file belongs to Log4j v2.14")?

### Matching Challenges
Once you have extracted an inventory of packages, you face the next engineering hurdle - Matching.

It is a common misconception that vulnerability matching is a simple lookup against a database. In practice, the data on both sides—your inventory and the vulnerability feeds—is often inconsistent and unstructured. Building a scanner from scratch forces you to solve the technical "glue" problems that dictate the accuracy of your results:

* Vulnerability databases might define a range as `3.1.*`, while your lockfile says `3.1.2-beta`. You must implement (or choose) a versioning logic that can reconcile these different formats without generating false negatives.

* A vulnerability might be filed under the name `log4j-core` in one database and `org.apache.logging.log4j:log4j-core` in another. Mapping your extracted packages to these disparate naming conventions is an exercise in data canonicalization.

* Vulnerability data is not static. Databases are constantly refined, records are retracted, and severity scores are updated. Your system must be designed to handle a shifting data source. You have to decide if a "new" finding is truly new, or if the underlying data simply became more accurate overnight.

## Building the Pipeline
The goal of this book is to build a functional, transparent pipeline. We aren't aiming for the largest feature set; we are aiming for a clear implementation where every decision is visible.

Our pipeline will follow a standard architecture:

* Collection: Ingesting the raw artifact (i.e pull image from registry).

* Cataloging (SBOM): Turning the artifact into a structured inventory.

* Matching: Connecting that inventory to external vulnerability feeds.

* Reporting: Outputting findings in a standard format (SARIF).

![](./high_level_architecture.png)

By the end of this project, scan results will no longer be "black box" outputs. You will understand exactly why a tool says what it says, the limits of what static analysis can provide, and the architectural trade-offs required to build a stable security tool.

## What's Next?
We are going to start at the end.

Before we write code to extract data, we need to define the schema of our conclusions. In Chapter 2, we will design our result model and map it to the SARIF (Static Analysis Results Interchange Format) standard. This ensures that from the very first line of code, our scanner speaks a language that the rest of the engineering ecosystem understands.