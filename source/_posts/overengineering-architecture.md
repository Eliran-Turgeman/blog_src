---
title: On over-engineering; Architecture Edition
date: 2024-12-10T18:10:56.000Z
tags:
  - Architecture
readTime: 4
---

I recently [wrote about over-engineering](https://www.16elt.com/2024/09/07/future-proof-code/) and striking a good balance between making your code "too" future-proof and not making it future-proof at all. Some time later, I realized it was missing a critical perspective. I hadn't addressed over-engineering from an architectural point of view, so this post is dedicated precisely to that.

Let’s talk about a decision I made for [Collecto](https://github.com/Eliran-Turgeman/Collecto), my side project. Collecto is still in its early stages, and like most early-stage projects, its future is uncertain. It could grow into something big—or not. That’s where architectural decisions get tricky. You don’t want to overengineer and waste time, but you also don’t want to under-engineer and regret not laying a solid foundation.

### So what's the problem?
Collecto is a forms-backend service, meaning it handles the creation, management, and processing of forms data for applications.  
I wanted to add the ability to send emails on certain events.

For example, when a new user signs up for your form, you might want to send them a welcome email.

The simplest solution? I could write a new service responsible for sending emails and call it directly wherever needed— for example, right after a user signup is saved to the database. This approach works, is easy to set up, and introduces no additional overhead. However, it results in tight coupling, making future changes more challenging. If tomorrow I want to also send a notification to the form owner when they receive a new subscription, I would have to keep adding more responsibilities to the form service code. This bloats the core service, which should ideally focus solely on CRUD operations for forms.

On the other end of the spectrum, I could go all-in and build a distributed pub/sub system with a service bus like RabbitMQ or Azure Service Bus. This would give me scalability, decoupling, and all the good stuff. But it’s also a massive investment in time and complexity for a project that doesn’t need it, yet.

I didn't like both options, so I looked for a 3rd alternative and found MediatR which is a mediator pattern implementation in .NET.

### Why MediatR is a good middle-ground?

1. MediatR facilitates communication between different parts of the application without them needing to reference each other directly. Instead of invoking methods directly, you can send requests or publish notifications, allowing registered handlers to respond accordingly. This approach maintains loose coupling, making the system easier to maintain and evolve.

2. At the same time, it doesn’t introduce the overhead of managing infrastructure like a service bus or message queue. Everything stays in-process, simple, and fast.

3. One of the primary reasons I chose MediatR is its simplicity. Implementing communication patterns with MediatR is straightforward and requires minimal configuration. Compared to a full-fledged service bus, MediatR demands a much smaller time investment and eliminates operational overhead such as monitoring queues or scaling message brokers.

### It can't be all sunshines and rainbows
MediatR has a few cons compared to other out-of-process messaging brokers, for example

1. Events are in-process only. If your application crashes, you lose the events.

2. There’s no out of the box retry mechanism for failed event handlers.

3. If you deploy multiple instances of Collecto, MediatR won’t distribute events across them.


### Bottom line

Architecture isn’t about perfection—it’s about trade-offs. MediatR worked for Collecto because it gave me a decoupled, flexible way to handle events without the overhead of a service bus. It wasn’t the simplest solution, but it was the right one for where the project is today.

The next time you’re making an architectural decision, remember this: the best solution isn’t the most impressive or complex—it’s the one that solves your problem now while leaving room for growth later.

<!-- PROMO BLOCK -->
---

Looking for a powerful, self-hosted backend for forms? 
I'm building **Collecto** — a production-ready tool designed to handle your forms with ease and security. [Check it out here](https://github.com/Eliran-Turgeman/Collecto) and be part of its journey!
<!-- END PROMO BLOCK -->
