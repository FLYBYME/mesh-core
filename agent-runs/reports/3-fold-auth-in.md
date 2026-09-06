# Dispatch 3 Report: Fold `auth` Extension into `mesh-core` & Upgrade to Kernel 0.11

**Date:** 2026-09-06  
**Repository:** `FLYBYME/mesh-core` (Worktree: `/home/ubuntu/code/mesh-core-dispatch-3`)  
**Source Repository:** `~/code/mesh-auth` (Read-only, archived)  
**Part Added:** `src/auth/index.ts`, `src/auth/extension.ts` (`auth@0.3.0`)  
**Kernel:** `@flybyme/mesh-web` (`^0.11`)

---

## 1. Executive Summary

In this dispatch, the `auth` Extension was migrated from the standalone `mesh-auth` repository into `mesh-core`, bringing it up from kernel `^0.6` (`@flybyme/mesh-web` 0.6.1) to `^0.11` (`@flybyme/mesh-web#v0.11.1`). 

### Key Deliverables & Outcomes
- **Codebase Organization**: Auth lives at `src/auth/index.ts` and `src/auth/extension.ts`, conforming to the repository layout alongside `src/chrome/`, `src/catalog/`, and `src/releases/`.
- **Descriptor & Part Catalog**: Added the fourth part (`auth`) to `mesh.json` with version `0.3.0`, kernel requirement `^0.11`, and full metadata (`description`, `keywords`, `license`, `homepage`) matching the catalog standard.
- **Contract Code Generation**: Auth's declared mesh contracts (`identity.ticket_issue` and `identity.whoami`) were integrated into `mesh.json` and generated via `npm run generate` (`mesh-serve client`). A unified `src/generated/api.ts` (17 contracts) and `descriptor.json` were produced without hand-merging.
- **Test Suite & Integration Verification**: Migrated browser tests to `test/auth.browser.test.ts`. All 7 auth browser tests and all 20 existing chrome, catalog, and releases tests pass (27/27 total).
- **Graceful Degradation Verified**: Implemented explicit regression tests verifying that a page composing chrome without auth continues to boot, mount window hosts, render the topbar, and function with zero auth UI, including after tests that mounted auth.
- **Type Safety**: Passed `npm run typecheck` cleanly with **zero `as any`, zero `as never`, and zero `as` type casts** across the entire codebase.

---

## 2. The 0.6 → 0.11 Upgrade: Requirements & Workarounds Deleted

### What the Upgrade Actually Required
1. **Unified Client Generation**:
   In `mesh-auth`, `src/generated/api.ts` was generated in isolation for `identity.ticket_issue` and `identity.whoami`. In `mesh-core`, running `mesh-serve client` generated client interfaces for all four parts (`chrome`, `catalog`, `releases`, and `auth`) under `chromeApi`.
   `src/auth/extension.ts` imports generated response types structurally:
   ```typescript
   import type {
       IdentityTicketIssueOutput,
       IdentityWhoamiOutput,
   } from '../generated/api.js';
   ```
2. **Import Path Restructuring**:
   Relative imports adjusted from `./generated/api.js` to `../generated/api.js`.
3. **Semver Floor & Version Bump**:
   `auth` was bumped to `0.3.0` (not `0.2.1`). Because `auth@0.2.0` targeted kernel `^0.6`, bumping minor version enforces that existing sites composing `^0.2` do not silently take on the `^0.11` kernel floor. The part's `kernel` field in `mesh.json` now states `^0.11`.

### Workarounds Deleted & Evaluated
- **Untyped `kernel.provided()` Cast in Browser Tests**:
  In `mesh-auth/test/auth.browser.test.ts` line 38, kernel 0.6 required a cast:
  ```typescript
  const auth = site.kernel.provided(AUTH) as AuthApi;
  ```
  In kernel 0.11, `kernel.provided<T>(token: ProviderToken<T>): T | undefined` returns the typed API directly. This cast was deleted, yielding clean assignment:
  ```typescript
  const auth = s.kernel.provided(AUTH);
  expect(auth).toBeDefined();
  expect(auth?.session()).toBeNull();
  ```
- **Controlled Input Workarounds & Styles (A7.0, 0.11.2, 0.11.4)**:
  `AuthExtension` itself is a headless infrastructure extension (`Extension<NEEDS, [], typeof AUTH>`). It provides reactive state and handles network operations; it contains no view layer, no DOM inputs, and no CSS styles.
  The visual auth form is rendered exclusively by `ChromeExtension` in `src/chrome/index.ts`. Per the prompt constraint (*"Do not change chrome's behaviour"*), chrome was untouched. However, an audit of `src/chrome/index.ts` showed that it already uses camelCase styles (e.g. `overflowX`, `alignItems`, `borderBottom`) and controlled signal resets.
- **Provider Token Instantiation Workaround**:
  `mesh-auth` previously called `provider<AuthApi>('mesh-web/auth')` locally in `src/extension.ts`. In kernel 0.11 with chrome co-located, creating a second token instance broke chrome's runtime detection (see Section 3). This local token construction was deleted in favor of importing `AUTH` from `@flybyme/mesh-web`.

---

## 3. Discrepancies Between Provider and Consumer (Critical Findings)

Bringing `auth` (the provider) and `chrome` (the consumer) into the same repository revealed four architectural disagreements between the two halves:

### 1. Provider Token Identity & Reference Equality Hack
- **The Issue**: In `src/chrome/index.ts`, chrome detects whether auth is composed using an `Object.defineProperty` getter on `AUTH.id`:
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
  } catch {}
  ```
  In `mesh-auth`, `src/extension.ts` had:
  ```typescript
  export const AUTH: ProviderToken<AuthApi> = provider<AuthApi>('mesh-web/auth');
  ```
  `provider()` produces a fresh object `{ id: 'mesh-web/auth' }`. Although the string id matches, the object reference is different.
- **The Consequence**: When the kernel constructs the provider graph in `resolveOrder` (`kernel/graph.ts`), it reads `token.id` off `node.declarations.provides`. Because `auth.provides` was pointing to a different object than the one chrome hooked, the getter on `@flybyme/mesh-web`'s `AUTH` was never called! `authProvided` stayed `false`, causing chrome to fall back to `EMPTY_CONSUMES` and hide the sign-in form even when `auth` was composed on the page.
- **The Resolution**: `src/auth/extension.ts` now imports and exports `AUTH` directly from `@flybyme/mesh-web`. When `auth.provides` references the exact singleton object, `node.declarations.provides.id` triggers the getter and chrome correctly sets `consumes = consumes(AUTH)`.

### 2. API Surface Mismatch: Multi-Tenancy & Scoped Organization
- **The Issue**: `@flybyme/mesh-web` declares `AuthApi` and `Session` as:
  ```typescript
  export interface Session {
      readonly userId: string;
      readonly displayName: string;
      readonly roles: readonly string[];
      readonly expiresAt: number;
  }
  export interface AuthApi {
      readonly session: Signal<Session | null>;
      signIn(credentials: Credentialed): Promise<Session>;
      signOut(): Promise<void>;
  }
  ```
  However, `mesh-auth`'s `AuthExtension` actually implements a richer surface supporting multi-tenancy:
  - `Membership` interface (`organizationId`, `name`, `roleKey`)
  - `Session.email`, `Session.memberships`, and `Session.organizationId`
  - `AuthApi.selectOrganization(organizationId: string | null): void`
  - Automatic header attachment: `x-organization: <scope>` on all requests via `cx.credentials.attach`
- **The Consequence**: Chrome only consumes what `@flybyme/mesh-web` exposes (`session`, `signIn`, `signOut`). It displays `displayName || userId` and cannot display or switch organizations. Any consumer obtaining `AUTH` from the kernel typed by `@flybyme/mesh-web` has no static visibility of `selectOrganization` or `memberships` without importing `src/auth/extension.ts` types.

### 3. Lifecycle & Boot-Time Temporal Coupling
- **The Issue**: Chrome resets `authProvided = false` inside its `commands` getter:
  ```typescript
  get commands() {
      authProvided = false;
      return this._commands;
  }
  ```
- **The Consequence**: This creates an undocumented dependency on kernel boot ordering:
  1. Step 3–4: Kernel calls `mergeManifests()`, which reads `contribution.commands` (resetting `authProvided = false`).
  2. Step 5: Kernel calls `resolveOrder()`, which reads `contribution.provides.id` (setting `authProvided = true`) and then reads `contribution.consumes`.
  If the kernel were refactored to read commands after `resolveOrder`, `authProvided` would be erroneously cleared before `activate()` runs.
  Furthermore, `authProvided` is module-scoped mutable state. In environments where multiple sites are mounted in the same process, isolation depends on this precise sequence.

### 4. Manifest Capability Differences
- In legacy `mesh-web`, auth attempted to use global `fetch` and undeclared capabilities.
- `src/auth/extension.ts` explicitly declares `NEEDS = needs('credentials', 'http', 'state', 'log')`.
- It routes all HTTP calls through `cx.http.request` and routes credentials through `cx.credentials.origin` and `cx.credentials.attach`, adhering strictly to the capability security model.

---

## 4. Migration & Compatibility: `auth@0.2.0` vs. `auth@0.3.0`

### What a Site Composing `auth@0.2.0` Keeps Getting
- Sites currently pinning `auth: "^0.2"` or `"^0.2.0"` (such as existing compositions) will **continue to resolve to the immutable `auth@0.2.0` artifact**.
- That artifact was published from the `mesh-auth` repository at commit `788bdd7...` and is built against kernel `^0.6`.
- The catalog resolver (`catalog.resolve`) respects semantic versioning boundaries. A range of `^0.2` will not select `0.3.0`.
- Because releases are immutable digests once composed (`cdn.compose`), existing deployed sites continue serving byte-for-byte identical releases without regression.

### Steps for the Four Live Sites to Move to `0.3.0`
The `auth` part is live on four sites: `demo.localhost`, `localhost`, `127.0.0.1`, and `console.localhost`. To transition them to `0.3.0`:
1. **Commit & Tag**: Commit the changes in this worktree to `FLYBYME/mesh-core`.
2. **Publish `auth@0.3.0`**:
   Run `mesh-serve publish` against the live cluster:
   ```bash
   mesh-serve publish --publisher <org> --bootstrap ws://<node>:port
   ```
   This registers `auth@0.3.0` with repository `FLYBYME/mesh-core` and kernel `^0.11` in the catalog.
3. **Update Site Requirements**:
   In each of the four site definitions, update the version constraint for `auth`:
   ```json
   { "id": "auth", "version": "^0.3.0" }
   ```
4. **Recompose Releases**:
   Call `cdn.compose` for each site. The catalog will resolve `auth` to `0.3.0` (from `mesh-core`) alongside `chrome@0.2.0` and kernel `0.11.x`.
5. **Deploy**:
   Call `cdn.deploy` targeting each hostname with the resulting release hash.

---

## 5. Can `mesh-auth` Be Archived Immediately?

**Yes, `mesh-auth` can be archived, but it must NOT be deleted or moved.**

### Detailed Mechanics
- **How C6 Rebuilds**: The platform builder and cache eviction system (C6) rebuilds artifacts on demand. When an artifact cache expires or a new cluster node bootstraps, the builder queries the catalog for the version's record.
- **Repository Record**: `catalog.publish` stores `partVersion.repository` permanently per version:
  ```typescript
  // Stamped here, at the one moment the repository and the commit are known to belong together.
  // part.repository can move afterwards; this cannot.
  repository: input.repository,
  commit: input.commit
  ```
- For `auth@0.1.0` and `auth@0.2.0`, `partVersion.repository` points to the `mesh-auth` repository.
- When C6 rebuilds `auth@0.2.0`, it executes `git clone <partVersion.repository>` and checks out `partVersion.commit`.
- **Archiving Semantics**:
  - Archiving a GitHub repository sets it to **read-only**. Git HTTPS clone operations (`git clone https://github.com/FLYBYME/mesh-auth.git`) continue to function without restriction.
  - Therefore, archiving `mesh-auth` is completely safe and recommended to prevent accidental commits.
  - However, deleting `mesh-auth` or renaming its URL would cause C6 builds of `auth@0.1.0` and `auth@0.2.0` to fail with repository clone errors.

---

## 6. Reader Audit Checklist

| Check | Status | Verification Detail |
|---|---|---|
| `src/auth/` layout | **PASS** | `src/auth/index.ts` and `src/auth/extension.ts` exist and export `AuthExtension` as default. |
| `mesh.json` 4 parts | **PASS** | `chrome`, `catalog`, `releases`, `auth`. Full metadata (`description`, `keywords`, `license`, `homepage`) present. |
| Auth version & kernel | **PASS** | `version`: `"0.3.0"`, `kernel`: `"^0.11"`. |
| Unified `api.ts` | **PASS** | `npm run generate` produced `src/generated/api.ts` with 17 contracts covering all parts. |
| Browser tests | **PASS** | 27/27 tests green (`auth`: 7, `chrome`: 10, `catalog`: 5, `releases`: 5). |
| Chrome without Auth | **PASS** | Tested in isolation and after auth mounts; verified clean boot with no auth UI. |
| Type check | **PASS** | `npm run typecheck` clean (0 errors). |
| Zero Casts | **PASS** | Zero `as any`, zero `as never`, zero `as` type casts in `src/auth` and tests. |
| Source repos untouched | **PASS** | `~/code/mesh-auth` is completely clean and unmodified. |
