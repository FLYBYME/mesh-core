# Words

**Status.** Decided.

Most of a console is prose. A screen following every other rule here still fails if it says
*Something went wrong* to somebody who needed to know which gate refused them.

## Say what happened, then what would fix it

The platform's own errors are the model, and they are good:

> `169.197.131.82 does not expose builder.import_repo, and this release calls it. A part must never
> choose its own gate, so add it to the site's mesh list.`

Three things: what was refused, why, and the action that resolves it. **Never replace a message like
that with a friendlier one.** A generic message destroys the only useful content in the response,
and there is no way to get it back.

Where the platform's message is bad, the fix is in the contract, not a translation table in the UI.

## Name the thing that is missing

A refusal names the standing, not the outcome (states §4):

| bad | good |
| --- | --- |
| Not allowed | Needs platform operator |
| Access denied | Sign in to manage roles |
| Unavailable | `identity.grant_role` is not exposed on this server |
| Failed to load parts (unauthorized) | Sign in to see this catalog |

The last row is the one that was live for a week, and it was a lie about a page that was working.

## Use the platform's nouns

A person operating this platform learns its vocabulary — part, version, release, site, node, group,
artifact, digest, gate. Use those words. Do not soften *release* into *deployment* in one screen and
leave it *release* in another; the same thing under two names is two things to somebody learning.

Where a word is genuinely obscure, explain it once in place, and keep the word.

## Confirmations say what will happen

Rule §7: confirm anything that publishes, deploys or removes. The confirmation names the specific
thing and the specific consequence.

> **Deploy `sha256:37c2231…` to `console.surfdns.net`?**
> Live traffic switches immediately. The current release stays available to roll back to.

Not *Are you sure?* — which asks a person to confirm their memory of what they clicked rather than
the thing itself.

A confirmation on a read is noise. A missing one on a deploy is an incident.

## Progress says what is happening

Rule §3, on the control itself:

| bad | good |
| --- | --- |
| Loading… | Building `mesh-web` — about 40s |
| Please wait | Assigning catalog, builder to `surf` |

If the duration is known, say it. If it is not, say what is running. A spinner with no words is a
screen that has stopped talking.

## Empty states are an invitation

> Nothing is published yet. **Import a repository** to add the first part.

Not *No results*. Empty is a destination with a next step (states §2).

## Register

Sentence case for everything — labels, buttons, headings. Not Title Case, not ALL CAPS.

Second person for what the person does (*sign in to manage roles*). Third person for what the system
did (*the server refused this call*). Never first person: the console is not a character, and *I
couldn't find that site* is worse than *no site with that host*.

No exclamation marks. No apologies — *sorry* does not fix anything and adds a word between the
person and the fact. State it and move on.

## Numbers and time

Absolute timestamps for anything a person might correlate with a log or an incident, relative for
anything they are watching happen. Both where it matters: `2m ago (22:14:03)`.

Never a bare relative time on a record that will be read later. "3 hours ago" in a screenshot is
useless.

Truncate a digest in the middle, never at the end — `sha256:37c2231…9f4b` — because the tail is what
distinguishes two similar ones, and the full value is available on hover and on copy.
