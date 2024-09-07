---
title: "Singularity — Microsoft’s Experimental Operating System"
date: 2022-08-05T11:11:25+03:00
draft: false
tags: ["Singularity", "Microsoft", "Operating System", "OS"]
categories: ["Operating Systems"]
---

# Introduction

What would happen if we will write a new OS from scratch right now? can we do it better? can we improve security and robustness? can we prevent unexpected interactions between applications?

 > “what would a software platform look like if it was designed from scratch with the primary goal of dependability?” [1]

These are the type of questions that the Microsoft Research team was trying to answer around 18 years ago and it was then when they came up with a pretty cool name for their new OS — Singularity.

# Goals

Singularity was aimed to eliminate some of the shortcomings of existing operating systems such as

* General security vulnerabilities
* Failures due to extensions, drivers, add-ons.
* Unexpected interactions between apps
* Lack of robustness

# Strategy

* Utilize a safe programming language — no more of C’s shenanigans, we don’t want to “cook” pointers out of integers, no more manually freeing memory and no more buffer overflows.
* Use verification tools — impose constraints that will make verifications easier.
* Improve system architecture and design.

# Singularity Architecture

![1_1mnFIlzUc5ym71zpONVkJA](https://user-images.githubusercontent.com/50831652/183026569-254cd70a-6c14-45f0-9df8-bd19da5c03b7.jpeg)

Singularity provides 3 main abstractions:

* Software-isolated processes (SIPs)
* Contract-based channels
* Manifest-based programs (MBPs)

Let’s drill down into each of these.

## Software-isolated processes
A SIP is just like an ordinary process — holding the processing resources, context, and a container of threads.

The quite surprising part is that all SIPs and the kernel are running in the same address space which also means user code runs with full hardware privileges.

Isn’t it totally counter-intuitive? we just mentioned that we want to improve security as one of our goals and this change seems to make it worse.

First, let’s think about why would they even make this change - does it improve anything?

The answer is yes, it improves performance for example.

Since all SIPs are in the same address space, context switches are performed faster

* No need to switch page tables
* No need to invalidate and repopulate TLBs

Moreover, system calls are also faster

* We are always in CPL=0
* No need to load the kernel stack
* Instead of sending an interrupt, we can just call a function

![1_ZULVdo_8NjDhQjr7j0itRQ](https://user-images.githubusercontent.com/50831652/183026863-4d4f7ade-ad00-4ca2-b9d2-99a83fbfa822.jpeg)

After we convinced ourselves that with this change performance is better let’s take care of the seeming security problem.

Each SIP is actually sealed — They can’t be modified from outside.
There’s no shared memory between different SIPs, no signals, only explicit IPC.
There are also no code modifications from within — no JIT, class loaders, dynamic libraries.

To ensure that SIPs are actually sealed we employ the following constraints

* A SIP only points to its own data — no pointers to other SIPs
* No pointers into the kernel
* SIP exclusively accesses memory the kernel has given to it
* SIP cannot create new pointers — pointers can be provided from a trusted source such as the kernel.

With these constraints, although there is a shared address space, there is no sharing of data.

## Contract-based channels
We can think of channels as capabilities.
Each SIP can have multiple channels that through them we can create IPC(inter-process communication).
For Example, an open file is a channel received from the file server.
If a SIP gets this channel it means that it has permission to access it.

## Manifest-based programs
A manifest describes the capabilities, required resources, and dependencies of a SIP.
A SIP can’t do anything without a manifest and channels.
When installing a manifest we are verifying that it meets all safety requirements, that all of its dependencies are met and it doesn’t create a conflict with a previously installed manifest.
For example, a manifest of a driver provides “evidence” to prove that it won’t access the hardware of another driver.

---

Microsoft also released the following figure, showcasing Singularity's performance for raw disk benchmarks compared to other well-known operating systems

![1_5dlq24Glci8FdGeh-DXDwQ (1)](https://user-images.githubusercontent.com/50831652/183029843-8de59f0d-571f-4d78-ac00-523d00c66de0.jpeg)

---

Singularity is just one example out of many experimental operating systems.
It was last released in November 2008 and since then the project was stopped.

You can find the source code on [Github](https://github.com/lastweek/source-singularity).

For further reading, I can recommend the following:

* [Microsoft Overview of the Singularity Project](https://www.microsoft.com/en-us/research/wp-content/uploads/2005/10/tr-2005-135.pdf)

* [Rethinking the Software Stack](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/osr2007_rethinkingsoftwarestack.pdf)


# References
[1] [Microsoft Overview of the Singularity Project](https://www.microsoft.com/en-us/research/wp-content/uploads/2005/10/tr-2005-135.pdf)




<!-- PROMO BLOCK -->
---

**Too busy to read tech books?**  
Join my [Telegram channel](https://t.me/booksbytes) for bite-sized summaries and curated posts that save you time while keeping you up to date with essential insights!  
**DISCLAIMER: NO LLM SUMMARIES**

---
<!-- END PROMO BLOCK -->


