# The UI rules

Nine rules. If a screen breaks one, the screen is wrong.

They exist because every one of them was learned the hard way, and the reason is
written next to each — a rule with no reason gets argued with, and a rule with a
reason gets followed.

Part of [the UI design](./README.md). These constrain every app in every
repository, not only the operator consoles they were first written for.

---

## 1. Every list is live, or it says it is not

No refresh buttons. Ever.

Collections stream their own `created` / `updated` / `deleted`, and
`CollectionQuery.live` says whether this one is following. If it is, the list
moves on its own. If it is not, the screen says so quietly — it does not offer a
button and pretend that is the same thing.

> A refresh button is an admission that the screen does not know what is true.
> There were four of them and every one hid a collection that could have been
> live.

## 2. Not signed in is a state, not an error

A gated collection with no session has not failed. It is waiting.

Render that as waiting. `Failed to load catalog parts (unauthorized)` is a lie
about a page that is working correctly, and it was on screen for a week.

## 3. Anything slow says it is working, on the control that started it

`builder.release_repo` takes forty seconds. `node.assign` starts services on
another machine. From a screen, both look exactly like a button that did nothing.

The control that started the work shows the work, and cannot be fired again
while it runs. Not a spinner somewhere else on the page.

## 4. Show the refusal before the request

The platform refuses things for good reasons, and it explains them well:

> `169.197.131.82 does not expose builder.import_repo, and this release calls it.
> A part must never choose its own gate, so add it to the site's mesh list.`

That is a good message arriving too late. The screen had both lists before the
button was pressed. **If the UI can know it will be refused, it says so first**,
and the server's refusal becomes the backstop it should be.

## 5. Derive from the API, never restate it

`GET /api/_describe` is what the server actually honours: every exposed
contract, its shape, its gate. It is the same descriptor the client is generated
from.

A screen that lists contracts reads that. A screen that hand-writes the list is
a second copy of the truth, and the second copy is the one that goes stale — the
site editor was a JSON textarea for exactly this reason.

## 6. Never make a person write JSON

If it has a schema, it gets fields. The platform's own data is the last thing
anybody should be composing in a `<textarea>`.

## 7. Destructive things ask first

`cx.confirm` before anything that publishes, deploys, or removes. The kernel has
it. Use it.

A confirm on a read is noise; a missing confirm on a deploy is an incident.

## 8. Failure is visible without the console open

`cx.notifications` for anything a person needs to know about. A message written
into a panel nobody is looking at has not been delivered.

## 9. Nothing blocks boot

A part that is slow, broken, or unreachable must not stop the page. Boot shows
its stages; a part that fails to mount is reported and the rest of the page
works.

> A telemetry extension that throws while starting is worse than no telemetry.
> The same is true of every part.

---

## Where a screen comes from

Read in this order and stop at the first that answers:

1. **`_describe`** — what is exposed, at what gate, with what shape
2. **the collection** — what exists, live
3. **the contract's own error** — what the platform will refuse and why

If none of them answers, the screen wants something the platform does not model
yet. That is a contract to add, not a constant to hard-code.
