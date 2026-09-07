# Dispatch 5 Report: Split Core Parts by Architectural Boundary

**Date:** 2026-09-06  
**Repository:** `FLYBYME/mesh-core` (Worktree: `/home/ubuntu/code/mesh-core-dispatch-5`)  
**Specification:** `~/code/surfdns/architecture/boundaries.md`  
**Kernel:** `@flybyme/mesh-web` (`^0.13`, `v0.13.0`)  
**Parts Migrated & Bumped:**
- `auth`: `0.3.0` → `0.3.1` (commit `a7ce812`)
- `chrome`: `0.2.0` → `0.2.1` (commit `457d3aa`)
- `catalog`: `0.2.0` → `0.2.1` (commit `713ac7e`)
- `releases`: `0.2.0` → `0.2.1` (commit `20b4e0b`)

---

## 1. Executive Summary

This dispatch refactored all four core platform parts (`auth`, `chrome`, `catalog`, and `releases`) into the project's standard boundary file structure specified in `boundaries.md`:

```
src/<part>/
    contract.ts       the token, the API interface, NEEDS, CONSUMES (leaf module)
    <pure>.ts         pure logic with no kernel imports (where applicable)
    views/
        <view>.ts     one view per file
    index.ts          the Application or Extension class, and default export
```

### Key Outcomes
1. **Four Checkable Rules Enforced**:
   - **Rule 1 (`contract.ts` leaf rule)**: `contract.ts` in all four parts imports nothing from its sibling modules. External parts and artifacts can import contracts safely without bundling implementation code.
   - **Rule 2 (`index.ts` isolation rule)**: `index.ts` is the root implementation file and is not imported by any other part in `src/`. Grep check `from '../[a-z]*/index.js'` returns zero matches.
   - **Rule 3 (Pure logic isolation)**: Pure files (`src/auth/store.ts`, `src/releases/parse.ts`) contain zero kernel imports (`@flybyme/mesh-web`), making them testable in isolation without a browser or mounted application.
   - **Rule 4 (One view per file)**: Every distinct screen unit lives in its own dedicated file under `views/` (`src/catalog/views/browser.ts`, `src/releases/views/console.ts`, `src/chrome/views/{shell,windowList,modeSwitch,authView}.ts`).
2. **Four Discrete, Reviewable Commits**:
   - Refactored sequentially: `auth` → `chrome` → `catalog` → `releases`.
   - Each part committed separately with its own patch bump in `mesh.json`.
3. **Zero Casts & Clean Typecheck**:
   - `npm run typecheck` passes with zero errors.
   - Zero `as any`, zero `as never`, zero type casts across all edits.
4. **Untouched Test Suite**:
   - All 28 browser tests across all 4 test files pass cleanly without modifying test assertions.

---

## 2. Whether a Console Has a Pure Half at All

`boundaries.md` states Rule 3 as:
> *`<pure>.ts`: logic with no kernel import — math.ts, parse.ts, sort.ts. The pure files import no kernel.*

One of the explicit questions for this dispatch was whether administrative consoles like `catalog` and `releases` have a pure half at all, or if Rule 3 yields nothing for parts that are predominantly views over remote data.

### The Findings by Part

| Part | Pure File | Pure Logic Extracted | Dependencies |
|---|---|---|---|
| **`releases`** | `src/releases/parse.ts` | `parsePartsInput(raw: string): readonly CdnComposeInputPart[]` | Zero kernel imports. Imports only `type { CdnComposeInputPart }` from `../generated/api.js`. |
| **`catalog`** | *None* | *None* (Rule 3 yields nothing) | N/A |
| **`auth`** | `src/auth/store.ts` | `sessionTicketStore(key?: string): TicketStore` | Zero kernel imports. Pure browser `sessionStorage` wrapper. |
| **`chrome`** | *None* | *None* (Rule 3 yields nothing) | N/A |

### Architectural Insights

1. **`releases` does have a pure half**:
   - `parsePartsInput` parses raw multi-line strings into structured `{ id, version, kind }` records, strips comment lines (`#`), trims whitespace, and validates colon-separated tokens.
   - This function is pure domain parsing. It does not depend on signals, DOM elements, or kernel APIs. Extracting it to `src/releases/parse.ts` decouples input parsing from both `ReleasesApp` and `renderReleasesView`. It is directly testable without booting a browser harness.
2. **`catalog` has NO pure half**:
   - An exhaustive line-by-line audit of `src/catalog/index.ts` showed that it consists entirely of two concerns:
     1. Reactive state management and RPC bindings inside `CatalogApp.start()` (`cx.models('part')`, `cx.models('partVersion')`, `cx.mesh.call('catalog.resolve')`, `cx.state.computed()`, `cx.state.effect()`).
     2. View tree descriptions (`renderCatalogView`, `renderKindBadge`, `renderStateBadge`) constructed using kernel description builders (`element()`, `text()`, `when()`, `each()`).
   - The filtering logic (`parts.rows().filter(...)`) is directly embedded inside a `cx.state.computed` getter that closes over reactive signals (`searchQuery()`, `kindFilter()`). Extracting a standalone `filterParts()` helper would have been an artificial refactoring solely to manufacture a file, violating the instruction: *"Split is not a redesign. It is honouring seams the code already draws."*
3. **The Architectural Lesson**:
   - Rule 3 is **not a mandatory template that must be forced onto every part**. It applies specifically to parts that contain domain algorithms, expression parsers, formatting math, or local data transformations.
   - For pure data consoles whose sole function is to project remote kernel models into reactive UI trees, the natural boundary is bipartite (`contract.ts` + `views/` + `index.ts`) rather than tripartite. Attempting to force a `<pure>.ts` file where no pure logic exists produces hollow indirection.

---

## 3. What Happened to `chrome`'s Module-Level `authProvided` Flag

### The Problem & Hazard

`src/chrome/index.ts` implements dynamic optional consumption of the `AUTH` provider token:
```typescript
let authProvided = false;
const originalAuthId = AUTH.id;

try {
    Object.defineProperty(AUTH, 'id', {
        get() {
            authProvided = true;
            return originalAuthId;
        },
        configurable: true,
    });
} catch {
    // If not configurable, proceed
}
```
When `AuthExtension` is composed on a page, the kernel accesses `AuthExtension.provides.id`, which triggers this getter and sets `authProvided = true`.
- When `ChromeExtension.consumes` is accessed, it evaluates `authProvided ? CONSUMES : EMPTY_CONSUMES`.
- When `ChromeExtension.commands` is accessed, it resets `authProvided = false` for the subsequent boot.
- When `ChromeExtension.activate(cx)` runs, it checks `if (authProvided)` before invoking `cx.use(AUTH)`.

If the split had moved `authProvided` into `src/chrome/contract.ts`, two serious problems would have emerged:
1. **Contract Impurity**: `contract.ts` would execute a runtime monkey-patch on a foreign singleton (`AUTH.id`) as a side effect of simply importing types or tokens.
2. **Split Module State Hazard**: If `contract.ts` held the boolean flag while `index.ts` or `views/` held copies or getters, module execution order in different bundlers or test runners could cause one module to observe stale state while another reset it.

### The Decision & Outcome

- **Kept `authProvided` in `src/chrome/index.ts`**:
  `authProvided`, the monkey-patch, and all code that reads/resets it remain co-located in `src/chrome/index.ts` directly above `ChromeExtension`.
- **Kept `src/chrome/contract.ts` purely declarative**:
  `contract.ts` defines and exports:
  ```typescript
  export const NEEDS = needs('chrome', 'log', 'commands', 'state');
  export const CONSUMES = consumes(AUTH);
  export const EMPTY_CONSUMES = consumes();
  export { PAGE_CHROME, type PageChrome, AUTH, type AuthApi };
  ```
  It has zero runtime side-effects and zero mutable module variables.
- **Why this made reasoning easier**:
  State lifecycle is concentrated entirely within the single file that instantiates and activates `ChromeExtension`. A reader can verify that `consumes` reads the flag, `commands` resets it, and `activate()` branches on it, all within 70 contiguous lines in `index.ts`.
- **Test Verification**:
  The regression test `a page with chrome and no auth still works after a page with auth ran` passed on the first run and continues to pass.

---

## 4. Whether `auth`'s Existing Two-File Split Matched the Shape or Had to Be Redone

### The Finding: **It had to be completely redone.**

Before this dispatch, `auth` was the only part in `mesh-core` with more than one file (`src/auth/index.ts` and `src/auth/extension.ts`). However, that split did **not** conform to the boundary specification:

1. **Pre-existing `src/auth/index.ts`**:
   Was an empty re-export barrel:
   ```typescript
   export { AuthExtension as default } from './extension.js';
   export * from './extension.js';
   ```
2. **Pre-existing `src/auth/extension.ts`**:
   Was a 408-line monolith containing:
   - Contract definitions (`AUTH`, `AuthApi`, `Session`, `Membership`, `Credentialed`)
   - Options interfaces (`AuthEndpoints`, `AuthOptions`, `TicketStore`)
   - Capability declaration (`NEEDS`)
   - Header constants (`SCOPE_HEADER`)
   - Pure browser storage logic (`sessionTicketStore`)
   - Implementation class (`AuthExtension`)
   - Internal RPC schema mappings (`IssueReply`, `WhoamiReply`)

### How It Was Redone

`src/auth/extension.ts` was deleted and replaced with three distinct, single-responsibility files conforming to `boundaries.md`:
1. **`src/auth/contract.ts` (Leaf Contract Module)**:
   - Declares `Membership`, `Session`, `Credentialed`, `AuthApi`, `AUTH`, `AuthEndpoints`, `AuthOptions`, `TicketStore`, `NEEDS`, `CONSUMES`, and `SCOPE_HEADER`.
   - Imports only from `@flybyme/mesh-web`.
   - Imports **zero files from siblings**.
2. **`src/auth/store.ts` (Pure File)**:
   - Contains `sessionTicketStore(key?: string): TicketStore`.
   - Imports **no kernel** (`@flybyme/mesh-web`).
   - Depends only on standard Web Storage APIs (`globalThis.sessionStorage`).
3. **`src/auth/index.ts` (Implementation & Default Export)**:
   - Houses the `AuthExtension` class, private closure state (`ticket`, `scope`), network request helper, and lifecycle activation.
   - Re-exports `contract.ts` and `store.ts` so that external consumers importing `src/auth/index.js` suffer no breaks.
   - Deleted `src/auth/extension.ts`.

---

## 5. Bugs Found and Deliberately Left

Per prompt instructions (*"No renamed exports, no changed signatures, no fixes in passing. Found a bug? Report it, leave it"*), all discovered defects were preserved untouched.

### 1. `src/auth/index.ts:153` (formerly `extension.ts:392`) — Zero Lifetime for Restored Tickets
- **Code**:
  ```typescript
  const UNKNOWN_LIFETIME = 0;
  ...
  if (ticket !== undefined) {
      void restore(now() + UNKNOWN_LIFETIME).catch(...);
  }
  ```
- **Defect**: When restoring a session on boot from a persisted ticket store, `restore` receives `now() + 0`. As a result, `session.expiresAt` is set to the exact timestamp of restoration. Any consumer inspecting `session.expiresAt` will conclude the session is immediately expired.
- **Action**: Preserved as-is.

### 2. `src/releases/parse.ts:14-16` (formerly `releases/index.ts:79-81`) — Hardcoded Extension Kind Classification
- **Code**:
  ```typescript
  const kind: 'application' | 'extension' = (id === 'chrome' || id === 'theme' || id === 'auth')
      ? 'extension'
      : 'application';
  ```
- **Defect**: In `parsePartsInput`, only `'chrome'`, `'theme'`, and `'auth'` are recognized as extensions. Any other extension composed through the console (such as future extensions or third-party extensions) will be erroneously assigned `kind: 'application'`, which will cause resolution or catalog validation errors.
- **Action**: Preserved as-is.

### 3. `src/catalog/index.ts:87` (formerly `catalog/index.ts:1080`) — Stale Default Kernel Fallback
- **Code**:
  ```typescript
  const res = await cx.mesh.call('catalog.resolve', {
      kernel: kRange === '' ? '^0.11' : kRange,
      parts: [{ name: pName, version: pRange === '' ? '*' : pRange }],
  });
  ```
- **Defect**: If `resolveKernel` is cleared or empty, the catalog resolution fallback is `'^0.11'`, even though the repository upgraded to kernel `^0.13` in dispatch 4 and `mesh.json` specifies `^0.13`.
- **Action**: Preserved as-is.

---

## 6. Reader Audit & Verification

### File Structure Comparison

```
Before Dispatch 5:
src/
├── auth/
│   ├── index.ts        (21 lines - re-export only)
│   └── extension.ts    (408 lines - monolithic)
├── catalog/
│   └── index.ts        (1,180 lines - monolithic)
├── chrome/
│   └── index.ts        (445 lines - monolithic)
├── generated/
│   └── api.ts          (1,102 lines)
└── releases/
    └── index.ts        (1,233 lines - monolithic)

After Dispatch 5:
src/
├── auth/
│   ├── contract.ts     (133 lines - leaf contract)
│   ├── index.ts        (238 lines - AuthExtension & default export)
│   └── store.ts        (23 lines - pure Web Storage logic)
├── catalog/
│   ├── contract.ts     (44 lines - leaf contract)
│   ├── index.ts        (283 lines - CatalogApp & default export)
│   └── views/
│       └── browser.ts  (874 lines - catalog browser view)
├── chrome/
│   ├── contract.ts     (16 lines - leaf contract)
│   ├── index.ts        (197 lines - ChromeExtension & default export)
│   └── views/
│       ├── authView.ts   (183 lines - auth controls view)
│       ├── modeSwitch.ts (24 lines - mode toggle view)
│       ├── shell.ts      (74 lines - desktop shell container view)
│       └── windowList.ts (49 lines - window tabs list view)
├── generated/
│   └── api.ts          (1,102 lines)
└── releases/
    ├── contract.ts     (48 lines - leaf contract)
    ├── index.ts        (290 lines - ReleasesApp & default export)
    ├── parse.ts        (21 lines - pure parts input parser)
    └── views/
        └── console.ts  (896 lines - releases console view)
```

### Git Commits in this Dispatch

```
20b4e0b Split releases into contract, pure parse, console view, and index with 0.2.1 patch bump
713ac7e Split catalog into contract, browser view, and index with 0.2.1 patch bump
457d3aa Split chrome into contract, views, and index with 0.2.1 patch bump
a7ce812 Split auth into contract, pure store, and index with 0.3.1 patch bump
```

### Verification Checklist
- [x] Four parts split into boundary file structure (`contract.ts`, `<pure>.ts`, `views/`, `index.ts`).
- [x] All 4 `contract.ts` files import zero siblings.
- [x] No imports of `from '../[a-z]*/index.js'` across `src/` and `test/`.
- [x] Pure files (`store.ts`, `parse.ts`) import no kernel.
- [x] Views separated into one view per file under `views/`.
- [x] `mesh.json` patch bumps:
  - `chrome`: `0.2.0` → `0.2.1`
  - `catalog`: `0.2.0` → `0.2.1`
  - `releases`: `0.2.0` → `0.2.1`
  - `auth`: `0.3.0` → `0.3.1`
- [x] Kernel requirement unchanged (`^0.13`).
- [x] All 28 browser tests green across all 4 test files.
- [x] `npm run typecheck` clean.
- [x] Zero `as any`, zero `as never`, zero type casts.
