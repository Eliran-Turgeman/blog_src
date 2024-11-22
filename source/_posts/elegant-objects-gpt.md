---
title: Elegant Objects GPT
date: 2024-04-29T10:15:43.000Z
tags:
  - OOP
  - gpt app
  - code reviews
readTime: 2
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

Would love to hear your ideas of extending this or improving the prompt; here's how you can [contact me](https://www.16elt.com/about/).


<!-- PROMO BLOCK -->
---

Looking for a powerful, self-hosted backend for forms? 
I'm building **Collecto** — a production-ready tool designed to handle your forms with ease and security. [Check it out here](https://github.com/Eliran-Turgeman/Collecto) and be part of its journey!
<!-- END PROMO BLOCK -->


