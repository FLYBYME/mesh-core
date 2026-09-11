# mesh-core, for someone arriving cold

**The design system and the two chromes.** The vocabulary every screen is drawn with, the credential
seam that holds a session, and the identity application.

This file exists because every dispatch re-derives the same facts. mesh-serve measured it in its own
transcripts — one store file opened 33 times, one roadmap 24 — and this repository had **no brief at
all** while taking four dispatches in a day. **Read this first; it is the index, not the
documentation.**

## The parts this repository ships

`mesh.json` is the source of truth. Four parts, and a repository holds many (decision 0005):

| id | kind | what it is | start here |
| --- | --- | --- | --- |
| `ui` | extension | the vocabulary: eleven components, three composites, the tokens | `src/ui/contract.ts` |
| `auth` | extension | holds the session, attaches the ticket, handles revocation | `src/auth/extension.ts` |
| `identity` | application | organizations, members, the roles they hold | `src/identity/index.ts` |
| `chrome` | — | the console shell: tabs, status line | `src/chrome/chrome.ts` |

`ui` declares `"import": "@flybyme/mesh-core/ui"` — **that is how another repository's part imports
it.** A part is bundled with one specifier external and everything else inlined from its own clone,
so before that entry existed no part outside this repository could call `Label`.

## Three layers, and only one of them is a driver

Getting this wrong is a twenty-minute detour that has already been taken:

| | what it is | cost of a new one |
| --- | --- | --- |
| **composite** | pure description **with state** — owns a temp input value | free on every renderer |
| **component** | pure description, no state | free on every renderer |
| **primitive** | a name the renderer must know how to build | **every renderer must implement it** |

`declarations.components` takes the **primitive** kind and has zero users, which is the healthy
outcome rather than a gap. The fourteen here are **called** — `ui.Card({ … })` — never named.

## Things that are true and expensive to rediscover

**A composite takes `on`, and it is not optional.** A composite is constructed by `create(props)`, so
it has no view to ask for a handler table. For as long as there was no way to hand it one, the three
composites **made an id up** — `ui.ActionButton:${command.action}` — which nothing registered. An
unresolved handler is a stale event rather than a crash, so the button rendered, looked perfect, and
did nothing, while every test passed because each called `run()` instead of pressing it. **Press the
control in a test. Calling its handler proves nothing.**

**A part derives its tokens; it does not define the host's.** `mesh-web/src/kernel.css` never defines
`--ink`, `--surface`, `--edge`, `--accent` — it *consumes* them with inline fallbacks, because the
**site's theme** is what sets them. So every token here is `--ui-` prefixed and the host-owned ones
are written `--ui-ink: var(--ink, #e6edf3)`, with the fallback copied from the kernel. Defining them
directly reskins the window chrome around a composed part, and three values came out wrong when it
did.

**CSS comments do not nest, and this file's neighbour was truncated at its own header for a day.**
`ui.css` spelled out a comment annotation inline, the header ended at that inner terminator, and a
browser swallowed the entire token layer as a bogus rule's body — every token undefined on the live
page, every test still green, because browser tests mount components without that stylesheet.
`test/ui.source.spec.ts` checks for it now. **A thing valid to every tool that reads it as text can
be invalid to the only thing that parses it.**

**`min-height: 0` is load-bearing on anything that scrolls.** A flex item's default `min-height` is
`auto`, so it will not shrink below its content and `overflow-y: auto` never engages. A list grew to
1119px inside a 240px container; a table clipped its last rows with no scrollbar to say so. Both were
invisible under ten rows, which is the size everything is built and tested at. `test/scroll.browser.test.ts`
uses thirty.

**Two test projects, two scripts.** `npm test` runs typecheck + `test:source` (node) + `test:browser`
(a real browser). `npm run test:browser` alone is the browser half. A source scan cannot live in the
browser project — `node:fs` is externalised there.

## Where the rules live

`spec/ui/` is the design set and it is not decoration:

- `states.md` — **the five states every view answers**: loading, empty, unauthenticated, refused,
  error. `empty` is a destination that offers the control that fills it. **Error must not eat a
  refusal**; a 403 renders §4, not §5.
- `rules.md` — §3 a slow control shows the work and cannot be fired twice; §7 a destructive one
  confirms.
- `anatomy.md` — HEADER, INDEX, DETAIL. §The scroll model is still Proposed (U4).
- `tokens.md` — the named set, and the only values a component may use.

> **A rule the components cannot express is a rule that will be broken.** That sentence is why Track
> U exists; three of its items were closed by finding the rule had nothing to obey it with.

## Before you change anything

- `spec/roadmap.md` — **check your task is not already closed.** It has happened, and one dispatch
  closed an item by editing the requirement to match the code rather than the code to match the
  requirement. Both documents then agreed with each other, which is the hardest version to catch.
- `as any` and `as never` are **bugs here, not style nits**. This project exists because full type
  safety was worth rewriting a framework for. Five came out of two repositories in one day and one
  of them was hiding the fact that a test proved nothing.
- Do not edit `mesh-web` or `mesh-serve` from here. Write the finding into `spec/roadmap.md` with its
  evidence and work around it.
- `@flybyme/mesh` is **frozen** — bug fixes only.
