# The anatomy of a view

**Status.** Proposed. The regions are Decided; the scroll model is Proposed and the reason is below.

A view answers **one question**. "Catalog" is not a question. *What is published, and at what
versions* is. If two things on screen answer different questions, they are two views.

## The four regions

Every view is some subset of these, in this order. A view uses what it needs and omits the rest —
but it never invents a fifth.

```
┌─────────────────────────────────────────────┐
│ HEADER   what this is · count · one action  │
├──────────────────┬──────────────────────────┤
│ INDEX            │ DETAIL                   │
│ what there is    │ the selected one         │
│ (scrolls)        │ (scrolls independently)  │
│                  │                          │
├──────────────────┴──────────────────────────┤
│ FOOTER   status of work in progress         │
└─────────────────────────────────────────────┘
```

**HEADER** — what the view is, how many there are, and *at most one* primary action (the one that
creates a thing: **new site**, **import repository**). Everything else belongs to a row or to the
detail.

**INDEX** — what exists. Live (rules §1). Selection lives here, and selection is addressable
(a route param), so the thing being looked at can be sent to somebody.

**DETAIL** — the selected thing, and everything that acts on it. A destructive action lives here,
next to the thing it destroys, never in the header where it can be pressed with the wrong row
selected.

**FOOTER** — work in progress: what is running, since when. Not errors — those belong where they
happened (states §5). A view with no long-running work has no footer.

## The scroll model — **Proposed**

> "the left side thing needs to be two independent scroll sections"

INDEX and DETAIL scroll independently. One page scrollbar for both is what makes a long list scroll
the thing you are reading off the screen, and it is the single most common way a two-panel screen
becomes unusable.

Concretely: the view fills its surface and does not grow it. HEADER and FOOTER are fixed. INDEX and
DETAIL each own their overflow. Nothing outside the view scrolls because of something inside it.

This is Proposed rather than Decided because it interacts with the chrome: a windowed chrome sizes
the view, a routing chrome gives it the page, and "fills its surface" means different things to
each. It needs one answer that works under both before it is Decided.

## Where a control lives

The rule that prevents most layout arguments:

> **A control lives next to the thing it acts on, at the smallest scope that is true.**

- acts on one row → in the row, or in the detail for that row
- acts on the whole collection → the header
- acts on the platform → not in this view at all

Consequences worth stating because they get violated:

- **A destructive action is never in the header.** It acts on one thing; it lives with that thing.
- **A control that is refused stays where it is**, disabled and labelled (states §4). It does not
  move, and it does not disappear — a control that appears and vanishes with standing makes the
  layout jump and teaches people the app is unreliable.
- **The control that starts slow work shows that work** (rules §3), on itself, and cannot be fired
  twice. Not a spinner elsewhere.

## Sections within a region

When a region has more than one kind of thing, it gets titled sections, each collapsible, none
nested more than one deep.

If a view wants two levels of nesting, it is two views. This is the GIMP line: an app that grows a
tree of panels because everything must be reachable from one screen is an app that has stopped
answering one question.

## Where a form opens

**A form opens in place**, as a band that pushes the regions down, rather than as a layer that dims
and covers them.

*Why:* `confirm` is already a layer that dims and covers. Adding another modal layer for forms violates
the principle that an app is made of regions, not layers. (Additionally, at the time of this writing,
`Dialog` opened at mount is not modal due to a bug in the kernel).

## What a view must not do

- **Open a window.** A view is content. Whether it is a window, a page or a pane is the chrome's
  decision, and a view that assumes one does not work under the other. This is why `ViewDecl.window`
  holds *hints* — `tile`, `defaultSize`, `minSize` — and not commands.
- **Know the surface size to decide what it is.** See [responsive.md](./responsive.md).
- **Restate the API.** The set of contracts, gates and shapes comes from `_describe` (rules §5).
