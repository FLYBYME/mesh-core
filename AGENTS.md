# mesh-core, for someone arriving cold

**The parts the platform is operated with**: the shell, the consoles, and the credential seam. Four
parts, ~4,000 lines, and **every one of them is live on real sites right now.**

This file exists because every dispatch was re-deriving the same facts — measured across the
transcripts, `src/catalog/index.ts` was opened 19 times, `src/releases/index.ts` 16, `mesh.json` 12.
**Read this first; it is the index, not the documentation.**

## The four parts

| | kind | what it is | live on |
| --- | --- | --- | --- |
| `chrome` | extension | the shell: window list, mode switch, page-level sign-in | **all six sites** |
| `auth` | extension | the credential seam. Provides `AUTH`; holds tickets | four sites |
| `catalog` | application | browse parts, versions, provenance | `console.localhost` |
| `releases` | application | compose releases, deploy, roll back | `console.localhost` |

**Nothing here is a demo.** A behaviour change ships to production on the next recompose, so a diff
that mixes a refactor with a fix cannot be reviewed. Find a bug, report it, leave it.

## The file shape, and the rule behind it

```
src/<part>/
    contract.ts       the token, the API interface, NEEDS, CONSUMES — imports no sibling
    <pure>.ts         logic with no kernel import (auth/store.ts, releases/parse.ts)
    views/<view>.ts   one view per file; a section inside a view is a function
    index.ts          the class and the default export — no other part may import this
```

Reasoning in `~/code/surfdns/architecture/boundaries.md`. The short version: **`contract.ts` is a
leaf of the module graph, and being a leaf is what makes it safe for another part to import.** A part
is an artifact, so importing a token from a provider's `index.ts` drags that provider's whole
implementation into the consumer's artifact.

Rule 5 was added after the first split did not go far enough: **a section is a function.** A view
alone in a file is easier to find and exactly as hard to read.

## Four things that cost an hour to rediscover

**`AUTH` and `AuthApi` are declared in `@flybyme/mesh-web`, not here.** `auth` *provides* the token;
`chrome` and `whoami` consume it. Do not move it, do not re-declare it, do not make a local copy —
tokens resolve by **id string**, so two bundled copies of `provider<AuthApi>('auth')` are two objects
with one id and they resolve to one provider.

**`chrome` guards on a module-level `authProvided` flag** and falls back to `EMPTY_CONSUMES` when
auth is absent, because **most sites will not compose auth**. There is a test named *"a page with
chrome and no auth still works after a page with auth ran"* — it exists because that flag is
module-level state and ordering matters.

**Both consoles run on the `models` capability**, adopted 2026-09-06. Its known gap: **`models` does
not re-fetch after a mutation made through an explicit contract** — `releases` calls `cdn.compose`
and `cdn.deploy`, not `release.create`, so it keeps a manual `refetch()`. That is correct, not a
leftover.

**Check the installed kernel before you trust a green test run:**

```bash
node -e "console.log(require('./node_modules/@flybyme/mesh-web/package.json').version)"
```

npm reuses a cached git dependency when the lockfile still resolves to an older commit. A dispatch's
tests once passed against **0.11.1** while `package.json` said 0.13.0 — a kernel predating the
capability that dispatch had just adopted. If it disagrees:
`rm -rf node_modules/@flybyme/mesh-web && npm install`.

## Conventions

Zero `as any`, zero `as never`, **zero casts**.

**No inline styling is being added** while the `ui.*` design system is being built
(`mesh-web/spec/components.md`). Do not extract shared style constants and do not invent a local
component layer — a helper shared between two parts couples two independently versioned artifacts
with nothing to say so. Leave the styling where it is and let it move once.

**A version is immutable and bound to a commit**, so any change means a bump in `mesh.json`. Patch
for a refactor, minor for a changed interface, and a shrinking public interface is a *minor* because
it breaks consumers.

## Running it

```bash
npm run generate     # mesh-serve client — regenerates src/generated/api.ts from mesh.json
npm run typecheck
npm test             # browser tests via playwright
```
