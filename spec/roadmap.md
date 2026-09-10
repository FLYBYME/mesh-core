# mesh-core roadmap

Structural gaps found while working. Each is about the shape of the code, not a bug in it.

mesh-serve and mesh-web keep their own with tracks A–F; this repository uses **U** for the UI design
and **K** for the chromes, so a reference like U2 is unambiguous across repositories.

---

## Track U — the UI design

**U1, U2 and U3 are one issue — FLYBYME/surfdns#74** — because they are one shape: *a rule every
screen must follow, with nothing in the vocabulary to follow it with.* All three have already been
broken in exactly the way the gap predicts. U4 is separate and is a decision, not a component.

**Where the three stand, 2026-09-10:** U1 closed with tokens, a doc and a check that fails a literal
colour by file and line. U3 was already closed before the dispatch that reported it — `ActionButton`
reads `command.available()` and `press.browser.test.ts` presses it twice. **U2 is open**, narrowed
from *the list needs five states* to *a refusal that arrives at request time has nowhere to go*.

### U1 — There are no design tokens · **closed 2026-09-10**

Colour, type scale and spacing exist only as literal values in `src/ui/ui.css`. Nothing is named,
nothing is documented, and nothing stops a thirteenth component picking a thirteenth grey.

This is why two screens can follow every rule in `spec/ui/` and still not look like each other. The
rules govern behaviour; nothing governs appearance.

**What landed:** A named token set in `@layer ui.tokens` inside `src/ui/ui.css`, extending and
naming the thirteen theme variables that were already referenced but never defined. Every literal
rgba, hex, and raw-px spacing value in `@layer ui.components` is replaced with a token reference.
The full set is documented in `spec/ui/tokens.md`.

**The check:** `test/ui.source.spec.ts` (the `css uses tokens, not literals (U1)` suite) scans
`src/ui/**/*.css` for hex literals, `rgb()`/`hsl()` in the components layer, and raw `px` in
`gap`, `padding`, and `margin` declarations. It fails naming the file and line number. A place
that genuinely requires a literal carries a `/* ui-literal: <reason> */` comment on the same line;
the check strips those lines before scanning. The reason must be non-empty; an empty opt-out is
not accepted.

**`idle` decision:** `idle` is removed from `EntityListStatus`. The replacement is
`'loading' | 'ready' | 'empty' | 'error'` — four values, not five. The gap that `idle` was
filling is answered by `Availability` (see U2).

### U2 — A refusal that arrives at request time has nowhere to go · **closed 2026-09-10**

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

**What landed:** `EntityListStatus` is `'loading' | 'ready' | 'empty' | 'error'` — four values, not
five. `idle` is gone. `refused` and `unauthenticated` are **not** list states; they are answers to
*may I*, which is `Availability`. A list that cannot be read is a list whose read command is
unavailable. The compiler enforces exhaustiveness: a `switch` over `EntityListStatus` that omits
`'empty'` or `'error'` is an error.

**How a refusal arrives mid-flight:** The `error` prop on `ui.EntityList` and `ui.Table` was updated to accept `string | { refused: string }`. When a read fails with a 403 `forbidden` or 401 `unauthorized`, the collection yields a failure. The app's `error` computed maps this to `{ refused: describe(failure) }` and passes it to the view. `EntityList` and `Table` check for this shape and render states §4 (a refusal message) rather than states §5 (a generic network error).

*Closed as done by dispatch 21 on the strength of the first argument, corrected the same day. Noted
because the correction is the interesting part: **the dispatch edited the requirement to match the
code rather than the code to match the requirement**, and both documents then agreed. This
repository has now produced that shape five times (mesh-serve V9's `membership.find`, F25, F29, F30,
and this) — a sentence asserting a guarantee with nothing calling the code that would keep it.*

**Why four and not a discriminated union with refusal reason as data:** The request was for a status
type carrying all five with refusal reason as data. The answer is that `refused` and
`unauthenticated` are not list status at all — they are `Availability`, which is already a
discriminated union (`{ can: true } | { can: false; why: string }`). Duplicating that shape into
`EntityListStatus` would be two representations of the same fact, and the `ActionButton` composite
already reads `Availability` from the command and renders the refusal reason. The correct model is:
before asking for a list, check `available()`; if refused, render the refusal (states §4), not the
list.

### U3 — No component can express a refused or a busy control · **closed 2026-09-10**

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

**What landed:** `ui.ActionButton` is a composite that takes a `BoundCommand` and a `Registrar`.
It reads `command.available()` and renders the button disabled with the refusal reason in the label
when refused; it sets `running` to true when the command is dispatched and prevents a second
dispatch while the first is in flight. The `Availability` type from `@flybyme/mesh-web` is the
carrier — no second type was defined here.

**The double-press test:** `test/press.browser.test.ts` (`ignores a second click while the first is
still running`) mounts a real application in a real browser, clicks the button twice before the
first run resolves, and asserts the command ran once. `test/ui.test.ts` (`a running command cannot
be fired twice`) covers the same claim via `button.run()`. Both assert behaviour, not a `disabled`
attribute.

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


### K2 — The 32 browser tests for catalog, releases, sites, and fleet were never ported · **open**

**Status update 2026-09-10:**
The audit confirmed that the 32 browser tests were deleted in commit `ead7cf2` without being ported. The `mesh-operator` repository contains a replacement app (tested in `console.browser.test.ts` with ~20 tests), but it does not port the comprehensive tests for `catalog`, `releases`, `sites`, and `fleet` behaviors (such as importing a repo, resolving versions, or provisioning fleets). 

**32 browser tests were lost.** The behaviour of the platform operator features is now largely uncovered by browser tests. The `mesh-operator` repository owns the port and should rebuild this coverage.

The split that follows: **mesh-core is the design system and the two chromes. mesh-operator is
everything a platform is operated with.** `spec/apps/operator.md` has already moved ahead of the
code, which is the right order.
