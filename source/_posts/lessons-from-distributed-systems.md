---
title: Lessons from building and maintaining distributed systems at scale
date: 2025-04-19T08:01:01.000Z
tags:
  - best practices
  - distributed systems
readTime: 4
---

When your architecture grows beyond a single container, things you thought were simple can now break in a variety of ways.
In this post I want to highlight different lessons I learned while developing and maintaining large distributed systems at scale.

## One cache cluster to rule them all
When multiple services share one cache cluster, they compete for the same memory and eviction policies. A heavy workload from Service A can evict critical data for Service B, leading to timeouts or stale responses at peak traffic.
Now let's say your cache memory is full, and the eviction policy you set starts triggering. You start seeing your TotalKeys metric going down drastically, you would want to understand immediately which service is affected, but it's much more complex now.
On top of that, the affect on multiple services in that case might be even harder to detect, because if we have 5 services that use the cache, and now the eviction policy evicted millions of keys, it might be that one service lost 950k keys, and another lost 50k keys and that makes debugging harder.
If a single service would lose 1 million keys the affect on the service would probably be more noticeable on other metrics, but if we just lost 50k maybe that won't affect the service as much? (obviously depending on the amount of keys this service has in cache)

This is very tempting to neglect because you can always just scale up your cluster, given you set monitors to detect when it will reach max memory.
Personally, I prefer to not deal with these issues, since spinning up a new cluster isn't such a big of a deal.

## Queues are non-negotiable
Once you have broken down your architecture from a single container to 2+ containers, that's usually the time where you should introduce queues between those calls.
Queues help services handle spikey traffic. I like to think of it this way:

1. a queue is the in-charge grown up.
2. a service is someone who has no backbone and can't say 'no' until he explodes.

if someone is bursting the service, the service won't know how to say 'no' and will accept all the traffic till it explodes.
a queue will help us avoid this situation, while also buying us time to auto scale the service.

## Measuring end-to-end latency
You might think the e2e latency of your system is the sum of latency of services that are triggered in a flow, but there's an additional latency you should think about in distributed systems - the dequeue latency, which is the amount of time a message was waiting in the queue before the service started processing it.
How can this happen? for example, when your service is not scaled up properly to handle all messages in the queue, so a backlog of messages is accumulating, waiting for the service to pick them up. this directly affects the latency of your entire system, so make sure you monitor that as well.

## Design for failure
Network failures, rate limiting, downstream services crashes - there are many reasons why your service can fail.
You should expect these failures and take them into consideration, so create a retry policy whenever you are making an API call to retry any transient exceptions, consider using circuit breakers so that you can stop calling a failing service until it recovers, and use a dead-letter queue to isolate messages that constantly fail so you can inspect them later.

## Design for idempotency
Message queues guarantee “at least once” delivery. Duplicates are expected. If your consumer isn’t idempotent, you’ll process the same event multiple times—charging a customer twice or creating duplicate records. Relying on “exactly once” delivery is a recipe for inconsistency. You need to assume duplicates will happen and handle them gracefully.

I once had to [debug a nasty bug](https://www.16elt.com/2023/07/15/idempotency-aws-lambda/) in an AWS lambda that wasn't idempotent and it was a pain in the ass.

---

This is whatever was in the top of my head, hope you find it useful and you have a few ideas on how to improve your system.


