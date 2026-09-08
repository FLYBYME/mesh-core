# The vocabulary

**Status.** Decided on what exists. The gaps at the end are Open.

Twelve components in `src/ui`. This says which one for which job, and — more usefully — when not to
reach for one. How a component is published and styled is `mesh-web/spec/components.md`.

## The twelve

| component | for | not for |
| --- | --- | --- |
| `ui.EntityList` | the INDEX region: a live collection you select from | tabular data with real columns — use `ui.Table` |
| `ui.EntityItem` | one row in an `EntityList` | anything outside one |
| `ui.DetailSurface` | the DETAIL region, including its no-selection placeholder | a modal — use `ui.Dialog` |
| `ui.PropertyGrid` | label/value pairs of one thing | anything editable — use `ui.Form` |
| `ui.Table` | many rows, real columns, comparison across rows | a list you select one of |
| `ui.TableRow` | one row of a `Table` | — |
| `ui.Form` | editing a thing | display — use `ui.PropertyGrid` |
| `ui.Field` | one labelled input in a form | a bare input anywhere |
| `ui.Label` | the label of a field | headings — those are the region's |
| `ui.Select` | a choice from a known set | a choice from a collection — that is an `EntityList` |
| `ui.ButtonRow` | the actions of a form or a detail | one primary action — that belongs to the header |
| `ui.Dialog` | confirmation, and editing that must not lose the background | anything a view can show in place |

## The rules that decide between them

**A list you pick from is an `EntityList`. A table you read across is a `Table`.** The test: if
somebody would compare row 3 to row 7 on a column, it is a table. If they would pick one and look at
it, it is a list. Guessing wrong produces the two most common bad screens — a table nobody compares
anything in, and a list with eight columns squeezed into it.

**Display and edit are different components.** `PropertyGrid` for reading, `Form` for writing. A
`PropertyGrid` with inputs in it is how a screen ends up with no clear save.

**Never a bare `<textarea>` of JSON** (rules §6). If it has a schema it gets fields — `renderForm`
generates them from the schema, and the site editor was a JSON textarea for exactly as long as
nobody used it.

**Dialog is for confirmation and for edits that must not lose their context.** Everything else the
view shows in place. A dialog that is just a panel somewhere else is a panel that stole the screen.

## What the vocabulary cannot say — **Open**

Three gaps, and each one is a place where every app has invented its own answer:

**1. Two of the five states are inexpressible.** `EntityListStatus` is
`'idle' | 'loading' | 'error' | 'ready' | 'empty'`. There is no `unauthenticated` and no `refused`,
so every app hand-rolls the two hardest states and they all differ. `idle` is not a state a person
can be in. → roadmap **U2**, and [states.md](./states.md) has the argument.

**2. There is no disabled-with-a-reason control.** States §4 requires a control that is visible,
disabled, and labelled with what is missing. Nothing in the vocabulary carries a refusal reason, so
the people app renders its own strings inline and nobody else does it at all. This is one component
— a button that takes an `Availability` — and its absence is why refusals are the least consistent
thing in the product. → roadmap **U3**

**3. There is no busy control.** Rule §3 says the control that starts slow work shows the work and
cannot be fired twice. `builder.release_repo` takes forty seconds. Every button that starts
something long implements this by hand, or does not implement it. → roadmap **U3**

All three are the same shape of problem: a rule that every screen must follow, with nothing in the
vocabulary to follow it with. A rule the components cannot express is a rule that will be broken.

## Adding one

A thirteenth component needs an argument that it is a *kind of thing*, not an instance. "The catalog
needs a version picker" is an instance; `ui.Select` and an `EntityList` already build it. "Every
screen needs to show a refused action" is a kind, and it is missing.

Ask: would three unrelated views use it identically? If not, it belongs in the view.
