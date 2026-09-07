# Dispatch 6 Report: Decompose Console Views (Sections are Functions)

**Date:** 2026-09-06  
**Repository:** `FLYBYME/mesh-core` (Worktree: `/home/ubuntu/code/mesh-core-dispatch-6`)  
**Specification:** `~/code/surfdns/architecture/boundaries.md` (Rule 5: *A section is a function*)  
**Kernel:** `@flybyme/mesh-web` (`^0.13`, `v0.13.0`)  
**Parts Migrated & Bumped in `mesh.json`:**
- `releases`: `0.2.2` → `0.2.3` (commit `d385878`)
- `catalog`: `0.2.1` → `0.2.2` (commit `648870f`)

---

## 1. Executive Summary

Dispatch 5 separated the repository into architectural boundaries (`contract.ts`, pure files, `views/`, `index.ts`), but left monolithic view functions:
- `src/releases/views/console.ts`: 885-line view function in an 897-line file.
- `src/catalog/views/browser.ts`: 816-line view function in an 873-line file.

As observed in `boundaries.md` Rule 5 (*Rule 4 was necessary and not sufficient*):
> *"A view alone in a file is easier to find and exactly as hard to read... They are already sections; they are just not functions."*

This dispatch decomposed both views into named, modular functions and section files. 

### Key Outcomes:
1. **Strict Function Size Target Met**:
   - **Zero functions exceed 117 lines** across all files in both parts.
   - Longest function in `releases`: `renderComposerCard` at 110 lines.
   - Longest function in `catalog`: `renderRangeResolverCard` at 117 lines.
   - Both top-level view functions (`renderReleasesView` at 41 lines, `renderCatalogView` at 35 lines) read directly as high-level lists of what the screen is made of.
2. **Granular Commit History**:
   - Every file change was committed individually as it was created ("one file per commit"), totaling 12 sequential commits.
3. **Zero Casts & Clean Typecheck**:
   - `npm run typecheck` passes with zero errors and zero warnings.
   - Zero `as any`, zero `as never`, zero type casts across all edits.
4. **All 28 Browser Tests Pass Untouched**:
   - No test file was edited. All 28 tests across 4 suites pass cleanly on browser execution.
5. **Exact Backward Compatibility**:
   - Exports (`renderReleasesView`, `renderCatalogView`) and public signatures remain completely unchanged.

---

## 2. The Rule Applied: When a Section Becomes Its Own File

The decomposition applied a clear two-tier architectural rule:

### The File Boundary Rule
> **A self-contained screen section with independent domain interaction and substantial structure (~100+ lines) lives in its own dedicated file under `views/` next to the top-level view.**

Under this rule:
- **Sections that earned their own files**:
  - `src/releases/views/sitesSection.ts` (133 lines): Renders the tenant sites list, selection handling, loading/error/empty states.
  - `src/releases/views/releasesSection.ts` (144 lines): Renders the scoped releases list, live badges, hash display, metadata row.
  - `src/releases/views/selectedReleaseCard.ts` (262 lines): Renders the selected release details, included parts table, and deploy/rollback action block.
  - `src/releases/views/composerCard.ts` (262 lines): Renders the release compose form, version requirements inputs, dry-run and commit buttons, and compose result/problems box.
  - `src/catalog/views/header.ts` (150 lines): Renders the catalog header with search query input, kind filter button group, and refresh button.
  - `src/catalog/views/partsList.ts` (135 lines): Renders the filtered catalog parts list, selection state, and empty/error states.
  - `src/catalog/views/versionTable.ts` (144 lines): Renders the published versions table with state badges, commit hashes, build entries, and published dates.
  - `src/catalog/views/versionProvenanceCard.ts` (111 lines): Renders the 10-row provenance and build detail property grid for a selected version.
  - `src/catalog/views/rangeResolverCard.ts` (186 lines): Renders the interactive semver range resolver form, query inputs, and resolved kernel/parts result box.
- **Shared Leaf Primitives**:
  - `src/catalog/views/badges.ts` (50 lines): Reusable visual badges (`renderKindBadge`, `renderStateBadge`) consumed by multiple sibling view files (`partsList.ts`, `versionTable.ts`, `browser.ts`).
- **Layout Composers remain in the view entry file (`console.ts`, `browser.ts`)**:
  - Layout functions whose sole responsibility is arranging child sections into panes (`renderLeftPane`, `renderRightPane`, `renderRightDetailsPane`, `renderPartDetails`, and the root view functions) remain in `console.ts` (184 lines) and `browser.ts` (194 lines).
  - Empty selection placeholders (`renderNoReleaseCard`, `renderNoPartSelectedPlaceholder`) stay in the view entry file where the conditional selection branch lives.

### The In-File Function Size Rule
> **Within each file, no function may exceed ~120 lines. Any section containing discrete sub-structures (such as action boxes, result cards, or repeated grid rows) must decompose internally into named helper functions.**

---

## 3. Function Inventory & Length Audit

Every function across both parts was audited for line length. Below is the complete function inventory:

### Releases (`src/releases/views/`)

| File | Function | Lines | Purpose & Why It Did Not Decompose Further |
|---|---|---|---|
| `composerCard.ts` | `renderComposerCard` | **110** | Card container integrating header, description, `renderComposerInputs`, action buttons, error card, and `renderComposeResultBox`. Further decomposition would fragment button handlers and status conditionals from the card shell. |
| `selectedReleaseCard.ts` | `renderDeployActionBox` | **106** | Self-contained action block card with contextual deploy/rollback button, reactive status labels, and inline error/success messages. |
| `releasesSection.ts` | `renderReleaseItem` | **78** | Single release button item with reactive selection state, live badge, hash, and metadata row. |
| `selectedReleaseCard.ts` | `renderSelectedReleaseCard` | **75** | Selected release card container composing release header, metadata property grid, `renderIncludedParts`, and `renderDeployActionBox`. |
| `composerCard.ts` | `renderComposerInputs` | **75** | Input fields for release label, kernel range, and parts & version requirements textarea. |
| `selectedReleaseCard.ts` | `renderIncludedParts` | **68** | Heading, table header grid, and stack of included part entries. |
| `sitesSection.ts` | `renderSiteItem` | **67** | Single site item button with reactive selection border, host name, application badge, and live release hash indicator. |
| `composerCard.ts` | `renderComposeResultBox` | **63** | Renders resolved composition summary or problem list with problem kind badges. |
| `console.ts` | `renderReleasesHeader` | **56** | Header row with title heading, tenant badge, and refresh button. |
| `releasesSection.ts` | `renderReleasesSection` | **53** | Releases stack container with heading, loading state, error card, `each` release item, and empty state. |
| `sitesSection.ts` | `renderSitesSection` | **53** | Sites stack container with heading, loading state, error card, `each` site item, and empty state. |
| `console.ts` | `renderReleasesView` | **41** | Root view function composing `renderReleasesHeader`, `renderLeftPane`, and `renderRightPane`. |
| `console.ts` | `renderNoReleaseCard` | **24** | Empty selection card placeholder. |
| `console.ts` | `renderRightPane` | **23** | ScrollView composing `when(selectedRelease, ...)` and `renderComposerCard`. |
| `console.ts` | `renderLeftPane` | **21** | ScrollView composing `renderSitesSection`, divider, and `renderReleasesSection`. |

### Catalog (`src/catalog/views/`)

| File | Function | Lines | Purpose & Why It Did Not Decompose Further |
|---|---|---|---|
| `rangeResolverCard.ts` | `renderRangeResolverCard` | **117** | Card container with title, description, 3 query inputs (kernel, part name, range), resolve button, error text, and result box caller. |
| `browser.ts` | `renderPartDetails` | **106** | Right-pane details stack for selected part: title row, kind badge, description, repo/license/homepage, keywords badges, `renderVersionTable`, `renderVersionProvenanceCard`, and `renderRangeResolverCard`. |
| `versionProvenanceCard.ts` | `renderVersionProvenanceCard` | **102** | 10-row property grid for commit, repo, build entry, digest, target kernel, contracts, capabilities, required parts, and changelog. It is a single descriptive property grid. |
| `header.ts` | `renderCatalogHeader` | **88** | Top navigation bar with title, count badge, search input, `renderKindFilterButtons`, and refresh button. |
| `versionTable.ts` | `renderVersionTable` | **84** | Container stack with published versions heading, loading/error states, grid table header, and rows stack. |
| `partsList.ts` | `renderPartItem` | **63** | Part item button with name, kind badge, description, and publisher info. |
| `partsList.ts` | `renderPartsList` | **58** | ScrollView with loading/error states, `each` part item, and empty search result message. |
| `rangeResolverCard.ts` | `renderResolveResultBox` | **56** | Result box displaying resolved kernel, resolved parts, and unsatisfied requirements list. |
| `header.ts` | `renderKindFilterButtons` | **52** | Filter button group for 'All', 'Apps', and 'Extensions' with active state styling. |
| `versionTable.ts` | `renderVersionRow` | **46** | Grid row button for a published version with state badge, commit hash, entrypoint, and published date. |
| `browser.ts` | `renderCatalogView` | **35** | Root view function composing `renderCatalogHeader`, `renderPartsList`, and `renderRightDetailsPane`. |
| `browser.ts` | `renderRightDetailsPane` | **22** | ScrollView composing `when(selectedPart, renderPartDetails, renderNoPartSelectedPlaceholder)`. |
| `badges.ts` | `renderKindBadge` | **22** | Visual badge mapping part kind (`kernel`, `application`, `extension`) to theme colors. |
| `badges.ts` | `renderStateBadge` | **21** | Visual badge mapping version state (`built`, `declared`, `failed`) to status colors. |
| `browser.ts` | `renderNoPartSelectedPlaceholder` | **11** | Empty selection card placeholder. |

---

## 4. Near-Identical Sections Between the Consoles: Evidence for `ui.*`

Both `releases` and `catalog` are two-pane administrative consoles over remote collections (`models`). Comparing their decomposed sections reveals widespread structural and stylistic duplication. This is concrete evidence of what the upcoming `ui.*` component vocabulary (`mesh-web/spec/components.md`) must provide.

### 1. The Entity List Sidebar (`sitesSection`, `releasesSection`, `partsList`)
- **Structure**: A fixed-width vertical `ScrollView` (`320px` in catalog, `340px` in releases) with dark surface background (`#161b22`), right border (`1px solid #30363d`), and 8–12px padding.
- **Header**: Uppercase level 2 heading (`14px`, `var(--ink-dim, #8b949e)`, `letterSpacing: '0.5px'`) displaying the entity name and count in parentheses:
  ```ts
  `Sites (${String(app.sites().length)})`
  `Releases (${String(app.releases().length)})`
  `${String(app.filteredParts().length)} of ${String(app.parts().length)} parts`
  ```
- **Tricolor Lifecycle Handling**: Both consoles duplicate three identical conditional branches:
  1. `when(status === 'loading')` → Muted text `"Loading <entities>..."`
  2. `when(status === 'error')` → Error card with `background: rgba(248, 81, 73, 0.1)`, `border: 1px solid #f85149`, `color: #f85149`, `borderRadius: 6px`.
  3. `when(status === 'ready' && length === 0)` → Muted empty-state message `"No <entities> found..."`
- **List Items**: An `each()` loop rendering full-width `Button`s with:
  - Flex column layout, left-aligned text, `borderRadius: 6px`, `padding: 8px 12px` (or `10px 12px`).
  - Active selection state: `border: 1px solid var(--accent, #58a6ff)` and `background: rgba(88, 166, 255, 0.12–0.15)`.
  - Inactive state: `border: 1px solid var(--edge, #30363d)` (or transparent) and `background: var(--surface, #21262d)`.
  - Top row with bold title and visual badge; secondary row with monospace hash/commit/entry; bottom row with muted metadata.
  - Selection intent: `command('<part>.select<Entity>', id)`.

### 2. The Detail Surface (`selectedReleaseCard`, `renderPartDetails`, `versionProvenanceCard`)
- **Empty Selection State**: When no entity is selected, both consoles display an identical centered placeholder card:
  - `padding: 24px` (or `40px 20px`), dark background, border, level 2 heading in `var(--ink-dim, #8b949e)`, and explanatory subtitle prompting the user to select an item from the left.
- **Selected Card Surface**:
  - `Card` container with `padding: 16px`, `background: var(--chrome, #161b22)`, `border: 1px solid var(--edge, #30363d)`, `borderRadius: 6px`.
  - Header with large entity title (18–22px) and status/kind badge.
- **Two-Column Property Grid**:
  - Both cards use `element('Grid', { props: { columns: '140px 1fr' (or '180px 1fr'), gap: 6-8 } })`.
  - Every row repeats: `element('Span', { props: { bold: true }, children: [text('<Label>:')] })` followed by either a normal `Span` or a monospace `Span` (`code: true, color: '#58a6ff'`) for hashes/digests/commits.

### 3. Nested Collection Grids (`Included Parts` in releases, `versionTable` in catalog)
- Neither console had a table component, so both manually synthesized one using nested layouts:
  1. A header row via `Grid` with fixed column widths (`120px 100px 1fr` vs `110px 90px 140px 1fr 140px`), darker background (`#21262d` or `#161b22`), uppercase/bold muted text, and rounded top corners (`borderRadius: '4px 4px 0 0'` or `'6px 6px 0 0'`).
  2. A `Stack` container with `border: 1px solid var(--edge, #30363d)`, `borderTop: 0`, and rounded bottom corners.
  3. An `each()` loop rendering rows as interactive buttons or grids with `borderBottom: 1px solid var(--edge, #30363d)`.

### 4. Interactive Action Cards (`composerCard`, `rangeResolverCard`, `deployActionBox`)
- **Action Header & Disclaimer**: Heading level 2 or 3 accompanied by subtitle text reassuring the user that the operation is safe/non-destructive until explicitly confirmed ("Test pure semver range resolution...", "Compose resolves version ranges... Nothing goes live until cdn.deploy is called").
- **Form Controls**:
  - Label `Span` + `Input` / `TextArea` with identical styling: `background: var(--surface, #21262d)`, `border: 1px solid var(--edge, #30363d)`, `color: var(--ink, #e6edf3)`, `borderRadius: 4px`, `fontSize: 12px`.
  - Bound to state via `command('<part>.set<Field>')`.
- **Button Row**:
  - Primary button: `background: var(--accent, #58a6ff)`, `color: var(--on-accent, #0d1117)`, `fontWeight: '600'`.
  - Secondary/inspection button: `background: var(--surface, #21262d)`, `border: 1px solid var(--edge, #30363d)`.
  - Reactive loading state: `() => app.status() === '<busy>' ? 'Running...' : '<Label>'`.
- **Structured Result Box**:
  - Container with `padding: 10–12px`, rounded corners, border.
  - Displays green/accent valid state or red error state with a list of issues formatted as `• [<kind>] <message>` via `each()`.

### Recommendations for the `ui.*` Vocabulary
Based on this empirical duplication, the `ui.*` layer needs six core components to eliminate ~70% of this boilerplate:
1. `ui.sidebar`: Layout container managing fixed width, responsive collapse, borders, and scrolling.
2. `ui.entityList`: High-level list taking `{ items, key, selectedKey, onSelect, renderItem, status, error, emptyMessage }` and handling loading, error, and empty states automatically.
3. `ui.propertyGrid`: Inspector component taking an array of `{ label, value, code?: boolean }` tuples, eliminating dozens of manual `Grid` + `Span(bold)` + `Span` lines.
4. `ui.table`: Structured table component taking column definitions (`header`, `width`, `render`) and rows, replacing hand-stitched `Grid` headers and `Stack` borders.
5. `ui.actionCard`: Card wrapper with standardized title, explanation slot, form inputs, primary/secondary action buttons, loading indicator, and result/error presentation slots.
6. `ui.badge`: Standard status badge with semantic variants (`info`, `success`, `warning`, `error`).

---

## 5. Bugs Found and Deliberately Left

In accordance with dispatch instructions (*"find a bug, report it, leave it"*), the following bugs were identified and preserved intact:

1. **Deploy Button Label Shows "Roll Back" for Forward Deploys to Occupied Sites**  
   *Location:* `src/releases/views/selectedReleaseCard.ts:63` (extracted from `console.ts:537`)  
   ```typescript
   if (app.deployStatus() === 'deploying') return 'Deploying...';
   if (app.selectedSite()?.releaseHash) return '↺ Roll Back to this Release';
   return 'Deploy to Site';
   ```
   *Issue:* If a site currently runs Release 1, and the user selects Release 2 (a newer release), the button still renders `'↺ Roll Back to this Release'` simply because `selectedSite().releaseHash` is truthy. The button only renders `'Deploy to Site'` on an unprovisioned site with no release hash.

2. **CSS Border Shorthand Overrides `borderBottom` in Version Row**  
   *Location:* `src/catalog/views/versionTable.ts:24-28` (extracted from `browser.ts:389-393`)  
   ```typescript
   borderBottom: '1px solid var(--edge, #30363d)',
   background: app.selectedVersionNumber() === v().version
       ? 'rgba(88, 166, 255, 0.15)'
       : 'transparent',
   border: 'none',
   ```
   *Issue:* `border: 'none'` is declared after `borderBottom` in the style object. In JavaScript object literal evaluation and CSS styling, the shorthand `border: 'none'` resets all borders, overriding `borderBottom`.

3. **Non-Reactive Property Closures in Version Provenance Card**  
   *Location:* `src/catalog/views/versionProvenanceCard.ts:13-97` (extracted from `browser.ts:441-532`)  
   ```typescript
   const v = app.selectedVersion();
   if (v === null) return element('EmptyNode');
   ...
   children: [text(v.commit)]
   ```
   *Issue:* `const v = app.selectedVersion()` is captured once when `when(() => app.selectedVersion() !== null, ...)` transitions to true. Unlike `selectedReleaseCard.ts` (which uses reactive getter functions `text(() => app.selectedRelease()?.hash)` for every property), `versionProvenanceCard.ts` passes static strings `text(v.commit)`. If `app.selectedVersion()` changes from one version to another while remaining non-null, the static text nodes will not update reactively without a full unmount.

4. **Unknown Element Tag `<EmptyNode>` Used as Null Placeholder**  
   *Location:* `src/releases/views/composerCard.ts:251` and `src/catalog/views/rangeResolverCard.ts:178` (extracted from `console.ts:756` and `browser.ts:648`)  
   ```typescript
   if (res === null) return element('EmptyNode');
   ```
   *Issue:* When `res === null`, the component returns `element('EmptyNode')`. In the DOM renderer, this instantiates an unrecognized `<emptynode>` HTML element in the document tree rather than returning null or an empty fragment.

5. **Hardcoded Viewport Header Offset Calculation**  
   *Location:* `src/releases/views/console.ts:168` and `src/catalog/views/browser.ts:178` (extracted from `console.ts:886` and `browser.ts:862`)  
   ```typescript
   height: 'calc(100% - 56px)'
   ```
   *Issue:* Assumes the header bar is always exactly 56px tall. If the viewport narrows and flex children in the header wrap to a second line, the body height does not adapt, causing the bottom of the two panes to be pushed below the screen edge.

6. **Redundant Null-Guards in Text Formatters**  
   *Location:* `src/releases/views/sitesSection.ts:63` and `src/releases/views/releasesSection.ts:42` (extracted from `console.ts:170, 262`)  
   - `site().releaseHash ? site().releaseHash?.slice(0, 17) + '...' : 'None deployed'` (optional chaining `?.` is redundant after truthiness check).  
   - `rel().name && rel().name !== '' ? rel().name ?? '' : 'Unnamed Release'` (coalescing `?? ''` is redundant after checking truthy and non-empty).

---

## 6. Reader Audit Checklist

- [x] **Working directory verified**: strictly `/home/ubuntu/code/mesh-core-dispatch-6`, never `/home/ubuntu/code/mesh-core`.
- [x] **Foreground execution only**: all tests, builds, and commands executed in the foreground with zero backgrounding.
- [x] **One file per commit**: every extracted file and decomposition edit committed individually as it was created (12 commits).
- [x] **No functions over ~120 lines**: every function across all 13 files is 117 lines or fewer.
- [x] **Top-level view functions clean**: both `renderReleasesView` (41 lines) and `renderCatalogView` (35 lines) read as clean declarative lists of their screen layout.
- [x] **All 28 tests pass**: verified via `npm test` without any modifications to test assertions.
- [x] **Typecheck clean**: verified via `npm run typecheck` (`tsc -p tsconfig.json --noEmit`) with zero errors and zero casts.
- [x] **`mesh.json` patch bumps**: `catalog` bumped `0.2.1` → `0.2.2`; `releases` bumped `0.2.2` → `0.2.3`. Kernel remains `^0.13`.
