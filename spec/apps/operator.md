# operator

**Status.** Proposed. This spec is written before the app; it replaces `src/catalog`,
`src/releases`, `src/sites` and `src/fleet`, which are four applications that should always have
been one.

Format: [app specs](./README.md). What an Application is: `mesh-web/spec/application.md`.
UI rules referenced as RULES §n: `mesh-operator/RULES.md`.

## 1. What it is for

Somebody runs a platform. Over a day they publish a part, compose it into a release, put that
release on a site, decide what that site is allowed to call, and — when it is slow — look at which
machines are carrying it. That is one job. It is one person, at one keyboard, following one thread,
and today it is four applications in four windows that each make them sign in and each disagree
about what "loading" looks like.

One app, four views, one selection carried between them.

## 2. Views

| id | title | the question it answers | instances | window |
| --- | --- | --- | --- | --- |
| `parts` | Catalog | what is published, and at what versions | one | tile `main` |
| `releases` | Releases | what has been composed, and what is inside it | one | tile `main` |
| `sites` | Sites | what is deployed where, and what it may call | one | tile `main` |
| `fleet` | Fleet | what is running it, and what each machine carries | one | tile `main` |

Four views, not four windows. Under `src/nav` (narrow) one shows at a time; under `src/chrome`
(wide) they may be arranged. Neither chrome knows this app exists.

**Selection is shared.** Choosing `mesh-web` in `parts` and switching to `releases` shows the
releases containing it. This is the entire argument for the fold — four apps cannot do it.

## 3. Data

| collection | scopedBy | read as |
| --- | --- | --- |
| `part` | global | `cx.models('part')` |
| `partVersion` | global | `cx.models('partVersion')` |
| `release` | `tenantId` | `cx.models('release')` |
| `site` | `tenantId` | `cx.models('site')` |
| `node` | global | `cx.models('node')` |
| `group` | global | `cx.models('group')` |

Every one is a live model. No view calls `find` once and holds the answer — RULES §1, and the
reason `release` is listed as live even though it was read one-shot in `src/releases` today.

Derived reads that are tool calls and not collections: `node.status`, `catalog.resolve`,
`cdn.resolve_site`, `builder.get_artifact`.

## 4. Actions

Exposed surface as of 2026-09-07. Cells name the view and the control.

### Collections

| collection | find/get/count | create | update | delete |
| --- | --- | --- | --- | --- |
| `part` | `parts` › list | `internal` — via `catalog.declare` | `internal` #69 | `internal` #69 |
| `partVersion` | `parts` › version list | `internal` — via `catalog.publish` | `internal` #69 | `internal` #69 |
| `release` | `releases` › list | `internal` — via `cdn.compose` | `n/a` — hash is the identity | `internal` #69 |
| `site` | `sites` › list | **`sites` › new site** | `internal` — via `cdn.site_edit` (by design) | `internal` #69 |
| `node` | `fleet` › node list | `internal` — via `node.provision` | `internal` #69 | `internal` #69 |
| `group` | `fleet` › group list | **`fleet` › new group** | **`fleet` › group editor** | `internal` #69 |
| `artifact` | `internal` #70 | `internal` | `n/a` | `n/a` |
| `build` | `internal` #70 | `internal` — via `builder.build_start` | `n/a` | `n/a` |

The three bold cells are exposed today and have **no UI at all**. `site.create` has been exposed for
weeks; there is still no way to make a site in a browser. That is the failure this spec exists to
stop, and closing those three is not optional in the first pass.

### Tools

| tool | where it lives |
| --- | --- |
| `catalog.declare` | `parts` › add part |
| `catalog.resolve` | `releases` › range preview, live as the range is typed |
| `builder.import_repo` | `parts` › import repository |
| `builder.release_part` | `parts` › release this part |
| `builder.release_repo` | `parts` › release repository |
| `builder.get_artifact` | `parts` › version detail |
| `cdn.compose` | `releases` › compose |
| `cdn.deploy` | `sites` › deploy, with a confirmation (RULES §7) |
| `cdn.site_edit` | `sites` › site form |
| `cdn.resolve_site` | `sites` › what this host serves now |
| `node.assign` | `fleet` › assign services |
| `node.reconcile` | `fleet` › reconcile |
| `node.status` | `fleet` › node detail |
| `node.provision` | `fleet` › provision a node |

Internal and therefore absent: `catalog.publish`, `builder.build_start`, `builder.artifact_blob`,
`node.hello`. The first three are machine paths reached through the tools above; `node.hello` is a
node talking to the genesis node and is not a person's business.

## 5. Not yet exposed

Each of these is a wall a person hits with no way round it in a browser.

- **Nothing can be deleted.** No collection exposes `delete`. A bad release, a decommissioned node,
  a site somebody typo'd the host on — all of them are permanent from the UI. → #69
- **`group.delete` specifically.** `group` exposes `create` and `update` but not `delete`, which
  reads as an oversight rather than a decision. → #69
- **`artifact` and `build` are entirely internal.** There is no builds view and cannot be one, so a
  build that fails is invisible unless somebody reads the server's journal. → #70
- **Organization, membership and role are internal**, so the operator app cannot show who a site
  belongs to or who may touch it. → #65 (in flight)
- **`site.update` is internal by design** and `cdn.site_edit` exists because `defineCrud` cannot
  omit `releaseHash` from a generated update. Not a gap; recorded so nobody "fixes" it.

## 6. States

All four views answer all five. Shared implementation in `src/operator/state.ts` — one tri-state,
not four.

| state | what it looks like |
| --- | --- |
| loading | the view's own skeleton; never a spinner over a blank page |
| empty | what is missing and the control that creates one — an empty catalog offers *import a repository* |
| unauthenticated | the sign-in panel **inside the view**, not an error toast (RULES §2) |
| refused | the action's control stays visible and disabled, labelled with the gate that refused it (RULES §4) |
| error | in the view, with the server's message and a retry; never console-only (RULES §8) |

Refused is the one that is usually skipped, and it is the one that matters here: an operator who
cannot deploy should see *why* — `needs operator`, not a control that silently does nothing or is
silently absent.

## 7. Routes

| address | params | lands on |
| --- | --- | --- |
| `operator/parts` | `{}` | the catalog |
| `operator/parts` | `{ name }` | that part, versions expanded |
| `operator/releases` | `{}` | the release list |
| `operator/releases` | `{ hash }` | that composition |
| `operator/sites` | `{}` | the site list |
| `operator/sites` | `{ host }` | that site's editor |
| `operator/fleet` | `{}` | the node list |
| `operator/fleet` | `{ hostname }` | that node |
| `operator/fleet` | `{ group }` | that group |

Params are `Readonly<Record<string, Json>>` — serialisable by construction, so every row is a URL.
`parseRoute(formatRoute(r))` round-trips, including a param containing `/` (a part name can).

## 8. Conformance

A test in `test/operator.spec.test.ts`, run in CI:

1. Reads the exposure descriptor (`_describe`) for the collections and domains in §3 and §4.
2. Collects every action in the app's `consumes`.
3. **Fails, naming the action, if the descriptor exposes an action this app owns that the app does
   not consume.** When #69 lands and `release.delete` becomes public, this test goes red and the
   message says `release.delete`.
4. Fails if a view lacks any of the five states in §6.
5. Fails if a route in §7 does not round-trip.

Plus the structural limits, because the fold is worthless if it produces one enormous file:
`src/operator/index.ts` under 250 lines and containing only the manifest; every file under
`src/operator/` under 300 lines.

## 9. Later

This app moves to `FLYBYME/mesh-operator` once it is one unit — the move is a directory rename then,
and four intertwined applications now. Not this pass.
