# The vocabulary

**Status.** **The target.** `src/ui` was deleted on 2026-09-08 with the rest of `src`; this is what
comes back, and it comes back sorted into components and composites rather than as twelve
`ComponentDefinition`s that all reached for `document.createElement`.

This says which one for which job, and — more usefully — when not to reach for one. How a component
is published is `mesh-web/src/contribution/api.ts`; the shapes are
[`surfdns/log/2026-09-08/shapes.md`](../../../surfdns/log/2026-09-08/shapes.md) §2.3.

## Component or composite

> **A component has no logic. A composite has state.**

A component is props in, description out — nothing to own, nothing to dispose, testable by calling
it. A composite is created per use, holds state for as long as it is mounted, and renders itself.

The distinction was measured rather than invented. `PeopleApi` carried twelve orphaned form buffers
— `newOrgId`, `newRoleKey`, `newAccountEmail`, `newOrgSlug` and the rest — public only because there
was nowhere else for them to live. **Composite is the somewhere.**

Neither may touch the DOM. A part that genuinely needs an element is asking for a **driver**, which
is bundled into the kernel artifact and is not this.

## The twelve, sorted

| | kind | for | not for |
| --- | --- | --- | --- |
| `ui.EntityList` | component | the INDEX region: a live collection you select from | tabular data with real columns — use `ui.Table` |
| `ui.EntityItem` | component | one row in an `EntityList` | anything outside one |
| `ui.DetailSurface` | component | the DETAIL region, including its no-selection placeholder | a modal — use `ui.Dialog` |
| `ui.PropertyGrid` | component | label/value pairs of one thing | anything editable — use `ui.Form` |
| `ui.Table` | component | many rows, real columns, comparison across rows | a list you select one of |
| `ui.TableRow` | component | one row of a `Table` | — |
| **`ui.Form`** | **composite** | editing a thing: owns the buffers, validity and dirty state | display — use `ui.PropertyGrid` |
| `ui.Field` | component | one labelled input in a form | a bare input anywhere. The buffer belongs to the `Form` |
| `ui.Label` | component | the label of a field | headings — those are the region's |
| `ui.Select` | component | a choice from a known set | a choice from a collection — that is an `EntityList` |
| `ui.ButtonRow` | component | the actions of a form or a detail | one primary action — that belongs to the header |
| `ui.Dialog` | component | confirmation, and editing that must not lose the background | anything a view can show in place |

**Ten components, one composite.** That ratio is the point: state is rare, and the components that
have none are the ones three unrelated views can share.

`ui.Dialog` is a component because *whether it is open* belongs to whoever opened it, and
confirmation is a capability (`cx.confirmation`) rather than a component holding an answer.

## The two that were missing, and are no longer

The previous version of this document ended with three gaps *"where every app has invented its own
answer"*. Two of them are now answered by the shapes and get components here; the third is answered
by a type and needs none.

| | kind | for |
| --- | --- | --- |
| **`ui.ActionButton`** | composite | one command. Owns whether it is running; reads `available()` for the refusal |
| **`ui.ActionCard`** | composite | one command with inputs: the title, the consequence, the fields, the control, and the result or the error in place |

**`ui.ActionButton` closes the old gaps 2 and 3 together**, because they were one gap. A command now
carries `available(): Availability` and, when it needs one, `confirm`. So the button takes the
command and nothing else:

- refused → visible, disabled, labelled with `why` (states §4)
- running → says what it is doing and cannot be fired twice (rules §3)
- confirmable → asks, and a `requiresUser` confirmation cannot be satisfied by an agent

None of that is the author's to remember. **A control that renders a command correctly is the
default, and getting it wrong now takes effort.**

**The old gap 1 — `unauthenticated` and `refused` were inexpressible — is answered by
`Availability`, not by a component.** `EntityListStatus` was
`'idle' | 'loading' | 'error' | 'ready' | 'empty'`, and `idle` was `unauthenticated` wearing a
costume because the type had no name for it. The replacement:

```ts
type EntityListStatus = 'loading' | 'ready' | 'empty' | 'error';
```

Four, not five and not three — because *refused* and *unauthenticated* are not list states at all.
They are answers to *may I*, which is `Availability`, and a list that cannot be read is a list whose
read command is unavailable. Modelling them as list statuses is what made every app hand-roll them
differently.

## A form is generated from the command, not written

The buffers disappear rather than moving. `CommandContract.input` carries JSON Schema, so `ui.Form`
generates its fields from the command it is bound to — which is what rules §6 was reaching for when
it said *never a bare `<textarea>` of JSON*, and why the site editor stayed a JSON textarea for
exactly as long as nobody used it.

So an "add membership form" is not a file. It is `ui.ActionCard` bound to `addMembership`, whose
input schema names `userId`, `organizationId` and `roleKey`. The twelve orphaned buffers were the
cost of writing by hand what the contract already describes.

Hand-write a form only where the command's input genuinely under-describes the interaction — a field
that needs a picker over a live collection, say — and then the hand-written part is one `ui.Field`,
not the whole form.

## The rules that decide between them

**A list you pick from is an `EntityList`. A table you read across is a `Table`.** The test: if
somebody would compare row 3 to row 7 on a column, it is a table. If they would pick one and look at
it, it is a list. Guessing wrong produces the two most common bad screens — a table nobody compares
anything in, and a list with eight columns squeezed into it.

**Display and edit are different components.** `PropertyGrid` for reading, `Form` for writing. A
`PropertyGrid` with inputs in it is how a screen ends up with no clear save.

**Dialog is for confirmation and for edits that must not lose their context.** Everything else the
view shows in place. A dialog that is just a panel somewhere else is a panel that stole the screen.

## Adding one

A fourteenth needs an argument that it is a *kind of thing*, not an instance. "The catalog needs a
version picker" is an instance; `ui.Select` and an `EntityList` already build it. "Every screen needs
to show a refused action" was a kind, and it is `ui.ActionButton`.

Ask: would three unrelated views use it identically? If not, it belongs in the view.

And ask the second question now that there is one: **does it hold state?** If not, it is a component,
and a composite that turns out to own nothing was a component all along.
