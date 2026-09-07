# Dispatch 8 Report: Adopt `ui.*` in the `catalog` Console

**Date:** 2026-09-06  
**Repository:** `FLYBYME/mesh-core` (Worktree: `/home/ubuntu/code/mesh-core-dispatch-8`, branch `dispatch/8`)  
**Specification:** Queue 8: Adopt `ui` in `catalog` — one console, small scope  
**Kernel:** `@flybyme/mesh-web` (`^0.15`, `v0.15.0`)  
**Parts Migrated & Bumped in `mesh.json`:**
- `catalog`: `0.2.3` → `0.2.4` (commit `2c4daa9`)
- `ui`: `0.1.0` (fixes applied in commit `88ff2ac`)

---

## 1. Executive Summary

Dispatch 7 introduced the `ui@0.1.0` extension (`src/ui/`), providing four declarative components: `ui.EntityList`, `ui.EntityItem`, `ui.DetailSurface`, `ui.PropertyGrid`, `ui.Table`, and `ui.TableRow`. However, as noted in the project principles (*surfdns/decisions/0001-vertical-before-horizontal.md*), a capability without a consumer is not done. 

This dispatch performed the first real-world adoption of `ui.*` in the `catalog` console across its three target view files:
1. `src/catalog/views/partsList.ts`: Replaced manual `ScrollView`, handcrafted `Button` items, and tri-state lifecycle `when()` trees with `ui.EntityList` and `ui.EntityItem`.
2. `src/catalog/views/versionTable.ts`: Replaced handcrafted `Grid` header, `Stack` rows container, and manual lifecycle branches with `ui.Table` and `ui.TableRow`.
3. `src/catalog/views/versionProvenanceCard.ts`: Replaced conditional `when()` card unmounting and handcrafted `Grid` with `ui.DetailSurface` and `ui.PropertyGrid`.

### Key Outcomes
- **Style Objects & Hex Literals:** **17 inline `style: {}` objects** and **29 hardcoded hex literals** were completely deleted from `catalog`.
- **Boilerplate Eradicated:** **7 manual lifecycle branches** (`when(loading)`, `when(error)`, `when(empty)`) and **10 `props: { bold: true }` property labels** were eliminated.
- **Consumer Validation & UI Fixes:** As the first consumer of `ui.*`, two real bugs were discovered in `ui` and fixed in `src/ui/`:
  - Fixed unconditional attachment of empty `<header>` and `<h2>` elements in `ui.EntityList` when no `title` was provided (which hijacked heading queries and broke accessibility).
  - Fixed CSS selector targeting for `code` properties in `ui.PropertyGrid` to properly match boolean attribute `[data-code]`.
- **Zero Casts & Verification:** `npm run typecheck` passes with zero errors, zero warnings, and **zero TypeScript casts**. All **36 browser tests** across 5 test suites pass cleanly.

---

## 2. Style Objects and Hex Literals Removed (Counted)

To prove that `ui` earned its place, every removed style object and hex literal was tracked and counted.

### Summary Metric
| View File | Inline `style: {}` Removed | Hardcoded Hex Literals Removed | Lifecycle `when()` Removed |
|---|---|---|---|
| `src/catalog/views/partsList.ts` | **5** | **11** | **3** |
| `src/catalog/views/versionTable.ts` | **7** | **13** | **3** |
| `src/catalog/views/versionProvenanceCard.ts` | **5** | **5** | **1** |
| **Total Removed** | **17** | **29** | **7** |

---

### Detailed Inventory of Removed Styles & Literals

#### 1. `src/catalog/views/partsList.ts`
- **5 Inline `style: {}` Objects Removed:**
  1. Part item `Button` style (13 declarations: `display`, `flexDirection`, `alignItems`, `width`, `padding`, `marginBottom`, `borderRadius`, `border`, `background`, `cursor`, `textAlign`, `boxSizing`).
  2. Outer `ScrollView` sidebar style (6 declarations: `flex`, `borderRight`, `background`, `padding`, `boxSizing`, `height`).
  3. `when(loading)` placeholder `Text` style (`padding`, `color`, `display`).
  4. `when(error)` error `Card` style (`padding`, `margin`, `borderRadius`, `background`, `border`, `color`).
  5. `when(empty)` empty search message `Text` style (`padding`, `color`, `display`).
- **11 Hex Literals Removed:**
  - `#58a6ff` (Button border accent fallback)
  - `#21262d` (Button background surface fallback)
  - `#e6edf3` (Span color ink fallback in `part().name`)
  - `#8b949e` (Span color ink-dim fallback in part description)
  - `#6e7681` (Span color ink-dim fallback in publisher row)
  - `#30363d` (ScrollView border edge fallback)
  - `#161b22` (ScrollView background surface fallback)
  - `#8b949e` (Loading text ink-dim fallback)
  - `#f85149` (Error card border literal)
  - `#f85149` (Error card text color literal)
  - `#8b949e` (Empty text ink-dim fallback)

#### 2. `src/catalog/views/versionTable.ts`
- **7 Inline `style: {}` Objects Removed:**
  1. `renderVersionRow` `Button` style (12 declarations: `display`, `gridTemplateColumns`, `gap`, `padding`, `borderBottom`, `background`, `border`, `width`, `textAlign`, `alignItems`, `cursor`, `color`, `fontSize`).
  2. Outer `Stack` layout style (`width: '100%'`, `marginBottom: '20px'`).
  3. `when(loading)` placeholder `Text` style (`padding`, `color`, `display`).
  4. `when(error)` error `Card` style (`padding`, `background`, `border`, `color`, `borderRadius`).
  5. Handcrafted `Grid` table header style (8 declarations: `padding`, `background`, `borderBottom`, `borderRadius`, `fontSize`, `fontWeight`, `color`, `alignItems`).
  6. Rows container `Stack` style (4 declarations: `border`, `borderTop`, `borderRadius`, `background`).
  7. `when(empty)` message `Text` style (`padding`, `color`, `display`).
- **13 Hex Literals Removed:**
  - `#30363d` (Row borderBottom fallback)
  - `#e6edf3` (Row text ink fallback)
  - `#8b949e` (Repository span ink-dim fallback)
  - `#6e7681` (PublishedAt span ink-dim fallback)
  - `#8b949e` (Loading text ink-dim fallback)
  - `#f85149` (Error card border literal)
  - `#f85149` (Error card text color literal)
  - `#161b22` (Header background chrome fallback)
  - `#30363d` (Header borderBottom edge fallback)
  - `#8b949e` (Header text ink-dim fallback)
  - `#30363d` (Rows container border edge fallback)
  - `#21262d` (Rows container background surface fallback)
  - `#8b949e` (Empty table text ink-dim fallback)

#### 3. `src/catalog/views/versionProvenanceCard.ts`
- **5 Inline `style: {}` Objects Removed:**
  1. Outer `Card` container style (5 declarations: `padding`, `background`, `border`, `borderRadius`, `marginBottom`).
  2. `Heading` margin/size style (`margin: '0 0 12px 0'`, `fontSize: '15px'`).
  3. Handcrafted `Grid` definition container style (4 declarations: `background`, `padding`, `borderRadius`, `fontSize`).
  4. Monospace Exact Commit `Span` style (`fontFamily: 'monospace'`, `color: '#58a6ff'`).
  5. Monospace Artifact Digest `Span` style (`fontFamily: 'monospace'`).
- **5 Hex Literals Removed:**
  - `#161b22` (Card background fallback)
  - `#30363d` (Card border fallback)
  - `#21262d` (Grid background fallback)
  - `#58a6ff` (Commit hash color literal)
  - `#8b949e` (Changelog text color fallback)
- *(Note: 10 manual `props: { bold: true }` declarations were also deleted because `ui.PropertyGrid` handles term labels semantically via CSS).*

---

## 3. What `ui` Was Missing (Consumer-Driven Gaps & Fixes)

Because `catalog` was the first real-world consumer of `ui`, several concrete architectural gaps were discovered:

### Gap 1: Unconditional Ghost `<h2>` in `ui.EntityList`
- **Issue:** In `src/ui/views/entityList.ts`, `create()` eagerly constructed a `<header class="ui-entity-list-header">` with an `<h2 class="ui-entity-list-heading">` and appended it to `el`. While `update()` set `header.style.display = 'none'` when no `title` prop was supplied, the hidden `<h2>` remained in the DOM.
- **Impact:**
  - In `catalog`, the top header bar already provides the catalog title and part counts. `partsList.ts` does not pass a `title` prop to `ui.EntityList`.
  - The phantom `<h2>` polluted the accessibility tree and broke DOM queries such as `container.querySelector('h2')` in tests, which matched the hidden, empty `ui-entity-list-heading` instead of the actual catalog section header.
- **Resolution (commit `88ff2ac`):**
  - Used a `WeakMap<Element, HTMLElement>` to retain a reference to the header element.
  - The header is only appended to the DOM when `title` or `heading` has a non-empty value, and removed from the DOM if falsy or omitted.

### Gap 2: Selector Mismatch for `code` Attributes in `ui.PropertyGrid`
- **Issue:** `src/ui/ui.css` targeted code spans in property grids using:
  ```css
  .ui-property-grid code,
  .ui-property-grid [data-code="true"],
  .ui-property-grid [code="true"],
  .ui-property-grid .code {
      font-family: var(--font-mono, monospace);
      color: var(--accent);
  }
  ```
  However, the kernel's built-in `Span` component renders `props: { code: true }` as a boolean DOM attribute `data-code=""` (presence of attribute, empty string value), not `"true"`.
- **Impact:** Any `<Span code={true}>` rendered inside a `ui.PropertyGrid` failed to receive the accent monospace style without manually adding inline styles.
- **Resolution (commit `88ff2ac`):**
  - Added `.ui-property-grid [data-code]` to the selector list in `src/ui/ui.css`.

### Gap 3: Reactive Getters vs Static Property Bags in `ui.DetailSurface`
- **Issue:** Previously, `versionProvenanceCard.ts` used `when(() => app.selectedVersion() !== null, () => { const v = app.selectedVersion(); ... })`. This unmounted and remounted the entire card whenever selection changed, capturing `v` in a lexical closure for each render.
- **Discovery:** With `ui.DetailSurface`, the element remains mounted in the DOM and toggles state via CSS `[data-selected="true|false"]`. Therefore, child elements in `ui.PropertyGrid` are evaluated when the component is initially constructed.
- **Resolution:** All property values must be passed as reactive functions (`() => app.selectedVersion()?.repository ?? ...`), rather than static values from an immediate call to `app.selectedVersion()`. This is an essential pattern requirement for consumers of `ui.DetailSurface`.

### Gap 4: Semantic Error Classes (`errorClass`)
- **Issue:** Tests in `catalog.browser.test.ts` asserted on `.catalog-error-card`.
- **Resolution:** `ui.EntityList` already provided `errorClass`, allowing consumers to add domain-specific hook classes (`errorClass: 'catalog-error-card'`) to the built-in error presentation container without reverting to handcrafted DOM.

---

## 4. Evaluation of the CSS-State Lifecycle Handling

Both `ui.EntityList` and `ui.Table` use CSS attributes (`data-status="loading|error|ready|empty"` and `data-empty="true|false"`) rather than conditional mounting (`when()`) to manage state transitions.

### Did it work in a real console?
**Yes, it worked cleanly and effectively.**

1. **Elimination of DOM Thrashing:**  
   In the previous implementation, rapid network transitions caused entire subtrees to mount, unmount, and remount repeatedly. CSS-driven state allows the DOM elements (loading spinner, error alert, rows container, empty placeholder) to remain stable while CSS rules (`display: none` / `display: block`) toggle their visibility.
2. **Stable Keyboard & Accessibility Context:**  
   Because containers retain their roles (`role="status"`, `aria-live="polite"`), screen readers and assistive technology do not lose focus or context during state transitions.
3. **Simplified Consumer Code:**  
   The consumer no longer writes repetitive `when(status === 'loading')`, `when(status === 'error')`, and `when(status === 'ready' && items.length === 0)` chains. Instead, passing `status`, `loadingMessage`, `errorMessage`, and `emptyMessage` declaratively configures the entire lifecycle.
4. **Test Reliability:**  
   Browser tests that query for error containers or status messages can assert on `[data-status]` and `[aria-label]` deterministically without timing hazards.

---

## 5. What `releases` Will Need That `catalog` Did Not

With `catalog` fully migrated, `releases` is the next console to adopt `ui.*`. Analysis of `releases` reveals requirements that `catalog` did not require:

1. **Action Cards (`ui.ActionCard`):**  
   `releases` contains two complex interactive action panels:
   - `renderComposerCard`: Composes new releases, taking form inputs (`Input`, `TextArea`), dry-run and commit buttons, and displaying structured resolution output or problem badges.
   - `renderDeployActionBox`: Deploys releases or triggers rollbacks with contextual confirmation messaging.
   `catalog` only required read-oriented inspectors (`ui.DetailSurface`, `ui.PropertyGrid`); `releases` needs standardized action containers with input layout slots, loading spinners on submit buttons, and standardized problem callouts.
2. **Standardized Button Variants (`ui.Button`):**  
   `ui` currently provides `ui.EntityItem` and `ui.TableRow` for row selection. However, `releases` has distinct standalone action buttons:
   - Primary Accent button (`background: var(--accent)`, bold text).
   - Secondary Surface button (`background: var(--surface)`, border `var(--edge)`).
   - Destructive / Warning button (for rollbacks and resets).
3. **Two-Pane Split Sidebar (`ui.Sidebar`):**  
   `releases` divides its left pane into two stacked entity lists (`Sites` and `Releases`) separated by a divider. A formal sidebar container with header and separator support will complete its adoption.

---

## 6. Reader Audit Checklist

- [x] **Strict Scope:** Only `catalog` and `ui` were modified. `releases` was left completely untouched.
- [x] **No Shared Style Constants:** No `styles.ts` or cross-part style abstractions were created.
- [x] **Zero TypeScript Casts:** No `as any`, `as never`, or type assertions introduced.
- [x] **Clean Typecheck:** `npm run typecheck` passes with 0 errors and 0 warnings.
- [x] **All Tests Passing:** All 36 browser tests across 5 test suites pass (`vitest run --config vitest.browser.config.ts`).
- [x] **Version Bump:** `catalog` bumped to `0.2.4` in `mesh.json`.
- [x] **Granular Commits:**
  - `88ff2ac`: `ui: attach entity list header only when title is present and fix property grid data-code selector`
  - `2c4daa9`: `catalog: adopt ui.EntityList, ui.EntityItem, ui.Table, ui.TableRow, ui.DetailSurface, ui.PropertyGrid (bump to 0.2.4)`
