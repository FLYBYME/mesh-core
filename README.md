# mesh-core

The parts the platform is operated with: the shell, and the consoles for the services behind it.

Several parts in one repository — see `mesh-demos` for why that works and what it cost to make it
work. Each entry in `mesh.json` becomes its own catalog row, its own artifact and its own version
line; sharing a git repository ties nothing together at run time.

## What is here

| part | kind | |
| --- | --- | --- |
| `chrome` | extension | the shell: a window list, a mode switch, and the area windows live in |

## What is planned

`auth` moves here from `mesh-auth` — one part in its own repository is the friction this repository
exists to remove. That move is safe as of mesh-serve's `partVersion.repository`: a version records
where it came from, so `auth@0.1.0` and `auth@0.2.0` keep building from `mesh-auth` while new
versions come from here.

Then the consoles, once their contracts are exposed (mesh-serve Track F): `catalog`, `releases`,
`sites`, `identity`.

## The rule

**A part never imports another part's directory.** Two parts here are two artifacts that may be
deployed separately, so a direct import is a dependency the composition cannot see and the release
checker cannot refuse. Shared source goes in `src/shared/` and is copied into each artifact that
uses it. What is shared at run time is the kernel, and only the kernel.
