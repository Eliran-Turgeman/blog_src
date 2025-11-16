---
title: Why sharing a redis cluster across services is asking for trouble
date: 2025-05-01T08:38:27.000Z
tags:
  - distributed-systems
  - caching
  - redis
readTime: 4
---

If there’s one pattern I’ve seen across multiple companies, from scrappy startups to big corps, that causes endless headaches, it’s this: a single cache cluster shared across services.

I recently shortly wrote about [my lessons from building and maintaining distributed systems at scale](https://www.16elt.com/2025/04/19/lessons-from-distributed-systems/), and the first point that came to mind is exactly this - it starts with an excuse of simplicity, "we already have a cache cluster up and running, let's just make this other service use it, no need for more infra", and ends with a confused on-call engineer trying to debug which services were affected by the last keys eviction.

So I want to double down on this idea and explain in more detail why it becomes a nightmare once your system scales.

## One eviction policy
You got different services each throwing keys at the same redis cluster.
A sudden spike/bug just caused a dramatic increase in cache writes - your cluster wasn't ready for this, it hits `maxmemory` and now different keys are being removed based on your eviction policy.

What's the problem? there's no isolation - service A caused the max memory, and now service B, C, D also pay the price - their keys are being removed as well from the cluster, and could affect the latency, and correctness of other flows of your system.

## Monitoring is harder
Our metric fires up — we see a drop in hit rate on the cluster. Which service is causing it? Who's affected? Instead of thinking about one service, you’re now mentally juggling everything across the entire system. More noise, less clarity.

Although monitoring is harder, you could set up application monitors that you send once you write/read from the cache, based on the prefix of the key. potentially if you are organized and each service that uses the cluster has a unique prefix and you can easily identify between the hit rates of different prefixes - that's great, but you have to work to get there.

## Debugging is harder
This ties back to my first point about the eviction policy.
You had 10m keys. something happend. now you got 5m.
The effect on the services is really hard to trace.
One service might have lost 100k keys, and you barely see a difference in its monitors, but it doesn't mean your users are not feeling something is off, maybe today the are waiting a bit more for the page to load, but it's not too long to hit your monitors thresholds.
In that case, if you didn't have a monitor on the cache cluster for keys eviction, you might be totally blind.."oh I see a slight latency increase here, but no monitors popped - guess all is well"

## So, never use a shared cache cluster?
No, that's not the lesson here.
In some cases it is totally fine to use a single cache cluster.
For example:

* You don't really have a lot of traffic read/written to the cache so most of it is free anyway
* You store shared static data (for example, feature flags)

Also note that some of the points I was making here against using a single cache cluster, can be somewhat mitigated by having good monitoring set in place.
For example, having a defined prefix for the cache key per use-case, per service, and publishing metrics in the application level so we have observability to which type of keys (by prefix) are experiecning a low hit ratio.

But on the other hand, tracking keys eviction is harder to monitor, since it's not initiated by your system.

Anyway, I hope you get the point.  
If you are getting started, a single cache cluster is totally fine.  
Otherwise, spin up another cache cluster, and sleep better at night.


