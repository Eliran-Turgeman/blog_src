---
title: I Tried to Teach an LLM to Name Anime. It Mostly Copied Japanese Noise.
date: 2025-11-29 08:25:20
tags: [AI, LLM, machine-learning, fine-tuning, failures, learning]
draft: true
---

For the past few months I've been doing the classic thing: getting obsessed with LLMs in the safe, cozy way.

First it was theory—Stanford's [Language Modeling from Scratch](https://www.youtube.com/playlist?list=PLoROMvodv4rOY23Y0BoGoBGgQ1zmU_MT_). Then it was "okay, now let's actually train stuff"—Zach Mueller's [distributed training course](https://maven.com/walk-with-code/scratch-to-scale).

At some point I realized I was in a loop that *felt* productive but wasn't giving me that sharp "oh wow I actually understand this now" feeling. I needed something small, contained, and a little dumb so I could move fast and hit a wall.

So I decided to fine-tune an LLM to do something extremely important for humanity:

**Generate anime titles from synopses.**

I used the [MyAnimeList 2025 dataset](https://www.kaggle.com/datasets/syahrulapriansyah2/myanimelist-2025?resource=download). The idea was simple: give a synopsis + genres, get a short catchy title. In my head it was going to be a two-day win. In reality it turned into a very educational spiral of: *hope → confusion → "wait, why is it doing that" → hope again → flop again*.

Here are the cold numbers before we get into the feelings:

- **Model:** `mistralai/Mistral-7B-Instruct-v0.2` (LoRA)
- **Hardware:** 8× A100 40GB (Lambda Cloud)
- **Total instance uptime:** 2.55h
- **Total cost:** $36.51 (~$14.32/hr)
- **Iterations:** 4

Under the hood it was pretty standard modern HF stack:

- Transformers + PEFT (LoRA)
- Distributed training: PyTorch DDP via `torchrun`
- Optimizer vibes: bitsandbytes 8-bit AdamW-ish (mostly to keep memory chill)

And the headline outcome:

I didn't get "catchy English anime titles".

I got stuff like:

- `1125-nen no Taiji Seiheiki: Kyoukai no Tsuki - Tenkai-hen - Omake Movie - ...`
- `2.43: Seiin Koukou Danshi Volley-bu OVA - Koi to Tsudzuku! Hatsumode!`
- `Time Breaker Zero! (TV) Recaps Episode 1-4`

It wasn't *random*. It was consistently confident. And it was consistently wrong in the same very specific way.

---

## What I thought I was training vs what I actually trained

This is the part that embarrassed me a little.

I thought I was teaching the model:

> synopsis → title

But the dataset was basically teaching it:

> "How to *sound like* MyAnimeList titles" → recombine title fragments and metadata templates

Once I saw that clearly, the whole project clicked. Before that… I kept thinking each new tweak would be "the one".

---

## Data prep (where I felt confident for ~30 minutes)

I built a simple supervised dataset: input prompt + target title.

My prompt template looked like this:

```
### TASK
You are an assistant that creates short, catchy anime titles.

### INPUT
Genres: {genres}
Synopsis: {synopsis}

### OUTPUT
Title:
```

One more detail that mattered more than I expected: I masked the prompt tokens (labels = -100) so the loss was only on the title tokens. In my head that was “clean”: don’t learn the scaffold, learn the title.

In practice… it just meant the model got *really* good at producing MAL-shaped titles.

One stupid mistake that cost me time early: I had a mismatch between how I built prompts for training vs inference ("description" in one place, "synopsis" in the other). Fixing it changed the outputs a bit, but it didn't change the overall failure mode.

I remember thinking: "Maybe that was it. Maybe that was the whole issue." Spoiler: it was not.

---

## Setup (what I ran / what mattered)

This part was honestly the least interesting and also the most expensive.

- Base model: `mistralai/Mistral-7B-Instruct-v0.2`
- Fine-tune method: LoRA (because I wanted fast iterations and low risk)
- GPUs: 8× A100 40GB

I ran everything with `torchrun` because I wanted the 8×A100 speed-up (and also because I wanted to feel like I’m “doing distributed training” for real).

That immediately came with a few "why is this breaking" moments:

- You can’t use `device_map="auto"` with DDP.
- Gradient checkpointing + DDP can be fussy; I ended up needing `ddp_find_unused_parameters=False`.
- When I used `uv`, I had to remember to run `torchrun` through it, otherwise it couldn’t see the venv.

By iteration 4 I landed on a configuration that was intentionally modest. The goal wasn't SOTA; it was fast feedback.

If you’re curious, the pieces that mattered most:

- **LoRA rank:** I eventually dropped to **r=8** with higher dropout to slow down memorization.
- **Masking:** prompt tokens had label -100, so loss was only on the title.
- **Max steps:** I capped at **300** because I kept seeing the same story: training loss goes down, eval loss doesn’t, outputs get worse.

And just to ground the “scale” here: with `per_device_train_batch_size=4` and `gradient_accumulation_steps=4`, across 8 GPUs, the effective batch size was **128**. It sounds big and fancy. It did not make the titles less cursed.

I also learned a very practical lesson about cloud training: the compute is rarely the expensive part.

Only ~40 minutes of my total time was actual forward/backward. The rest was me doing "just one more tiny change" loops, staring at outputs like a confused detective.

---

## Iteration 1: The "this is going to be easy" phase

I started with r=16, α=32, low dropout. Classic LoRA defaults.

I gave it ~300 steps (about 3 short epochs for this dataset setup), and it really was quick: 

> ~10 minutes of actual training

So of course my brain went: “Nice. Cheap. Fast. This is going to work.”

Loss dropped. I felt that dopamine hit. I ran inference.

And the model gave me titles that looked like someone spilled an anime encyclopedia onto the keyboard.

It wasn't even trying to be short. It was happily outputting long chained titles with seasons, OVAs, "specials", episode ranges, all that. My immediate reaction was: "Okay, so… it learned *the wrong thing* really fast." Which was both impressive and deeply annoying.

I told myself: no big deal. The dataset is noisy. I’ll clean it and it’ll snap into place.

---

## Iteration 2: Cleaning the titles (a.k.a. denial)

This is where hope really kicked in.

I wrote a `clean_title()` regex monster: remove “Season X”, years, OVA/Movie suffixes, “Part 2”, long tails after dashes/colons.

I also tightened decoding: fewer tokens, repetition penalty.

Then I reran training thinking: *Surely now the model can’t hide behind metadata.*

And… it still did.

The output changed shape, but it didn't change nature. Instead of long messy metadata chains, I started getting these weird truncated hybrids: number prefixes + romanized Japanese fragments + a sprinkle of English action nouns.

Examples from this stage felt like:

- `100-nen Shoukoku Meitantei Chou Kagetsu-`
- `1-ji wo Seta Koi Monogatari: Harem de Matsur`

which is… not even wrong in an interesting way. Just “anime dataset autocorrect”.

It felt like making a messy room slightly less messy and convincing yourself you cleaned it.

---

## Iteration 3: Okay, now I’ll get serious (and it still flops)

At this point I was a little annoyed, but also kind of excited because it finally felt like “real work”.

I did aggressive filtering:

- throw away titles that are too long
- throw away titles with too many weird characters
- restrict word counts

I reduced capacity (LoRA r=8) and added dropout.

Then I watched the losses:

```
Step 100: train 1.31 | eval 1.50
Step 200: train 1.04 | eval 1.58
Step 300: train 0.82 | eval 1.58
```

This is where the frustration got very specific.

Because the curve looks like “progress”. Training loss is dropping beautifully. And then evaluation loss just sits there like: *lol no*.

And the samples were… almost comical:

- `10-nin no Shikkaku Sekai Saver X`
- `1-sai D-class Suki ni Nattemo`
- `3D Kanojo World Break! The Animation Reiwa Sh`

Not random, not broken. Just confidently doing the wrong job.

This is also where I started noticing a repeating title skeleton:

> `[Number]-[Japanese-ish token] [English-ish token] (maybe "The Animation") (maybe era word like Reiwa)`

Like the model discovered a cookie cutter and refused to stop using it.

This is when I started suspecting that the problem wasn't “overfitting” in the abstract. The problem was that I was asking the model to learn something the dataset doesn't actually support very well.

Still, I wasn’t ready to accept that. I wanted one more try.

---

## Iteration 4: The “maybe English-only will save me” cope

My last burst of hope was the English-only filter.

The thinking was: maybe the romanized Japanese fragments are the core issue. Maybe if I force it into English titles, it’ll start behaving like a normal title generator.

So I implemented an “English-only” heuristic.

Then I discovered the most annoying fact in the entire project:

Romanized Japanese is still ASCII.

The filter removed **148 out of 13,229** titles.

I remember staring at that number and laughing, because what else do you do.

I also tightened training: shorter run (300 steps), more frequent eval/checkpoints, better logging. I wanted a clean post-mortem and fewer vibes.

And yep: divergence kicked in around ~step 150 again.

I had a nice training-metrics dashboard here at the end, which made the post-mortem very unambiguous.

(I’m not embedding it here yet because I still need to drop the image file into the repo alongside the other screenshots — more on that below.)

The graph basically says: “Your optimizer is fine; your *data mapping* is not.”

I compared checkpoints too, because at this point I didn’t trust my own vibe-based conclusions:

- Step 150 was the least-overfit and the least-unhinged… but still doing the same pattern.
- Step 250 and 300 were just that pattern turned up to 11.

When I tested checkpoint 150 specifically, I wanted so badly for it to be “good enough”. Instead I got things like:

`4-nin no Kimi (TV) Gaiden Yosh`

That was the moment it fully clicked that “early stopping” wasn’t going to save this.

That’s when the last bit of hope died.

---

## So why did it fail?

It failed because I wanted a semantic mapping that the dataset doesn’t really contain.

MyAnimeList titles aren’t just “a summary of the synopsis”. They’re culturally weird (in a good way), full of conventions, and often only loosely tied to the synopsis. They also carry a ton of metadata: TV/OVA/Movie, seasons, recaps, episode ranges, etc.

So when I asked:

> "Given a synopsis, produce a short catchy English title"

The model heard:

> "Given some anime-ish context, produce something that looks like a MyAnimeList title"

And it did.

This sounds obvious in hindsight. It was *not* obvious while I was happily tweaking hyperparameters like that was the missing ingredient.

---

## What it taught me (and why I’m still happy I did it)

This whole thing cost **$36.51** and I got a much sharper understanding of a few things:

- You can’t regularize your way out of a dataset that doesn’t encode your task.
- Training loss going down can be emotionally misleading.
- Comparing checkpoints is worth it. It kills “maybe it’s just decoding settings” delusion quickly.
- Cleaning with regex is not the same as cleaning with semantics.

Also: small projects like this are insanely good for learning. I’d rather spend $36 and feel confused/frustrated for an afternoon than spend three months “understanding” fine-tuning only in the abstract.

One more honest cost detail: the GPU math is neat on paper, but **utilization** is a different story. The raw training across all iterations was ~40 minutes. The rest of my 2.55 hours was me re-running, inspecting, tweaking, staring, rerunning again.

This is not a complaint. It’s just… the actual lived experience of doing this kind of work.

---

## If I wanted it to actually work (different plan)

If I keep going, I’m not going to do another round of “maybe tweak LoRA rank again”. I’d change the data instead:

- curate or generate 500–1,000 clean pairs (synopsis → short English title)
- use a strong model to propose multiple candidate titles per synopsis (different vibes)
- maybe do it in two steps: (1) neutral concept title, (2) anime-style rewrite

Or honestly? Just skip fine-tuning and do few-shot prompting with a frontier model.

---

## TL;DR

I tried to fine-tune Mistral-7B to generate anime titles from synopses. I kept thinking each iteration would be “the one,” and each time it flopped in a new flavor. The model didn’t learn a synopsis→title mapping—it learned MyAnimeList title templates. Total bill: $36.51. Total value: very high.

If you want visual proof of “it learned the wrong thing fast”, here are two artifacts from the earlier attempts:

![First attempt: generated titles still bad](/fine-tune-llm-anime-title/first_attempt_generated_titles_bad.png)

![Second attempt: still bad](/fine-tune-llm-anime-title/second_attempt_still_bad.png)

---

*Thanks for reading. If you try this with synthetic data and it actually works, please send it to me so I can pretend this post was foreshadowing.*