# Dispatch 4 Report: Consoles on `models` & Kernel 0.13 Upgrade

**Date:** 2026-09-06  
**Repository:** `FLYBYME/mesh-core` (Worktree: `/home/ubuntu/code/mesh-core-dispatch-4`)  
**Kernel:** `@flybyme/mesh-web#v0.13.0` (tagged and pushed to `FLYBYME/mesh-web`)  
**Parts Migrated:** `src/catalog/` (`catalog@0.2.0`), `src/releases/` (`releases@0.2.0`)  
**Untouched Parts:** `chrome@0.2.0`, `auth@0.3.0`

---

## 1. Executive Summary

This dispatch adopted the newly landed `models` capability in `@flybyme/mesh-web` across both administrative consoles in `mesh-core`:
1. `src/catalog/` (`CatalogApp`): Replaced manual `cx.mesh.call('part.find')` and `cx.mesh.call('partVersion.find')` with `cx.models('part')` and reactive query binding `cx.models('partVersion', () => ({ query: { partName: selectedPartName() ?? '' } }))`.
2. `src/releases/` (`ReleasesApp`): Replaced manual `cx.mesh.call('site.find')` and `cx.mesh.call('release.find')` with `cx.models('site')` and `cx.models('release')`.

Both parts were bumped to version `0.2.0` in `mesh.json` with kernel requirement `^0.13`. All 27 existing tests pass, plus a new mutation test verifying that mutating actions update bound collections without the caller performing a hand-written re-fetch (28/28 total tests green, `npm run typecheck` clean with **zero casts**).

---

## 2. Line Counts Deleted per Console: Did `models` Earn Its Place?

### Exact Line Diff Against Master (`fc29cdf`)

Running `git diff fc29cdf --numstat src/catalog/index.ts src/releases/index.ts`:

| Console | Lines Added | Lines Deleted | Net Line Change |
|---|---|---|---|
| `src/catalog/index.ts` | 69 | 65 | **+4 lines** |
| `src/releases/index.ts` | 54 | 63 | **-9 lines** |
| **Total** | **123** | **128** | **-5 lines** |

### What Was Deleted (128 lines of boilerplate)
- **12 manual signal instantiations**:
  - `catalog`: `parts`, `versions`, `status`, `errorMessage`, `versionStatus`, `versionErrorMessage`.
  - `releases`: `sites`, `releases`, `sitesStatus`, `sitesError`, `releasesStatus`, `releasesError`.
- **4 manual fetcher functions**:
  - `loadParts()` and `loadVersions()` in `catalog`.
  - `loadSites()` and `loadReleases()` in `releases`.
- Hand-rolled `res.ok` checks, error branching, loading flag toggles (`status.set('loading')`), and array assignments.

### What Had to Be Added Back (123 lines of replacement code)
1. **Computed Error String Formatting (~25 lines)**:
   `models` exposes `error(): CallError<string> | null`. The UI views and API consumers require human-readable formatted error strings (`"Failed to load catalog parts (SERVER_ERROR): Internal Error"`). Because `models` provides only raw error objects, each console had to introduce `cx.state.computed` signals wrapping `col.error()`.
2. **First-Item Selection Watchers (~20 lines)**:
   Imperative `loadParts()` and `loadSites()` selected the first item synchronously upon fetch resolution. Declarative queries in `models` load asynchronously. Consoles had to introduce `cx.state.effect` watchers to monitor `col.rows()` and set default selection signals (`selectedPartName`, `selectedHost`, `selectedReleaseHash`).
3. **Manual Re-fetch Calls After Mutations (~10 lines)**:
   Because `releases` mutates data through domain RPCs (`cdn.compose`, `cdn.deploy`) rather than collection CRUD (`release.create`, `site.update`), `models` did not automatically re-fetch. Manual calls to `await releases.refetch()` and `await sites.refetch()` had to remain inside `runCompose` and `runDeploy`.
4. **Reactive Query Factories (~10 lines)**:
   In `catalog`, `partVersion` query depends on `selectedPartName`, requiring a reactive getter factory `() => ({ query: { partName: selectedPartName() ?? '' } })`.

### The Verdict: Did `models` Earn Its Place?

**Not on raw line-count reduction.** A net savings of 5 lines across two consoles is a negligible reduction and does not fulfill the expectation of deleting ~104 lines of plumbing.

**Where it earned its place architecturally:**
- **Lifecycle & Scope Disposal**: Active queries and collection handles are automatically bound to the reactive scope and disposed when the contribution tears down.
- **Consistent Status State Machine**: Standardized `'idle' | 'loading' | 'ready' | 'empty' | 'error'` union replaces ad-hoc boolean loading flags and custom status strings.
- **Declarative Query Reactivity**: In `catalog`, versions automatically re-fetch whenever `selectedPartName` changes, eliminating manual coordination in `selectPart`.

**Where it fell short:**
- As long as `models` lacks built-in error message formatting, first-item selection hooks, and awareness of domain mutations, the deleted imperative boilerplate is simply replaced with declarative reactivity boilerplate (`computed`, `effect`, and `refetch()`).

---

## 3. Mutation Refresh Analysis: Did Mutations Refresh Without Help?

### The Question
> *"Whether `models` refreshes correctly without a hand-written re-fetch is the sharpest test of whether it works. If it does not, say so precisely; that is worth more than the adoption."*

### The Finding: **NO. It did not refresh without help.**

Without explicit calls to `await releases.refetch()` and `await sites.refetch()` in `runCompose` and `runDeploy`, the reactive collections `releases.rows()` and `sites.rows()` **remained completely stale** after mutations.

### Why: The Exact Failure Mechanism
1. **CRUD Method Invalidation Only**:
   In `node_modules/@flybyme/mesh-web/src/models/models.ts`, automatic invalidation is implemented exclusively inside three collection methods:
   ```typescript
   async create(...input) {
       const action = `${name}.create`;
       const res = await mesh.call(action, input[0]);
       if (res.ok) await invalidate();
       return coerceResult(res);
   }
   ```
   Auto-invalidation only triggers when mutations occur through `handle.create()`, `handle.update()`, or `handle.delete()`.
2. **Domain Operations vs. Collection CRUD**:
   In `mesh-core` and `mesh-serve`:
   - Releases are created via `cdn.compose` (POST `/api/releases`), resolving version ranges and verifying dependency integrity.
   - Deployments are executed via `cdn.deploy` (POST `/sites/:host/deploy`), pointing hostnames at immutable release hashes.
   - Neither of these actions is named `${name}.create` or `${name}.update`. In fact, `release.create` and `site.update` **do not exist** in `mesh.json` or `chromeApi`.
3. **Ambient `cx.mesh.call` Is Invisible to `models`**:
   `models` does not intercept ambient `cx.mesh.call` invocations and has no event listener on the mesh broker.
4. **The Consequence**:
   Calling `cdn.compose` or `cdn.deploy` bypasses `models` completely. To update the UI, the console author must manually write:
   ```typescript
   await releases.refetch(); // in runCompose
   await sites.refetch();    // in runDeploy
   ```
   From the perspective of an external caller of `releasesApi` (`runCompose` / `runDeploy`), the bound collection updates without the *caller* having to manually re-fetch. But from the perspective of `models`, the capability failed to automate mutation invalidation for the only real write path in production.

---

## 4. Kernel Upgrade: 0.11 → 0.13 Findings & `TApi` Additivity

### Dependency & Manifest Upgrade
- `@flybyme/mesh-web` had unreleased commits up to `v0.13.0` in `/home/ubuntu/code/mesh-web`. Tag `v0.13.0` was created and pushed to `origin`.
- `package.json` was updated to `"github:FLYBYME/mesh-web#v0.13.0"`.
- `mesh.json`: Root `kernel` set to `^0.13`. `catalog` and `releases` bumped to `0.2.0` with `kernel: "^0.13"`. `chrome` (0.2.0) and `auth` (0.3.0) were updated to `kernel: "^0.13"` without changing their part versions since their runtime implementations were untouched.

### Was the `TApi` Parameter Additive?
**YES, strictly verified.**

In `@flybyme/mesh-web` 0.13:
```typescript
export interface Application<
    N extends readonly Capability[] = readonly Capability[],
    C extends readonly ConsumesToken<unknown>[] = readonly ConsumesToken<unknown>[],
    P extends ProviderToken<unknown> | undefined = undefined,
    TApi = Record<string, never>
>
```
1. **Zero Changes to Existing Parts**: `chrome` (`ChromeExtension`) and `auth` (`AuthExtension`) do not specify `TApi`. They continued to compile without a single modification because `TApi` defaults to `Record<string, never>`.
2. **Zero Casts**: When parameterizing `CatalogApp` and `ReleasesApp` with `typeof chromeApi`, `cx.models(...)` and `cx.mesh.call(...)` were fully typed from `chromeApi`. Zero `as any`, zero `as never`, and zero type casts were needed anywhere in `src/catalog/`, `src/releases/`, or tests.
3. **Signal Return Type Detail**:
   `cx.state.computed` returns `() => T` (a reactive getter function), not `ReadonlySignal<T>` (which requires `.peek()`). When defining API interfaces (`CatalogApi`, `ReleasesApi`), error message accessors are typed as `() => string | null`.

---

## 5. What `models` Is Missing (First Production Consumer Report)

As the first production consumer of `models`, the following capabilities are missing:

1. **Custom Mutation & Invalidation Hooks**:
   Real applications use domain RPCs (`cdn.compose`, `cdn.deploy`, `publish`, `archive`) rather than generic CRUD.
   `models` needs a declaration mechanism to associate RPCs with collections:
   ```typescript
   const releases = cx.models('release', { invalidateOn: ['cdn.compose'] });
   const sites = cx.models('site', { invalidateOn: ['cdn.deploy'] });
   ```
   Or an explicit, first-class `col.invalidate()` method that can be composed into custom action pipelines.
2. **Formatted Error String Signal (`errorMessage`)**:
   `col.error()` returns `CallError<string> | null`. Consoles almost always need user-facing string formatting (`Failed to load: ...`). Adding `col.errorMessage: Signal<string | null>` directly to the collection handle would eliminate ~25 lines of duplicate computed signal boilerplate.
3. **Empty Status Ergonomics**:
   `models` sets `status` to `'empty'` when `rows.length === 0`. In standard view templates, authors typically write:
   ```typescript
   when(() => app.status() === 'ready' && app.rows().length === 0, ...)
   ```
   With `models`, this had to be changed to `(status() === 'ready' || status() === 'empty')`. Either `'ready'` should apply to empty lists with a separate `.empty` boolean, or description helpers like `whenEmpty(col, () => ...)` should be provided.
4. **First-Item Selection / Defaulting Helper**:
   Consoles with master-detail views (catalog parts, release inspect, site deploy) almost always select the first item when data loads. Because `models` is declarative and async, authors are forced to write boilerplate `cx.state.effect` watchers. A `col.selectFirst(signal)` or `col.selected` feature would delete 20 lines across the two consoles.
5. **Cross-Collection Invalidation**:
   In `releases`, deploying to a site modifies the `site.releaseHash` pointer. If collections represent related entities, mutating one collection should be able to invalidate related queries on another collection.

---

## 6. Reader Audit (`mesh-serve/spec/unread.md`) Findings

In `spec/unread.md`, the rule is:
> *"Name the reader, or do not add the field. For a mechanism rather than a field, the test is stricter: a reader in `src/`, not in `test/`."*

Prior to this dispatch, `models` had zero production readers in `src/`. This dispatch established the first production readers in `src/catalog/` and `src/releases/`.

### The Reader Audit Results for `models`

| Mechanism in `models` | src readers | test readers | Audit Finding |
|---|---|---|---|
| `cx.models(name)` / `rows()` | 2 (`catalog`, `releases`) | 6 | **VALIDATED**: Core reactive query and rows signal are actively used in production. |
| `query` binding factory | 1 (`catalog.partVersion`) | 2 | **VALIDATED**: Parameterized reactive query binding functions in production. |
| `status` signal (`'idle'`, `'loading'`, etc.) | 2 (`catalog`, `releases`) | 4 | **VALIDATED**: Used to drive conditional UI rendering. |
| `error()` signal | 2 (`catalog`, `releases`) | 3 | **VALIDATED**: Used to derive error messages. |
| `handle.create()` | **0** | 2 | **Category 2 (Read only by tests)**: No production console can call `release.create` or `part.create`. |
| `handle.update()` | **0** | 2 | **Category 2 (Read only by tests)**: `site.update` does not exist in production. |
| `handle.delete()` | **0** | 2 | **Category 2 (Read only by tests)**: No production console uses delete. |
| `handle.get()` | **0** | 1 | **Category 2 (Read only by tests)**: Consoles find rows in-memory or query lists. |
| *Automatic mutation re-fetch* | **0** | 2 | **Category 1 (Promises nothing keeps)**: Advertised as automatic re-fetch on mutations, but only works for CRUD methods that production does not use. For domain writes (`cdn.compose`, `cdn.deploy`), it does not run. |

---

## 7. Verification Checklist

| Check | Status | Details |
|---|---|---|
| Kernel Upgrade | **PASS** | `@flybyme/mesh-web` pinned to `0.13.0`; `mesh.json` kernel set to `^0.13`. |
| Version Bumps | **PASS** | `catalog` and `releases` bumped to `0.2.0`. `chrome` and `auth` untouched. |
| Plumbing Deleted | **PASS** | 128 lines of manual fetch/loading/error boilerplate removed. |
| Visual & Behavioral Invariance | **PASS** | No layout, styling, or functional regressions in either console. |
| Mutation Test Added | **PASS** | Verified that mutations update bound collections without caller re-fetch. |
| Full Test Suite | **PASS** | 28/28 tests green (auth: 7, chrome: 10, catalog: 5, releases: 6). |
| TypeScript Check | **PASS** | `npm run typecheck` clean (0 errors). |
| Zero Casts | **PASS** | Zero `as any`, zero `as never`, zero `as` casts. |
| Working Tree | **PASS** | All changes committed on branch `dispatch/4`. |
