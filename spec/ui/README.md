# The UI design

**Status.** Decided where it says Decided. This set is design — what a screen should be. The
*mechanism* — how a part publishes a component, how class names are owned, how styling leaves
TypeScript — is `mesh-web/spec/components.md` and is not repeated here.

## Why this set exists

Two complaints, both the same complaint:

> "every 'app' we build is like gimp"

> "i dont want apps looking all fucked up and not all things been added"

Four consoles were written on four days by four sittings. Each invented its own loading state, its
own sign-in check, its own selection, its own idea of what a list looks like. Nobody chose that.
It happened because there was a component library and no design — twelve components and no document
saying what a screen made of them should be.

A component library answers *what may I draw*. This set answers *what should this screen be*, and
without it every screen is a fresh argument settled by whoever wrote it that day.

## The through-line

**A screen is derived, live, and honest.**

- **Derived** — from `_describe` and from the collection, never from a hand-written list (rules §5).
  A screen that restates the server is a second copy of the truth, and the copy goes stale.
- **Live** — collections stream. A list moves on its own or says it is not moving (rules §1).
  A refresh button is an admission that the screen does not know what is true.
- **Honest** — it shows what it cannot do and why, rather than hiding it (rules §4, §2). The five
  states in [states.md](./states.md) are all five, on every view, including the two that are
  uncomfortable.

Everything below follows from those three.

## The documents

| | |
| --- | --- |
| [rules.md](./rules.md) | The nine rules. If a screen breaks one, the screen is wrong. |
| [anatomy.md](./anatomy.md) | The shape of a view: regions, scroll, and where a control lives. |
| [states.md](./states.md) | The five states, drawn. The anti-"fucked up" document. |
| [vocabulary.md](./vocabulary.md) | The twelve components: which for which job, and when not to. |
| [tokens.md](./tokens.md) | The design token set: colour, spacing, type scale, radius. Every component value comes from here. |
| [responsive.md](./responsive.md) | One design, many surfaces. Why there is no `isMobile`. |
| [words.md](./words.md) | Labels, errors, confirmations. The half of the UI that is prose. |

App specs — what a *particular* app must contain — are a different thing again, and their format is
`spec/apps/README.md`.

## Where the rules came from

`rules.md` was written in mesh-operator as `RULES.md`, for one repository's consoles. It constrains
every app in every repository, and the components it talks about live here, so it lives here.
mesh-operator keeps a pointer.

## What this set does not cover

~~**Colour, type scale and spacing tokens.** They are in `src/ui/ui.css` and nowhere else, undocumented
and unnamed. That is a real gap and it is why two screens can follow every rule here and still not
look like each other — recorded as **U1** in [roadmap.md](../roadmap.md).~~

**Colour, type scale and spacing tokens are now defined and enforced.** The token set lives in
`@layer ui.tokens` in `src/ui/ui.css`, is documented in `spec/ui/tokens.md`, and is enforced by
`test/ui.source.spec.ts`. U1 is closed.

