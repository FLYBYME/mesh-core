# mesh-core roadmap

Structural gaps found while working. Each is about the shape of the code, not a bug in it.

mesh-serve and mesh-web keep their own with tracks A–F; this repository uses **U** for the UI design
and **K** for the chromes, so a reference like U2 is unambiguous across repositories.

---

## Track U — the UI design

**U1, U2 and U3 are one issue — FLYBYME/surfdns#74** — because they are one shape: *a rule every
screen must follow, with nothing in the vocabulary to follow it with.* All three have already been
broken in exactly the way the gap predicts. U4 is separate and is a decision, not a component.

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

### U5 — `ActionCard` can be submitted and cannot be dismissed

*Found 2026-09-10, giving the identity app a working New-organization form.*

`ActionCardProps` has `primaryLabel`, `confirmation`, `onResult` and `onError`, and **no secondary
action**. So a card opened in place has no way out of itself, and every screen that opens one writes
its own Cancel beside it — which is the wheel `ui` exists to stop being reinvented, in the component
whose whole job is to be the form nobody hand-writes.

`identity/view.ts` does exactly that today, wrapping the card in a `Stack` with a button, and says so
at the call site. The second screen to open a form will write a slightly different one.

Wanted: `secondaryLabel` and `onSecondary`, defaulting to absent so a card that is not dismissible
stays as it is. **S.**

The related question, worth deciding at the same time and not the same thing: **a form that opens in
place versus one that opens over.** `confirm` is already a layer that dims and covers, and
`spec/ui/anatomy.md` gives an app regions rather than layers. The identity form is a band that pushes
the regions down, on the argument that nothing it covers is needed to fill it in — but that is one
screen's judgement, made once, and it is the kind of thing the vocabulary should decide for
everybody.

### U6 — `ui.SignIn` is in place only, because a dialog open at mount is not modal

*Found 2026-09-10, building `ui.SignIn`.*

The kernel's `Dialog` primitive is a real modal — native `<dialog>`, `showModal()`, focus trap —
**when it is opened after mount.** Opened *at* mount, which is exactly when a signed-out page would
open a sign-in, it is not: the element is not connected yet, `showModal()` throws, mesh-web's
`openModal` (`src/render/dom.ts`) falls back to the `open` attribute, and its microtask retry is
gated on `!el.open`, which the fallback just made false. Measured with `ui.Dialog` alone: opened
after mount, `:modal` and `position: fixed`; opened at mount, neither, and `position: absolute` over
the window's content — one more layer over windows, the shape of mesh-web **A8.16**.

So `ui.SignIn` ships as a card in place, and the modal variant (`ui.Dialog({ open, children:
[card] })`, a few lines) waits on the renderer. The fix is mesh-web's: retry `showModal()` once
connected regardless of the fallback attribute. Also the concrete half of U5's *in place versus
over*. **S** (mesh-web) · then **S** here.

---

## Track K — the chromes

### K1 — The app-spec format lives here and should not · **unblocked 2026-09-07**

`spec/apps/README.md` defines what an app spec contains. mesh-operator writes specs to it too, and
neither repository owns it. It belongs in `mesh-web/spec/` beside `application.md`, which already
defines what an Application *is*.

~~Not moved while a dispatch is reading it at this path.~~ **The dispatch merged (#68). Nothing is
reading it at this path any more, so the stated reason not to move it is gone.** Move it, leave a
pointer behind, and update the four specs that cite it. Also recorded as O1 in mesh-operator.

### K2 — The operator app moves to mesh-operator · **unblocked 2026-09-07**

~~Four intertwined applications now; a directory rename once the fold lands.~~ **The fold landed.**
`src/operator/` is one application: `index.ts` at 187 lines holding only the manifest, twelve view
files and six command files, every one under 300, with `test/operator.spec.test.ts` checking the app
against its own spec. `mesh.json` no longer declares catalog, releases, sites or fleet.

So this is now the directory rename it was always going to become, with one thing standing in front
of it: **`src/catalog`, `src/releases`, `src/sites` and `src/fleet` are still on disk.** They ship
nothing, but their 32 browser tests are the only browser coverage of that behaviour and were never
ported onto the folded app — which has conformance coverage and no browser coverage. **Port the
tests, then delete the four, then rename.** Deleting first trades a merge for a hole in the suite.

The split that follows: **mesh-core is the design system and the two chromes. mesh-operator is
everything a platform is operated with.** `spec/apps/operator.md` has already moved ahead of the
code, which is the right order.
