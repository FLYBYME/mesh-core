# One design, many surfaces

**Status.** Decided on the mechanism, Proposed on the breakpoint.

> "i looked at this on mobile and its a no go. not at all."
> "and i cant drag a window in mobile"

Both were true. The second was a two-word fix — `touch-action: none` was on `.grip` and not on
`.titlebar`, so a titlebar drag was eaten by the browser's scroll. The first is this document.

## There is no `isMobile`

**Decided.** No user-agent sniffing. No device class. No `isMobile` anywhere, ever.

What exists is a signal:

```ts
cx.display.size()   // ReadonlySignal<{ width: number; height: number }>
```

The surface's size, kept current by the kernel. That is the whole input.

Why this and not a device check: a phone is not a size, and a size is not a phone. A narrow browser
window on a desktop is narrow. A tablet in a split view is narrow. A phone in landscape is not. Every
device check ever written is a proxy for a measurement that was available all along, and it is wrong
for somebody the day it ships.

It also composes with the thing that actually matters — **the surface is not the screen**. A view in
a 320px-wide window on a 4K display is in the same situation as a view on a phone, and should look
the same. A device check gets that exactly backwards.

## The breakpoint — **Proposed**

One named constant, one place, with the reason written next to it:

```ts
/** Below this, INDEX and DETAIL cannot both be usable, so the view shows one at a time. */
const NARROW = 720;
```

720 because two panels need roughly 320 each plus gutters, and below that neither is readable. That
is an argument, not a measurement, which is why this is Proposed — it should be checked against the
real content and moved if it is wrong.

**One constant.** Not one per view. Two views disagreeing about what narrow means is how a layout
starts jumping mid-resize.

## What changes, and what does not

**Changes below the breakpoint:**

- INDEX and DETAIL show one at a time; selecting a row moves to the detail, and there is a way back
- the chrome is the routing one, not the windowed one: no dragging, no arranging, one thing at a time
- controls that clustered horizontally stack

**Does not change, ever:**

- **what the view can do.** Every action available on a wide surface is available on a narrow one.
  There is no "not on mobile". A person on a phone who cannot deploy is a person who has to find a
  laptop, and the whole point of M6 is that they should not have to.
- **the words.** [words.md](./words.md) applies at every size. Truncating a refusal message to fit
  is how a refusal becomes a mystery.
- **the five states.** All five, at every size (states.md).
- **the data.** No "simplified mobile view" that quietly drops columns nobody chose to drop.

## The chromes are the mechanism

A chrome decides how views are presented. There are two, and neither is a mode a person picks:

| chrome | presents | for |
| --- | --- | --- |
| `src/chrome/` | windows, arrangeable | wide surfaces |
| `src/nav/` | one view, routed, with a nav bar | narrow surfaces |

The important property: **an app works under both without knowing which it is under.** If a part has
to be edited to work under a chrome, the chrome is wrong — that was the acceptance test for the
routing chrome and it stays the test for the next one.

This is also why a view must not open a window. `ViewDecl.window` carries *hints* — `tile`,
`defaultSize`, `minSize` — that a windowed chrome uses and a routing chrome ignores.

## Touch

Every interactive thing is touchable: hit targets no smaller than 44px, no hover-only affordance, no
control whose only trigger is a right-click.

`touch-action` is the specific trap. A draggable element must declare `touch-action: none` or the
browser claims the gesture for scrolling and the drag silently never starts — which is exactly what
made windows undraggable on a phone while working perfectly with a mouse. **Anything that handles
pointer events for movement declares it.**

## Testing

The browser tests run at both sizes. A view that has only ever been rendered wide has not been
tested — the narrow path is where the layout collapses, and it collapses silently.
