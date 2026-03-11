---
title: Elegant Objects GPT
date: 2024-04-29T10:15:43.000Z
description: >-
  A custom GPT app that reviews your code based on principles from Elegant
  Objects and Clean Code. Try the LLM-powered code reviewer.
tags:
  - oop
  - gpt-app
  - code-reviews
readTime: 2
keywords:
  - clean code
faq:
  - q: "What is the Elegant Objects GPT app?"
    a: "It is a custom GPT called LGTM that reviews code based on object-oriented principles from Elegant Objects by Yegor Bugayenko and Clean Code by Uncle Bob. You paste code snippets and it suggests improvements."
  - q: "What principles does the LGTM code reviewer check for?"
    a: "It checks for SOLID principles and key advice from Elegant Objects, such as proper object design, naming conventions, and code structure. The emphasis is on actionable, specific feedback with code examples."
  - q: "Can I use this GPT as an automated pre-commit code reviewer?"
    a: "The GPT app is a manual tool where you paste code for review. The author's long-term goal is to build an automated tool that inspects staged changes before commits, ideally using a local or company-deployed model for privacy."
---

I recently read the book ["Elegant Objects" by Yegor Bugayenko](https://www.amazon.com/Elegant-Objects-1-Yegor-Bugayenko/dp/1519166915) (not an affiliate link).
I thought a lot of the advice mentioned in the book is reasonable, and sometimes can be hard to follow on a daily by applying it on code reviews for example, so I figured I need to find a way to bridge that gap.

Ultimately, I'd love it if there was a tool that would inspect my staged changes before a commit, and based on some 'good practices' from the book, would suggest improvements. essentially having my personal LLM code reviewer.
Yes there's a privacy issue, so it would have to be a local model, or a company-deployed model.

Before I go there, I did want to experiment with it and fine-tune my instructions so I created a [GPT app](https://chat.openai.com/g/g-a7hsiSnIv-lgtm).

The prefix of the instructions I gave the app are:

```
Objective: This GPT tool is designed to assist developers in reviewing their local code changes based on rigorous object-oriented principles from "Elegant Objects" by Yegor Bugayenko and the book "Clean Code" by Uncle Bob, ensuring each piece of code adheres to high-quality design standards.

You will be given code snippets, in which you are expected to suggest improvements and point out violations of the principles mentioned in both books.
Give actionable feedback and be specific with your suggestions. If applicable, share code snippets, showcasing your suggestions, and do elaborate on the reasoning for any of the suggestions.

Consider all principles mentioned in both books, but put an emphasis on the following:

...
```

Right after this prompt, I have attached a summary of the SOLID principles, and many of the advice mentioned in the Elegant Objects book, trying to give better guidance on what I think is more important to focus on.

I called this app **LGTM**, and you can access it right [there](https://chat.openai.com/g/g-a7hsiSnIv-lgtm).

Would love to hear your ideas of extending this or improving the prompt; here's how you can [contact me](/about/).





