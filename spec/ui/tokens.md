# Design tokens

**Status.** Decided. This is the answer to the gap that [roadmap.md](../roadmap.md) calls U1.

The tokens are custom properties defined in `@layer ui.tokens` in `src/ui/ui.css`. Every component
in `src/ui/` may use them. No component may use a literal colour, a raw `px` value in a spacing
property, or a raw `px` value in a type scale property.

A component that breaks this rule fails `test/ui.source.spec.ts`, which scans `src/ui/**` and names
the file and line.

---

## Colour

All colour tokens are RGB channels paired with derived `rgb()`/`rgba()` references. Using channels
lets overlay variants (`--surface-hover`, `--surface-selected`) be built from the same hue without
repeating it. The channel variables are not for direct use; the named tokens are.

### Ink

| token | use |
| --- | --- |
| `--ink` | primary text and icon colour |
| `--ink-dim` | secondary text: descriptions, hints, counts, placeholders |

### Edge

| token | use |
| --- | --- |
| `--edge` | border colour for cards, inputs, rows |
| `--edge-dim` | lighter separator: between table rows, between property rows |

### Surface

| token | use |
| --- | --- |
| `--surface` | the card and input background |
| `--surface-dim` | a subtler background: table headers |
| `--surface-hover` | hover state for interactive rows and buttons |
| `--surface-selected` | selected state for list items and table rows |

### Accent

| token | use |
| --- | --- |
| `--accent` | focus ring, selected border, active control |
| `--on-accent` | text placed on an accent-coloured surface (contrast requirement) |

### Danger / error

| token | use |
| --- | --- |
| `--danger` / `--error` | error text, error border; both names point at the same value |
| `--danger-dim` / `--error-dim` | error background wash |

### Success

| token | use |
| --- | --- |
| `--success` | success text and border (action-card result) |
| `--success-dim` | success background wash |

### Muted

| token | use |
| --- | --- |
| `--muted` | a neutral midtone; not yet used in components — defined so a host does not invent its own |

---

## Spacing scale

Names are multiples of 4 px. `--space-px` is the one-pixel hairline used for borders and
dividers only.

| token | value | use |
| --- | --- | --- |
| `--space-px` | 1 px | borders, separators |
| `--space-1` | 4 px | tight internal gap (label+asterisk, list-item gap) |
| `--space-2` | 8 px | gap between related items: header gap, row gap |
| `--space-3` | 12 px | medium padding: cell padding, button horizontal padding |
| `--space-4` | 16 px | section padding: card, dialog, detail surface |
| `--space-5` | 20 px | — |
| `--space-6` | 24 px | — |
| `--space-8` | 32 px | — |

Spacing properties covered by the check: `gap`, `padding`, `margin`. A literal `px` value in any
of those three fails the test unless it carries a `/* ui-literal: <reason> */` comment.

---

## Type scale

| token | value | use |
| --- | --- | --- |
| `--text-xs` | 12 px | counts, hints, table header labels, option labels |
| `--text-sm` | 13 px | body text — the default for most component content |
| `--text-base` | 14 px | entity list title |
| `--text-md` | 16 px | card and dialog titles |
| `--text-lg` | 18 px | detail surface title |

---

## Radius scale

| token | value | use |
| --- | --- | --- |
| `--radius-sm` | 4 px | input fields, select options |
| `--radius-md` | 6 px | entity items, tables, message boxes |
| `--radius-lg` | 8 px | cards, dialogs |

---

## Opt-outs

A literal value that is genuinely right carries a `/* ui-literal: <reason> */` comment. The check
skips it. The reason must be non-empty; the pattern `/* ui-literal: */` does not pass.

Current opt-outs in `src/ui/ui.css`:

| location | literal | reason |
| --- | --- | --- |
| `.ui-entity-list-items` | `gap: 2px` | sub-scale gap between list rows |
| `.ui-entity-item` | `gap: 2px` | sub-scale gap between title and description |
| `.ui-detail-surface-placeholder` | `min-height: 200px` | minimum height for a readable placeholder |
| `--surface-hover` | overlay tint | no named colour exists for a white-overlay hover |
| `--surface-selected` | accent tint | built from `--accent-rgb`; derivation noted in comment |
| `.ui-label-required` | `margin-left: 2px` | tight optical spacing for the asterisk |
| `.ui-dialog` | `max-width: 500px` | layout constraint: maximum dialog width |
| `--on-accent` | `#fff` | white-on-blue contrast requirement |

---

## Providing a theme

A host overrides the token set in `:root` or a theme class before `@layer ui.tokens` resolves.
The minimal set a host must provide to make components render correctly:

```css
:root {
    --ink-rgb: <r, g, b>;
    --edge-rgb: <r, g, b>;
    --surface-rgb: <r, g, b>;
    --accent-rgb: <r, g, b>;
    --danger-rgb: <r, g, b>;
    --success-rgb: <r, g, b>;
}
```

Derived tokens (`--ink`, `--ink-dim`, `--surface-hover`, etc.) are computed from the channel
variables and do not need overriding. A host that needs a different formula for a derived token may
override it directly.

---

## The check

`test/ui.source.spec.ts` scans `src/ui/**/*.css` and fails if it finds:

- a hex literal (`#aabbcc`) outside a `/* ui-literal: */` comment
- `rgb(` or `hsl(` outside a `/* ui-literal: */` comment
- a raw `px` value in a `gap`, `padding`, or `margin` property outside a `/* ui-literal: */` comment

The check names the file and the matching line, so the failure points directly at what needs fixing.
