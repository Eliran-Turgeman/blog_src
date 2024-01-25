---
title: Maximizing revenue of in-app purchases, using data
date: 2024-01-25 07:41:56
tags:
---

Predicting in-app purchases(IAPs) for ad-walls, premium currency, etc.. is that a thing yet? well we thought it could be a huge thing.

Companies usually make purchases that either earn more money, save money, or save time - and getting insights and suggestions in regards to their pricing and conversion rates of their IAPs should better help them earn more money.

Ideally, we wanted a company to give us their IAPs purchase data (price, discounts, conversion rates, etc...) so we could make a pricing suggestions looking to maximize revenue.
And it works even better if multiple companies share their IAPs data with us.

That's all rainbows up until now, but the thing you probably won't give some of your IAPs data to two random guys who cold reached to you with "hi, plz data", right? yeah, that's ok - understood.

That was a long intro. its purpose? ~~to lure you in~~ 

## We got your data anyway
not really YOUR DATA, but we synthesized it. simulated it.

After we realized companies, won't be willing to share data with us, having nothing to offer at the time, we thought we must have something to offer - to gain some trust - and then hoping that companies will reach out to get more of the good stuff.

How can we predict revenue, and convertion rates without any real data? we just simulated tons of data.

We looked for real data around customer behavior and cutomers interaction with IAPs of different kinds, and then modeled it into different simulators we created that generated just the data we need.

## We have data, now what?
At first, we focused on simulating purchases of ad-wall removals. (You download a new mobile game, at some moment you have to watch ads to account for the game being free in the first place, until you hate watching ads so much while loving the game so you decide to just remove the ads by paying a few $, simple business model).

Our simulation could create endless purchase records, from sets of customers who behave differently to gain an ability to generalize.

Based on that data, we created different ML models, and tried to answer the question "What is the price for ad-wall removal that maximizes revenue?"

Essentially, you might price the ad-removal at 3$ which gets you 0.1% conversion rate - which at your company leads to 120$ revenue.
But we might suggest you to price it at 5$ which will get you 0.08% conversion rate - which leads to 160$ revenue.

## Our findings


## Contact us for personalized predictions