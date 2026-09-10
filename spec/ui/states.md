# The five states

**Status.** Decided. This is the document that most directly answers "apps look all fucked up",
because most of what looks wrong is a view that only thought about the state where everything works.

Every view answers all five. Not "handles" — **answers**, with something drawn.

| state | when | who decides |
| --- | --- | --- |
| **loading** | the first read has not returned | the collection |
| **empty** | it returned, and there is nothing | the collection |
| **unauthenticated** | there is no session | the kernel |
| **refused** | there is a session, and the gate says no | `_describe` and the session's roles |
| **error** | something broke | the server, or the transport |

## 1. loading

The view's own skeleton — the shape the content will have, in place. Not a spinner over a blank
page, and never a spinner instead of a page.

A screen that shows its shape while loading does not move when the data arrives. A spinner
guarantees it will.

**Do not show loading for a live update.** The first read is loading; a collection event that
changes one row is not. Rule §1 says the list moves on its own — flickering the whole list into a
skeleton because one row changed is the opposite of live.

## 2. empty

Empty is a **destination**, not an absence. It says what is missing and offers the control that
makes one.

> An empty catalog says *nothing is published yet* and offers **import a repository**.
> An empty site list says *no sites yet* and offers **new site**.

An empty view with no control is a dead end, and dead ends are where a person decides the platform
does not work. This is also where missing coverage becomes visible: the site list was empty, offered
nothing, and `site.create` had been exposed for weeks.

**Empty is not an error and is not styled like one.** No red, no warning icon. Nothing has gone
wrong.

## 3. unauthenticated

**A state, not an error** — rules §2, and it is the rule that was broken longest.
`Failed to load catalog parts (unauthorized)` was on screen for a week, describing a page that was
working perfectly.

The sign-in panel renders **inside the view**, where the content would be. Not a toast, not a
redirect, not a modal over a broken page. The person is not lost; they are one step from the thing
they wanted, and the view should look like that.

What was going to be there stays described: *sign in to see the parts in this catalog* is better
than a bare form, because it tells them whether it is worth signing in.

## 4. refused

There is a session. The gate said no. **This is the state everybody skips**, and skipping it takes
one of two forms, both wrong:

- **the control is absent** — the person concludes the feature does not exist, and is wrong
- **the control does nothing** — the person concludes the platform is broken, and is wrong

The control is **visible, disabled, and labelled with what is missing**:

> `Deploy` — *needs operator*
> `Delete release` — *not exposed by this server* → #69

The people app already does this properly and is the model:

```ts
if (a.why === 'needs_operator') return 'Platform operator standing required to grant or revoke operator roles.';
if (a.why === 'needs_session')  return 'Sign in as an operator to manage platform roles.';
if (a.why === 'not_exposed')    return 'identity.grant_role is not exposed on this server.';
```

Three refusals, three different sentences, each naming what would fix it. Copy this shape.

**Refused is knowable before the request** (rules §4). The screen has `_describe` and the session
before anybody presses anything, so it never has to find out by failing.

**`not_exposed` is a refusal, not a bug** — and where an issue exists, it links to it. That is how a
wall becomes a ticket instead of an impression that the product is half-built.

## 5. error

Something actually broke. The server's message, in the view, with a retry — and a notification
(rules §8), because a message written into a panel nobody is looking at has not been delivered.

**Never invent a friendlier message.** The platform's own errors are good:

> `169.197.131.82 does not expose builder.import_repo, and this release calls it. A part must never
> choose its own gate, so add it to the site's mesh list.`

Replacing that with *Something went wrong* destroys the only useful thing in the response.

**Error must not eat a refusal.** A gate refusal arriving as a `catch` is how `api.describe` reported
"no release" for every site on the cluster for an evening — a 403 was swallowed and rendered as
absence. If the response says refused, render §4, not §5.

## Where this lives in code

`EntityListStatus` is:

```ts
type EntityListStatus = 'loading' | 'ready' | 'empty' | 'error';
```

Four values. `refused` and `unauthenticated` are **not list states** — they are answers to *may I*,
which is `Availability`, and a list that cannot be read is a list whose read command is unavailable.
Modelling them as list statuses is what made every app hand-roll them differently. `idle` is gone: it
was `unauthenticated` wearing a costume.

**That covers the refusal you can see coming, and not the one that arrives.** Both rows in the table
above are sourced from something other than the read — the kernel's session, and `_describe` — so a
view that consults them renders §3 or §4 *instead of* asking, and needs no list state to do it. But
`_describe` is what the caller was told **when the page loaded**, and a 403 can still come back from
a read that `_describe` said was permitted: a grant revoked mid-session, a role changed by an
administrator, a ticket that outlived its standing. mesh-serve F30 makes that ordinary rather than
exotic — grants are rows now, and a row can change while somebody is looking at a screen.

When it happens, the only value `EntityListStatus` can carry is `error`, so the view renders §5 —
which is the exact mistake this document forbids eight lines above: *"Error must not eat a refusal …
If the response says refused, render §4, not §5."* The vocabulary cannot currently obey its own rule
in that case.

**Closed.** The `error` prop on `ui.EntityList` and `ui.Table` accepts `string | { refused: string }`. A collection read that fails with a 403 `forbidden` is mapped by the app to `{ refused: reason }` and handed to the view. The view checks for this shape and renders states §4 (a refusal message) rather than states §5 (a generic network error).

## Conformance

An app spec's §6 lists what each of the five looks like in that app, and the spec's conformance test
fails a view that cannot produce all five.
