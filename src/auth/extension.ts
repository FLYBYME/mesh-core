/**
 * The auth Extension — roadmap A6.4, spec/extension.md §7, spec/network.md §4.
 *
 * It holds the session, attaches the ticket, and handles the revocation event. **One per site**,
 * because [the site is the boundary](../../spec/hosting.md): a site is a hostname is an origin, it
 * talks to one mesh-api address, and every Application on that page therefore talks to the same API.
 * One session for that API, provided by one Extension, is not a compromise — it is the right shape.
 *
 * ## Why this ships here but is not built in
 *
 * spec/extension.md §7 lists it under **site-supplied**, not built-in, and that is deliberate: a
 * site decides whether it has accounts at all, and a blog that never signs anyone in should not be
 * carrying a session. So this is a class a site *declares*, exported for the sites that want it, and
 * absent from every page that does not.
 *
 * ## What an Application sees
 *
 * Nothing. An Application declares `needs('mesh')` and calls `cx.mesh.call(...)`, and the ticket is on
 * the request. It cannot read the ticket, cannot attach a different one, and does not know whether
 * there is one — which is the whole of "an Application never handles a credential". The Extension
 * reaches that seam through `needs('credentials')`, which is visible in its manifest, so a site can
 * see exactly which contribution has it.
 */

import {
    AUTH, needs, store,
    type AuthApi, type Context, type Credentialed, type Extension, type Session, type Store,
} from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- what it provides

/**
 * `Session` is the kernel's, and is re-exported rather than redeclared.
 *
 * It moved to `mesh-web/src/contribution/session.ts` when this Extension left the framework: the
 * kernel owns the *shape* of a session because `services.session`, `models` and `credentials` all
 * name it, and this owns the *acquiring* of one. Declaring a second identical interface here would
 * make them structurally compatible and independently editable, which is how two definitions of one
 * thing quietly drift apart.
 */
export type { Session };

/**
 * **`AUTH`, `AuthApi` and `Credentialed` moved to the kernel, and are re-exported here.**
 *
 * They were declared in this file, which put the token for the credential seam inside the part that
 * fills it — one step further out than `Session` had been, and with a louder consequence.
 *
 * The builder marks exactly one specifier external: `@flybyme/mesh-web`. Everything else is bundled
 * from the part's own tree. So a part declaring `consumes(AUTH)` had to import `@flybyme/mesh-core`,
 * and no part can: flowboard did, typechecked against a hand-made symlink, and the builder answered
 * `Could not resolve "@flybyme/mesh-core"` three times while the release was recorded as
 * published-with-no-artifact — surfacing two steps later as a composition error that named neither
 * the import nor the file.
 *
 * The division is the one that was always intended and now actually holds: the kernel owns the
 * *shape* of the hole, this file owns the *filling* of it — signing in, holding the ticket,
 * refreshing it, storing it, handling revocation. That is 250 lines a site chooses to load or not,
 * and it is imported by nobody.
 *
 * The token's id is unchanged (`mesh-web/auth`), because a token's identity is its id string.
 */
export { AUTH };
export type { AuthApi, Credentialed };

// ---------------------------------------------------------------------------- what it needs

/**
 * How the Extension reaches identity.
 *
 * A parameter rather than a generated client, because *which* API a site talks to and what it calls
 * its sign-in route is the site's business — mesh-identity's contracts are the usual answer and not
 * the only possible one. The Extension is given three requests it can make and knows nothing else
 * about the API.
 */
export interface AuthEndpoints {
    /** Exchange credentials for a ticket. Defaults to mesh-identity's REST path. */
    readonly issue?: string;
    /** Who the caller is, called once on boot to restore a session from a held ticket. */
    readonly whoami?: string;
    readonly revoke?: string;
}

export interface AuthOptions {
    readonly endpoints?: AuthEndpoints;
    /**
     * Keep the ticket in the `device` hive — real persistent storage, survives a reload — so a
     * session outlives the page. `false`/absent means it is not kept: a reload signs you out. That
     * is the safe default and a real choice for a console; a site that wants the other behaviour
     * says so, via `PartRef.options` on the site record — never silently, because a framework that
     * persisted a credential by default would be making a security decision on the site's behalf.
     */
    readonly persist?: boolean;
    readonly now?: () => number;
}

/**
 * Where a persisted ticket actually lives, when a site opts in.
 *
 * There used to be a hand-rolled `TicketStore` seam here, and an implementation of it,
 * `sessionTicketStore`, that read `globalThis.sessionStorage` directly. Both deleted 2026-09-10,
 * for two reasons — one of which no longer applies and one of which still fully does:
 *
 * 1. ~~Nothing could ever use it: the kernel constructs a composed part with `new Exported()` and
 *    no arguments, so `AuthOptions` never arrives on a real page.~~ No longer true —
 *    `kernel/start.ts`'s `PartRef.options` ("passed to the constructor, from the site record")
 *    exists precisely for this: "AuthExtension takes endpoints and a ticket store, which are the
 *    site's decisions" is quoted from that file's own doc comment. The gap this comment described
 *    was closed elsewhere in the kernel without this file being updated to use it.
 * 2. **It reached around the kernel for a global**, still the real defect: `storage` is a
 *    first-class capability — scoped to the contributor, bound to a hive (`kernel/broker.ts`,
 *    `needs('storage')`) — and the old code asked for none of it, then took `sessionStorage`
 *    anyway, the only place in any part in any repository that touched a global.
 *
 * So this declares `needs('storage')` and opens a real, schema-validated, hive-bound store instead
 * — `device` (persists across a reload, same-origin only), not a bespoke seam a caller constructs
 * by hand. A test exercises this exactly the way a real site does: a fake `device` hive provider
 * passed to `createServices`/`start`, not a hand-built `TicketStore`.
 *
 * A cookie-based ticket — genuinely invisible to JavaScript, not merely inconvenient to reach —
 * remains the answer for cross-*site* sessions; this only ever addresses one site outliving its own
 * reloads, which is what was actually being asked for here (`spec/network.md §4`'s CSRF reasoning
 * for staying bearer-only, `api.service.ts`'s CORS policy, still fully apply and are unchanged).
 */
const TICKET_STORE: Store<string> = store({
    name: 'ticket',
    hive: 'device',
    schema: (raw: unknown): string => {
        if (typeof raw !== 'string' || raw.length === 0) {
            throw new Error('A stored ticket must be a non-empty string.');
        }
        return raw;
    },
});

/**
 * Deliberately without `mesh`.
 *
 * `mesh` is typed by the API a contribution declares in its manifest, and this Extension is not tied
 * to one generated client — a site may point it at any identity answering the three shapes below.
 * Declaring `needs('mesh')` with no `api` is a manifest mistake the kernel refuses outright, and it
 * would be the wrong tool here anyway: `credentials` already carries the origin.
 */
const NEEDS = needs('credentials', 'state', 'log', 'storage');

const DEFAULTS = {
    issue: '/api/identity/ticket',
    whoami: '/api/identity/whoami',
    /**
     * **`identity.ticket.signOut`, not `identity.ticket.revoke`.**
     *
     * `identity.ticket.revoke` has no `visibility: 'public'` — it is an operator ending *somebody
     * else's* session, and a site that tries to grant it is refused outright: `/_describe` answered
     * 500 with *"marked internal by its own domain and cannot be exposed"*, which takes the whole
     * site down, not just sign-out.
     *
     * `identity.ticket.signOut` is the public one — *"End the calling session"*, `visibility:
     * 'public'`, and its input is `{ token }`, exactly what `signOut` below already sends. It
     * answers `signedOut: true` whether the ticket was live, expired or already revoked, because the
     * difference is information about a credential the caller does not hold.
     */
    revoke: '/api/identity/signOut',
} as const;

/**
 * The Extension.
 *
 * A class, and the host constructs it — spec/extension.md §2. Construction is side-effect free:
 * nothing is fetched, nothing is read from storage and no header is attached until `activate`, which
 * is what lets the kernel construct every Extension, inspect the graph, and only then start
 * activating.
 */
export class AuthExtension implements Extension<typeof NEEDS, readonly [], typeof AUTH> {
    readonly needs = NEEDS;
    readonly provides = AUTH;

    readonly #options: AuthOptions;

    constructor(options: AuthOptions = {}) {
        this.#options = options;
    }

    activate(cx: Context<typeof NEEDS, readonly []>): AuthApi {
        const endpoints = { ...DEFAULTS, ...this.#options.endpoints };
        const now = this.#options.now ?? Date.now;
        const session = cx.state.signal<Session | null>(null);
        // Opened unconditionally (the capability is declared either way; needs() is a static
        // manifest, inspected before activation, and cannot vary per instance) but only ever read
        // from or written to when the site actually opted in.
        const persisted = this.#options.persist === true ? cx.storage.open(TICKET_STORE) : undefined;

        /**
         * The ticket, held here and nowhere a contribution can reach.
         *
         * A closure variable rather than a signal: nothing renders it, and a signal would make it
         * reactive state that something could come to depend on. Starts undefined even when
         * `persisted` is set -- the storage capability resolves asynchronously (`storage/storage.ts`),
         * so a held ticket populates this a tick or more after `activate()` returns, the same
         * "nothing is signed in until the API says so" shape sign-in itself already has.
         */
        let ticket: string | undefined;

        // Attached once, and *before* any request could be made. The lookup runs per request, so a
        // ticket that arrives later is on the next call rather than on the next page load.
        /**
         * **No logging in here.** This closure runs on **every request the page makes** — every
         * collection read, every command, every poll — so a line per call is a log that scrolls its
         * own useful entries off the top, and `A8.17`'s log panel exists to be read.
         *
         * It also had nothing to say: `'Attach'`, with no ticket state, no call, and no outcome. A
         * line that is emitted constantly and distinguishes nothing is worse than silence, because
         * somebody debugging an auth problem now has to filter it out before they can see anything.
         *
         * What is worth knowing about credentials is when the ticket *changes* — signing in, signing
         * out, a revocation landing — and those are logged where they happen, once each.
         */
        cx.credentials.attach(
            (): Readonly<Record<string, string>> =>
                (ticket === undefined ? {} : { authorization: `Bearer ${ticket}` }),
            session,
        );

        /**
         * One request, by path.
         *
         * Not `cx.mesh.call`: `mesh` is typed by the API a contribution declared, and this Extension
         * is deliberately not tied to one generated client — a site may point it at any identity
         * that answers these three shapes. The ticket goes on by hand here because this is the one
         * place that legitimately holds it.
         *
         * `undefined` for a refusal, thrown for anything else. A 401 is an *answer* — the ticket is
         * not good — while a 500 is the API failing and must not be read as "not signed in".
         */
        const request = async <T,>(
            path: string,
            method: 'GET' | 'POST',
            body?: unknown,
        ): Promise<T | undefined> => {
            const response = await fetch(`${cx.credentials.origin}${path}`, {
                method,
                headers: {
                    ...(body === undefined ? {} : { 'content-type': 'application/json' }),
                    ...(ticket === undefined ? {} : { authorization: `Bearer ${ticket}` }),
                },
                ...(body === undefined ? {} : { body: JSON.stringify(body) }),
                credentials: 'omit',
            });
            // Only when it did not work. A line per request is the thing the comment above
            // `attach` forbids, and `${method} ${path}` on a 200 says nothing a caller did not
            // already know. A refusal and a failure are different outcomes, so they read
            // differently: one is an answer, the other is the API breaking.
            if (response.status === 401 || response.status === 403) {
                cx.log.debug(`${method} ${path} refused the ticket`, { status: response.status });
                return undefined;
            }
            if (!response.ok) cx.log.warn(`${method} ${path} failed`, { status: response.status });
            if (!response.ok) throw new Error(`${method} ${path} failed with ${String(response.status)}`);

            return await response.json() as T;
        };

        const clear = (): void => {
            ticket = undefined;
            if (persisted !== undefined) void persisted.remove('token');
            session.set(null);
            // The one place the ticket is dropped, so the one place that can say it happened.
            cx.log.debug('The ticket was dropped and the page is signed out');
        };

        const sessionFrom = (who: WhoamiReply, expiresAt: number): Session => ({
            userId: who.userId,
            displayName: who.displayName,
            roles: who.roles,
            expiresAt,
        });

        /** Ask the API who this ticket belongs to. The API is the only thing that can answer. */
        const restore = async (expiresAt: number): Promise<Session | null> => {
            const reply = await request<WhoamiReply>(endpoints.whoami, 'GET');
            if (reply === undefined) {
                // The ticket is not accepted any more — revoked, expired, or issued by an API this
                // page no longer talks to. Whichever it is, holding it is worse than dropping it.
                // `{ reply }` here was `{ reply: undefined }` — the branch is *defined* by the reply
                // being absent, so logging it says nothing. The status that caused it was already
                // logged by `request`; what this line adds is the consequence.
                cx.log.warn('The stored ticket was not accepted, so the page is signed out');
                clear();
                return null;
            }
            const restored = sessionFrom(reply, expiresAt);
            session.set(restored);
            cx.log.debug('Session restored', { userId: restored.userId, roles: restored.roles });
            return restored;
        };

        if (persisted !== undefined) {
            // Waits for the storage capability's own async resolution (a `device`-hive read), then
            // the same rule as always applies: a held ticket is a claim, never a session — nothing
            // is signed in until the API says so (spec/auth.md §3).
            void persisted.ready('token').then(() => {
                const held = persisted.get('token')();
                if (held === undefined) return undefined;
                ticket = held;
                return restore(now() + UNKNOWN_LIFETIME).then(() => undefined);
            }).catch((error: unknown) => {
                cx.log.warn('could not restore a session from the held ticket', error);
                clear();
            });
        }

        return {
            session,

            async signIn(credentials): Promise<Session> {
                const issued = await request<IssueReply>(endpoints.issue, 'POST', credentials);
                if (issued === undefined) throw new Error('Those credentials are not valid.');
                // `issued.token` is the bearer ticket and never goes in here. The log panel is
                // rendered on the page, so a line that carries the ticket hands a live credential
                // to anyone who can see the screen or read a support paste of it.
                cx.log.debug('Signed in', { userId: issued.userId, expiresAt: issued.expiresAt });

                ticket = issued.token;
                if (persisted !== undefined) void persisted.set('token', issued.token);

                const restored = await restore(issued.expiresAt);
                if (restored === null) {
                    // Issued and then not accepted. Better to fail the sign-in than to leave a page
                    // holding a ticket that works for nothing.
                    throw new Error('Signed in, but the API did not recognise the ticket.');
                }
                return restored;
            },

            async signOut(): Promise<void> {
                const held = ticket;
                // Locally first: a network failure must not leave the page believing it is signed in.
                clear();
                if (held === undefined) return;

                try {
                    await request(endpoints.revoke, 'POST', { token: held });
                    // Held, not logged — `held` *is* the ticket. What is worth knowing is that the
                    // revocation landed, which is the half `clear()` cannot do on its own.
                    cx.log.debug('Signed out, and the ticket was revoked');
                } catch (error) {
                    // The ticket still expires on its own. Telling the user their sign-out failed,
                    // when locally it did not, would be worse than a log line.
                    cx.log.warn('sign-out reached the page but not the API', error);
                }
            },
        };
    }
}

/** A ticket restored from storage carries no expiry, so the API's answer is what dates it. */
const UNKNOWN_LIFETIME = 0;

interface IssueReply { readonly token: string; readonly userId: string; readonly expiresAt: number }
interface WhoamiReply {
    readonly userId: string;
    readonly displayName: string;
    readonly roles: readonly string[];
}

