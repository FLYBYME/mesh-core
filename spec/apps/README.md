# App specs

An app spec says what one Application contains, before anybody writes it and after everybody has
forgotten. `mesh-web/spec/application.md` says what an Application *is* — that argument is settled
and is not repeated here. This directory is the other half: what a *particular* app must contain to
be finished.

**Status.** Format: **Decided**. Each spec carries its own status.

## Why these exist

Two failures, both real, both from this codebase:

**Apps that look wrong.** Four consoles, each with its own sign-in check, its own loading/stale/error
tri-state, its own selection model. They already behaved differently from each other, and nobody
decided that they should — it happened because four files were written on four days.

**Apps that are missing things.** `site` exposes `create` on the server. No UI creates a site. That
is not a decision anybody took; the view was written when `create` was internal and nobody went back.
A person operating the platform hits a wall that exists for no reason, and there is nothing in the
repository that would have caught it.

A spec fixes the first by writing the shared shape down once. It fixes the second by listing the
actions, and by requiring that the list be **derived from the server, not typed by hand** — see
Conformance.

## The rule that makes this worth doing

> **Every action the API exposes has a home in the UI, or the spec says why not and links the issue.**

Silence is the defect. An app that offers read and create but not update is fine *if the spec says
update is internal and points at the issue*. It is broken if update is exposed and simply absent.

The corollary is that a spec is not a wish list. It describes what the server offers **today**, and
the "Not yet exposed" section is where the wishes go, each with an issue number. A spec with an
empty "Not yet exposed" section is either finished or lying.

## Sections

Every app spec has these, in this order. An empty section is written as "None" — deleting it hides
the question.

### 1. What it is for

One paragraph. Who the person is and what they came to do. No feature list. If you cannot name the
person, the app is a menu, not an app.

### 2. Views

A table: `id`, `title`, the question the view answers, `instances`, and any `window` hints.

A view answers one question. "Catalog" is not a question; "what is published, and at what versions"
is. If two rows answer the same question they are one view with a filter.

### 3. Data

Every collection the app reads, with its `scopedBy`, and how it reads it — `cx.models(...)` for a
live collection, a tool call for anything derived. A collection read by a one-shot call when a live
model exists is a defect against RULES §1.

### 4. Actions

The coverage table. One row per collection, one column per CRUD action, plus a row block for the
non-CRUD tools. Each cell is either:

- **the view and control that performs it** — `sites › new site button`
- **`internal`** — the server does not expose it, with the issue number
- **`n/a`** — the action does not exist on that contract

`n/a` and `internal` are different and must not be conflated. `internal` is a thing that should
work and does not; `n/a` is a thing that was never meant to.

### 5. Not yet exposed

Everything the app wants and cannot have, one line each, with an issue link. This is the section
that turns a wall into a ticket.

### 6. States

Every view answers all five, and the spec says what each looks like:

| state | when |
| --- | --- |
| loading | the first read has not returned |
| empty | it returned, and there is nothing |
| unauthenticated | no session — **a state, not an error** (RULES §2) |
| refused | there is a session and the gate says no — say which gate (RULES §4) |
| error | something broke — visible without the console open (RULES §8) |

Five states, every view, no exceptions. Most of what makes an app "look fucked up" is a view that
has only thought about the happy one.

### 7. Routes

The addresses this app answers to, as `(view, params)`. Params are `Readonly<Record<string, Json>>`
and serialisable by construction, so every address in this table is a URL somebody can paste.

A selection that cannot be addressed is a defect: it means "the site I am looking at" cannot be sent
to a colleague.

### 8. Conformance

The checks that fail the build when the spec and the code disagree. **This is the section that makes
a spec worth more than a comment.**

At minimum, every app spec is enforced by a test that:

1. reads the exposure descriptor from `_describe` — the same source the client generator uses
2. collects every action the app declares in `consumes`
3. **fails if the API exposes an action on a collection this app owns that the app does not
   consume** — with the action name in the failure message

That test is why the format's promise holds without anybody remembering to re-read the spec. When
the server exposes `site.update`, the operator app's test goes red the next time the client is
regenerated, and the failure names the action.

## Writing one

Copy `operator.md`. It is the first and it is the model — it covers four views, five collections and
the whole exposed surface, so anything smaller is a subset of its shape.

Keep it short. These are read on a phone, next to the code, by somebody deciding whether a thing is
missing or deliberate.
