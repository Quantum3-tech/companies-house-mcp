# Writing rules for this repo

These rules apply to every Markdown file: README, docs, comments, commit messages.
The voice is mine. A reader should not be able to tell a model was involved.

## Banned outright

- Emoji in headings or anywhere else.
- Em dashes. Use a colon, a comma, or rewrite the sentence.
- The words: seamless, robust, powerful, elegant, leverage, utilise, delve,
  comprehensive, cutting-edge, state-of-the-art, blazing fast, production-ready,
  best-in-class, game-changing, journey, unlock, empower, harness, realm,
  landscape, tapestry, testament.
- Opening phrases: "In today's...", "This project aims to...", "Whether you're
  a... or a...", "Let's dive in", "At its core", "It's worth noting that".
- Closing phrases: "Happy coding", "Feel free to", "I hope this helps".
- Rhetorical questions as section openers. "So why does this matter?" No.
- The construction "It's not just X, it's Y".
- Tricolons used for rhythm rather than meaning. Two items is usually correct.
- A Features section that is a bulleted restatement of the function names.
- Contributing, Code of Conduct, Roadmap or Acknowledgements sections.
  This is a solo project. Those sections are furniture.
- A table of contents in a README under 300 lines.
- Badges, unless the badge reports something true and useful (CI status).

## Required

- First sentence says what the thing does, in plain words, no preamble.
- Second paragraph says why it exists. If the honest answer is "to show I can
  build one", say that. Do not invent a user need.
- A section saying what it does NOT do, and what I would do differently with
  more time. This is the section that proves a human wrote it.
- At least one opinion with a reason behind it. Something I chose and why,
  including what I rejected.
- At least one real output: actual terminal output, actual numbers from a real
  run, an actual response body. Never a placeholder like `<your-result-here>`.
- Numbers from runs I actually did. If I did not measure it, do not claim it.
- Uneven weighting. The interesting part gets paragraphs. Installation gets
  two lines. A README where every section is the same length reads as generated.

## Voice

- First person singular. I built, I chose, I got this wrong.
- Short sentences are fine. Fragments are fine where they land.
- Plain British English. Organise, not organize. Behaviour, not behavior.
- Say the awkward thing. "This is slower than I expected and I have not fixed
  it yet" is worth more than any amount of polish.
- No hedging stacks. Not "it may potentially be possible that". Say it or cut it.
- Do not explain what a well-known thing is. Explain the specific decision
  I made about it.

## Commit messages

- Imperative mood, lower case after the prefix, no trailing full stop.
- Say what changed and why, not what file was touched.
- No conventional-commit scopes unless the repo already uses them consistently.
- Never mention that a model wrote any of it.

## Process rule

When a Markdown file is drafted, read it back and strike anything that could
appear unchanged in a different project's README. If a sentence would survive
a find-and-replace of the project name, it is filler. Cut it.
