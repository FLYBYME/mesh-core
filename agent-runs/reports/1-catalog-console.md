# Dispatch 1 Report: Catalog and Releases Consoles

**Date:** 2026-09-06  
**Repository:** `FLYBYME/mesh-core`  
**Applications Implemented:** `src/catalog/index.ts`, `src/releases/index.ts`  
**Contracts Generator:** `@flybyme/mesh-serve` client (`mesh-serve client`)  
**Kernel:** `@flybyme/mesh-web` (`^0.11`)

---

## 1. Executive Summary

In this dispatch, we implemented the two core operational applications for the Antigravity Mesh platform:
1. **Catalog Console (`src/catalog/index.ts`)**: Global catalog browser for all published parts, version histories, artifact provenance, and range resolution workbench (`catalog.resolve`).
2. **Releases & Deploy Console (`src/releases/index.ts`)**: Tenant-scoped release lifecycle manager with dry-run and commit composition (`cdn.compose`), site release pointer deployment (`cdn.deploy`), and zero-overhead rollback.

Both applications have been declared in `mesh.json` as `kind: "application"`, version `0.1.0`, with detailed descriptions, keywords, and explicit `mesh` contract requirements. The client was compiled cleanly via `mesh-serve client` without hand-crafting network endpoints.

All test suites pass (`13/13` green across `chrome`, `catalog`, and `releases`), and `npm run typecheck` succeeds with **zero `as any`, zero `as never`, and zero type casts**.

---

## 2. What the Two Screens Ended Up Being, and What Was Left Out

### Catalog Console (`CatalogApp` in `src/catalog/index.ts`)

- **Architecture & Layout**:
  - Full-height responsive layout with a persistent header showing catalog metadata and live reload actions.
  - **Left Pane (`ScrollView`)**: Lists all globally published parts. Features a live search filter input and instant kind toggles (`All`, `Apps`, `Extensions`).
  - **Right Pane (`ScrollView`)**:
    - **Part Details Card**: Displays the part name, publisher, kind badge, description, keyword tags, and repository link.
    - **Published Versions Table (`Grid`)**: Renders all published versions in a 5-column grid (`Version`, `State`, `Commit`, `Built From`, `Published`).
    - **Provenance Inspection Card**: Shows detailed provenance for the selected version, including entrypoint, git commit SHA, kernel range constraint, changelog, artifact digest, declared capabilities (`needs` and `provides`), and dependencies.
    - **Range Resolution Workbench (`catalog.resolve`)**: An interactive sandbox where operators can enter a kernel range (e.g., `^0.11`) and part version range (e.g., `^0.1.0`), invoke `catalog.resolve`, and view what commits/versions resolve or inspect unsatisfied reasons before composing.
- **What Was Left Out**:
  - Direct part deletion or editing: In the Mesh architecture, the catalog is an immutable, append-only publication ledger. Mutating past releases or parts from the UI is intentionally unsupported.
  - In-browser part bundling/publishing: Part publishing requires local source access and the builder toolchain (`mesh-serve publish`), which belongs to developer CLI workflows rather than runtime web consoles.

### Releases & Deploy Console (`ReleasesApp` in `src/releases/index.ts`)

- **Architecture & Layout**:
  - Two-pane workspace scoped to the caller's tenant.
  - **Left Pane (`ScrollView`)**:
    - **Scoped Sites Section**: Lists all hostnames owned by the tenant, displaying the hostname, application kind, and active `releaseHash` (highlighted in green with badge when running).
    - **Scoped Releases Section**: Lists all releases composed by the tenant, sorted chronologically with kernel version, included part counts, and composition date.
  - **Right Pane (`ScrollView`)**:
    - **Selected Release Details Card**: Renders the human label, release hash, kernel version & digest, composition timestamp, required contracts, and an included parts `Grid` (Part, Version, Artifact Digest).
    - **Deploy / Rollback Action Block**: Reactively compares the selected site's `releaseHash` against the selected release's hash:
      - If they match: displays a green badge indicating the release is already live on that host.
      - If the site is running a different release: renders a warning/info banner and a prominent button ("Deploy to Site" or "↺ Roll Back to this Release").
    - **Release Composer Card (`cdn.compose`)**:
      - Release label input, kernel range input (`^0.11`), and multi-line `TextArea` for part requirements (`id: range`).
      - Two distinct action buttons: **Dry Run Compose** (`dryRun: true`) and **Commit Release** (`dryRun: false`).
      - Detailed results container reporting either the calculated release hash and constituent parts, or highlighting validation `problems` (e.g. incompatible kernel, missing parts).
- **What Was Left Out**:
  - Multi-tenant switcher: The backend enforces tenant scoping automatically based on caller identity (`scopedBy` in `mesh-serve`). Attempting to add tenant filters in the UI would falsely imply the client has cross-tenant visibility.
  - Hostname registration / DNS provisioning: Site provisioning belongs in infrastructure management; the console operates on already-bound sites.

---

## 3. Evaluation of the Exposed Contract Set

### Contracts Used

The following contracts exposed in F2 were declared in `mesh.json` and consumed via the generated client:
- `part.find`, `part.get`, `part.count`
- `partVersion.find`, `partVersion.get`, `partVersion.count`
- `catalog.resolve`
- `release.find`, `release.get`, `release.count`
- `site.find`, `site.get`, `site.count`
- `cdn.compose`
- `cdn.deploy`

### Critical Finding: Code Generator Bug on `*.find_one`

When declaring `part.find_one`, `partVersion.find_one`, `release.find_one`, or `site.find_one` in `mesh.json`, running `npm run generate` (`mesh-serve client`) fails with:
```
UnrepresentableSchema: {"not":{}} has no typescript equivalent
```
**Root Cause Investigation**:
1. `mesh-serve` defines `find_one` routes returning `z.optional(Schema)`.
2. When converted to JSON Schema via `zodToJsonSchema`, an optional root schema is represented as `{"not": {}}` under draft-07.
3. The TypeScript client code generator in `mesh-serve` treats `{"not": {}}` as unrepresentable and aborts.

**Workaround & Production Impact**:
We omitted `*.find_one` contracts from `mesh.json` and instead used `*.find` with query filters or `*.get` by ID. Both consoles work flawlessly with this pattern.

**Recommendation for `@flybyme/mesh-serve`**:
Change `find_one` endpoints to return `z.nullable(Schema)` or `{ item: Schema.nullable() }`. JSON Schema converts nullable types to `type: ["object", "null"]` or `anyOf`, which TypeScript code generators handle cleanly.

### Build Logs and Roadmap F4

As noted in the prompt:
- `build.find` is **not exposed** in the public F2 contract set.
- `PartVersionFindOutputItem` carries `state: 'built' | 'building' | 'failed'`, `artifactDigest`, and `commit`. However, `BuildSchema`'s internal `log` and `error` fields are currently inaccessible over the mesh.
- When a version fails to build during publication, the catalog UI can display `state: 'failed'`, but operators cannot view the compiler or bundler logs directly from the console. Exposing a read-only `build.get` or `partVersion.logs` endpoint under F4 will close this gap.

---

## 4. Evaluation of New Framework Primitives

The `@flybyme/mesh-web` `^0.11` primitives significantly improved UI structure compared to previous workarounds:

| Primitive | Role in Consoles | Verdict |
| :--- | :--- | :--- |
| **`Grid`** | Version table columns in `CatalogApp`; included parts table in `ReleasesApp` | **Excellent**. Replaced brittle manual CSS column styling. Aligning headers and rows with `columns: '110px 90px 140px 1fr 140px'` worked seamlessly. |
| **`ScrollView`** | Part list, site drawer, release drawer, details viewports | **Crucial**. Eliminated previous hacks of nesting raw `overflowY: auto` styles on Stacks. Allowed split panes to scroll independently without affecting the outer chrome. |
| **`Heading({ level })`** | Semantic `h1`, `h2`, `h3` hierarchy across both apps | **Clean & Accessible**. Generates correct DOM tags without losing custom inline styling. |
| **`Divider`** | Section dividers between site and release lists | **Helpful**. Clean separation of visual regions. |
| **`Span`** | Labels, monospace hashes, commit links | **Versatile**. The `bold` and `code` boolean props made detail cards compact and readable. |
| **`TextArea`** | Multi-line part specification in composer | **Essential**. Cleanly supported pasting newline-separated `part: range` specifications. |

### Where Vocabulary Ran Out

- **Select / Dropdown Menus**: There is no declarative `<select>` or `<option>` node in the description vocabulary. For toggles (such as part kind filter or site picker), we used rows of styled `Button` components. A native `Select` primitive would simplify form controls.
- **Preformatted Code Blocks**: While `Span({ code: true })` works well for inline SHAs and digests, multi-line display (such as raw manifests or dependency trees) would benefit from a dedicated `CodeBlock` primitive.

---

## 5. Driving Compose-Then-Deploy: Deliberate Architecture vs. Friction

Driving `cdn.compose` followed by `cdn.deploy` from a UI feels **deeply deliberate and architecturally superior** to a monolithic "deploy" button:

1. **Safety through Dry-Run Verification**:
   - `cdn.compose` with `dryRun: true` allows the operator to test dependency resolution against live published versions without mutating the database or creating orphaned release rows.
   - If a dependency range fails to satisfy (e.g. incompatible kernel requirements), `cdn.compose` returns structured `problems` with clear diagnostic kinds and messages. The UI surfaces these directly to the user before any changes are committed.
2. **Deterministic Immutability**:
   - When committed (`dryRun: false`), the composition produces a content-addressed SHA-256 release hash representing the exact tuple of parts, digests, and kernel version.
   - Deploying (`cdn.deploy`) is reduced to a single atomic pointer swap (`site.releaseHash = hash`).
3. **Rollback is Literally Free**:
   - Because a release is immutable and deployment is simply updating `site.releaseHash`, **rolling back is identical to rolling forward**.
   - The UI inspects the site's current `releaseHash` against the selected release. If the selected release was composed earlier, the button text updates to `↺ Roll Back to this Release`. Clicking it executes the exact same `cdn.deploy` call.
   - Disaster recovery has zero custom code paths, zero backup restoration steps, and executes in milliseconds.

---

## 6. Verification and Test Results

### Test Results

```bash
$ npm test

> @flybyme/mesh-core@0.1.2 test
> npm run typecheck && npm run test:browser

> @flybyme/mesh-core@0.1.2 typecheck
> tsc -p tsconfig.json --noEmit

✓ |browser| test/chrome.browser.test.ts (3)
✓ |browser| test/catalog.browser.test.ts (5)
✓ |browser| test/releases.browser.test.ts (5)

 Test Files  3 passed (3)
      Tests  13 passed (13)
```

### Typecheck & Zero-Cast Verification

```bash
$ npm run typecheck
> tsc -p tsconfig.json --noEmit
# Exit code: 0

$ grep -n " as " src/catalog/index.ts src/releases/index.ts
src/catalog/index.ts:13:    type Node as Described,
src/releases/index.ts:13:    type Node as Described,
```

Zero type casts (`as any`, `as never`, `as unknown`, `as Type`) exist in application code. All API payloads, parameters, signals, and view descriptions are fully and strictly typed.
