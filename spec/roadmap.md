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

### U5 — `ActionCard` can be submitted and cannot be dismissed · **closed 2026-09-10**

*Found 2026-09-10, giving the identity app a working New-organization form.*

`ActionCardProps` has `primaryLabel`, `confirmation`, `onResult` and `onError`, and **no secondary
action**. So a card opened in place has no way out of itself, and every screen that opens one writes
its own Cancel beside it — which is the wheel `ui` exists to stop being reinvented, in the component
whose whole job is to be the form nobody hand-writes.

`identity/view.ts` does exactly that today, wrapping the card in a `Stack` with a button, and says so
at the call site. The second screen to open a form will write a slightly different one.

**What landed:** `ActionCardProps` gained `secondaryLabel` and `onSecondary`. If provided, the
composite renders a secondary button that invokes `onSecondary` without dispatching the primary
action. The hand-written wrapper in `identity/view.ts` was removed.

**In-place versus over:** A form that opens in place versus one that opens over.
**The decision:** In place. Forms open as a band that pushes the regions down, rather than as a
modal layer that dims and covers them. This is recorded in `spec/ui/anatomy.md`.
*Why it was decided against 'over':* U6 documents that `Dialog` opened at mount is not modal due
to a mesh-web bug. If we mandated 'over', forms opened at mount (like `ui.SignIn` or an empty state
requiring action) would break. If this constraint is lifted in the future, 'over' might be revisited.

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

### U7 — The `ui` namespace erases the types it exists to carry, and does not say what it returns

*Found 2026-09-11, reading the 28 typecheck errors that mesh-operator dispatch 5 left behind.*

Dispatch 5 wrote two console views — `catalog` and `fleet` — against this vocabulary and ran out of
quota with **28 typecheck errors**. Read together they are not 28 mistakes. They are three, and all
three are ours rather than the caller's.

**1. The same author got the return type wrong in both directions, in one dispatch (7 errors).**
`ui.ActionCard(…)` returns `ActionCardState & { view(): Node }` and was put straight into a children
array — four `Type … is not assignable to type 'Node'`. Three lines away, `ui.DetailSurface(…)` and
`ui.PropertyGrid(…)` return a `Node` and had `.view()` called on them — three
`Property 'view' does not exist on type 'Node'`. Fourteen names are exported from one object, eleven
return a node and three return state, and **nothing at the call site distinguishes them**. `ui.` is
the prefix on both.

**2. The namespace is not generic, so no real command can be passed to it (7 errors).**
`createActionCard<I, O>` is generic in its command's input and output. `ui.ActionCard` is declared
`Composite<ActionCardProps<Record<string, Json | undefined>, unknown>, …>`, and `ui.ActionButton` as
`ActionButtonProps<unknown, unknown>` — **the type parameters are pinned to their defaults at the
export**. So `command: builder.import_repo` is `BoundCommand<BuilderImportRepoInput, …>` and does not
fit `BoundCommand<Record<string, Json | undefined>, unknown>`, and `input: () => ({ hostname, ref })`
does not fit `Partial<Record<string, Json | undefined>>`.

This is the one that matters. Every screen is told *nothing hand-rolls a list, use the vocabulary* —
and the vocabulary cannot accept a typed command. The two ways out are importing `createActionCard`
instead, which is the vocabulary telling you not to use it, or a cast. **A design system that can
only be used through a cast is how `as any` gets into a codebase that bans it**, and the next
dispatch under time pressure will find that door before it finds this paragraph.

**3. Four props were invented because the real ones are not discoverable (4 errors, plus 8
`implicitly has an 'any' type` following from them).** `items` on `EntityListProps` — which takes
`children`, so every caller writes the same map from a collection to rows. `subtitle` on
`DetailSurfaceProps`. `button` on `FormOverrides`. A `{ header, value }[]` where `PropertyGrid`
wants items. Each is a guess at the obvious name, which says what the obvious name would have been.

**What this blocks:** `catalog` and `fleet` are written and cannot compile, and `access` — the view
the whole authorization model is invisible without — is the same shape again. **M** here, then the
console is unblocked. U7 comes before any further console work.

**Closed 2026-09-11.** Every name in `ui` is now a generic function returning a `Node`, so the call
site no longer has to know which of the fifteen is a composite, and the type parameters survive the
export. The constraint was the real bug and it moved from `Record<string, Json | undefined>`, which
demands an index signature no `interface` has, to `Fields<T> = { [K in keyof T]: Json | undefined }`,
which is homomorphic and which a generated interface satisfies.

**What it cost, measured in the consumer rather than claimed here.** mesh-operator dropped the index
signature from its own `SeedInput`, three `any` from `registerUser`, and six `.view()` calls — and
removing the `any` immediately surfaced two defects it had been hiding: the register command
discarded its own `Result`, so a refused registration rendered as a successful one, and `signOut`
had shipped carrying `registerUser`'s declaration because the commands were read by array position.

**Two of the three renamed props were reverted** — `PropertyGridItem.label` and
`DetailSurfaceProps.badge`. U7 read the invented names as evidence about the obvious name, which
they are; dispatch 24 read that as an instruction. `subtitle` is now a prop beside `badge` rather
than instead of it, because a chip and a line of prose are different things. `EntityListProps.items`
stayed renamed: that one was a real gap.

**Open, and the next thing.** The vocabulary still has no way to render a CRUD collection as such.
Seven views over nine collections means seven hand-written index-and-detail pairs, and the console
currently draws 7 rows out of the 80 an operator can already read, showing 1 of a release row's 15
fields. A composite that takes a collection and its contracts — find, get, create, update — and
renders the list, the detail and the forms is what makes exposing data and showing data the same
amount of work. Logged as **U8**.

### U8 — Nothing in the vocabulary renders a collection, so every screen writes one

*Raised 2026-09-11, from the operator looking at the console and saying it does not show the data.*

**The measurement, taken against a running cluster rather than argued.** mesh-serve defines 17 CRUD
collections. The control site already exposes 9 of them to an operator, holding 80 rows. The console
draws 7 of those rows, and of the rows it draws it drops most of every one:

| row | fields the API returns | fields drawn |
| --- | --- | --- |
| release | 15 | 1 |
| site | 14 | 6 |
| membership | 7 | 4 |

A release row carries its name, kernel, parts, requirements, policy, agent roles, whether it is
rolling, its source, what superseded it and when it was composed. The list renders the hash. That is
the row answering *what would this site serve if I deployed it*, shown as a hex string.

**Why this is a vocabulary item and not a console task.** The console is not unusually lazy; it is
what the vocabulary makes cheap. `EntityList` takes children, `DetailSurface` takes children, and
`PropertyGrid` takes hand-written items — so *every field on screen is a line somebody typed*, and
the cost of showing a row scales with the row. Exposing a collection is one line in a manifest.
Showing it is a few hundred. **That asymmetry is the bug**, and seven views is where it stops being
affordable.

What is missing is a composite that takes a collection and the contracts over it — `find`, `get`,
and where they exist `create`, `update`, `delete` — and renders the index, the detail and the forms
from the schemas that already describe them. `_describe` carries the JSON Schema for every contract,
`ui.Form` already generates fields from one, and `cx.models(name)` already carries the four states.
The parts exist; nothing composes them.

Three things it has to get right, all of which the console has already got wrong once:

- **A scoped collection answers about one organization**, so the surface has to name which, rather
  than let a screen imply it is showing the cluster. That mistake shipped in a header.
- **A refusal is a state, not an error** — U2, and per contract: a caller may read a collection and
  not write it, so `find` at `user` and `update` at `operator` is an ordinary row with a disabled
  control and a reason.
- **A field is not always a field.** `passwordHash` exists on a row the platform must never render,
  which is surfdns **V2**, and a generic renderer is exactly where that gets forgotten.

**L**, and it is the item that decides whether the console reaches seven views or stays at two.

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
