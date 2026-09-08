# mesh-core roadmap

Structural gaps found while working. Each is about the shape of the code, not a bug in it.

mesh-serve and mesh-web keep their own with tracks A–F; this repository uses **U** for the UI design
and **K** for the chromes, so a reference like U2 is unambiguous across repositories.

---

## Track U — the UI design

### U1 — There are no design tokens

Colour, type scale and spacing exist only as literal values in `src/ui/ui.css`. Nothing is named,
nothing is documented, and nothing stops a thirteenth component picking a thirteenth grey.

This is why two screens can follow every rule in `spec/ui/` and still not look like each other. The
rules govern behaviour; nothing governs appearance.

Wanted: a named set — surface, border, text, muted, accent, danger; a type scale; a spacing scale —
defined once as custom properties, documented in `spec/ui/`, and the only values any component may
use. A component using a literal colour then fails review with something to point at.

### U2 — Two of the five states cannot be expressed

```ts
type EntityListStatus = 'idle' | 'loading' | 'error' | 'ready' | 'empty';
```

No `unauthenticated`, no `refused`. `spec/ui/states.md` requires all five of every view, and the
vocabulary can carry three.

The consequence is not cosmetic: every app hand-rolls the two hardest states, and they all differ.
The catalog console said `Failed to load catalog parts (unauthorized)` for a week because the only
state it could reach for was `error`.

`idle` is also not a state a person can be in — nothing is idle, it has either started loading or it
is waiting for a session.

Wanted: a status type carrying all five, with the refusal reason as data, so a view that forgets one
does not compile.

### U3 — No component can express a refused or a busy control

Two rules with nothing to obey them with:

- **states §4** — a control that is visible, disabled, and labelled with what is missing. The people
  app renders its own strings inline (`src/people/views/people.ts:143-145` in mesh-operator);
  nobody else does it at all.
- **rules §3** — the control that starts slow work shows the work and cannot be fired twice.
  `builder.release_repo` takes forty seconds. Every long-running button implements this by hand or
  not at all.

One component covers both: a button taking an `Availability` and a pending state. Its absence is why
refusals and progress are the least consistent things in the product.

> A rule the components cannot express is a rule that will be broken.

### U4 — The scroll model is unsettled between the two chromes

`spec/ui/anatomy.md` says INDEX and DETAIL scroll independently and the view fills its surface
without growing it. "Fills its surface" means something different under a windowed chrome, which
sizes the view, and a routing chrome, which hands it the page.

It needs one answer that works under both before the anatomy document can move from Proposed to
Decided.

---

## Track K — the chromes

### K1 — The app-spec format lives here and should not

`spec/apps/README.md` defines what an app spec contains. mesh-operator writes specs to it too, and
neither repository owns it. It belongs in `mesh-web/spec/` beside `application.md`, which already
defines what an Application *is*.

Not moved while a dispatch is reading it at this path. Also recorded as O1 in mesh-operator.

### K2 — The operator app moves to mesh-operator once it is one unit

Four intertwined applications now; a directory rename once the fold lands. mesh-core keeps the
shell, the chromes and the design system; mesh-operator keeps the management apps.

The split that follows: **mesh-core is the design system and the two chromes. mesh-operator is
everything a platform is operated with.** `spec/apps/operator.md` moves with the code.
