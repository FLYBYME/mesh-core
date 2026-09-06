/**
 * The auth Extension.
 *
 * It holds the session and attaches the ticket. **One per site**, because the site is the boundary:
 * a site is a hostname is an origin, it talks to one API address, and every Application on that page
 * therefore talks to the same API. One session for that API, provided by one Extension, is not a
 * compromise — it is the right shape.
 *
 * ## Why this is a part and no longer ships in the kernel
 *
 * It used to be exported from `@flybyme/mesh-web` — 293 lines inside the framework — while its own
 * documentation said it was *site-supplied* rather than built in. Both cannot be true. A site decides
 * whether it has accounts at all, and a blog that never signs anyone in was carrying a session
 * implementation regardless.
 *
 * So it is an Extension like any other: built separately, versioned separately, published to the
 * catalog, and installed by the sites that want it. It is also the first part extracted, which makes
 * it the thing that proves the pipeline — if an Extension cannot be built, published, resolved and
 * loaded, the one almost every site needs is where that shows up.
 *
 * ## What an Application sees
 *
 * Nothing. An Application declares `needs('mesh')` and calls `cx.mesh.call(...)`, and the ticket is on
 * the request. It cannot read the ticket, cannot attach a different one, and does not know whether
 * there is one — which is the whole of "an Application never handles a credential". This Extension
 * reaches that seam through `needs('credentials')`, which is visible in its manifest, so a site can
 * see exactly which contribution has it.
 */

import {
    AUTH,
    needs,
    type Context,
    type Credentialed,
    type Extension,
    type Signal,
} from '@flybyme/mesh-web';

import type {
    IdentityTicketIssueOutput,
    IdentityWhoamiOutput,
} from '../generated/api.js';

// ---------------------------------------------------------------------------- what it provides

/** One organization the signed-in person belongs to, and what they are in it. */
export interface Membership {
    readonly organizationId: string;
    readonly name: string;
    readonly roleKey: string;
}

export interface Session {
    readonly userId: string;
    readonly email: string;
    readonly displayName: string;
    /**
     * **Cluster-scoped** roles, held everywhere in this deployment.
     *
     * Not the same thing as `membership.roleKey`, which is organization-scoped. Merging them is how
     * `roleSatisfies('admin')` and `auth: 'admin'` came to mean different things while looking
     * identical, and it is why they are separate fields here rather than one array.
     */
    readonly roles: readonly string[];
    readonly memberships: readonly Membership[];
    /**
     * Which organization this page is acting in, or `null` when nothing has been chosen.
     *
     * **`null` with memberships present is a real state, not an error** — it is a person who belongs
     * to several organizations and has not said which. The API refuses that with `SCOPE_REQUIRED`
     * rather than guessing, because guessing is how a request reads the wrong organization's data and
     * the failure is silent: the wrong answer is a perfectly valid one.
     *
     * A single membership resolves on its own, because there is nothing to disambiguate.
     */
    readonly organizationId: string | null;
    /** When the ticket stops being accepted. The Extension signs out on its own at that point. */
    readonly expiresAt: number;
}

export type { Credentialed };

/**
 * What other contributions may do with the session.
 *
 * Note what is **not** here: the ticket. A consumer can ask who is signed in and can ask to sign
 * out; it cannot obtain the credential, because the moment it can, "the auth Extension attaches the
 * ticket" becomes advice rather than a property.
 */
export interface AuthApi {
    readonly session: Signal<Session | null>;
    signIn(credentials: Credentialed): Promise<Session>;
    signOut(): Promise<void>;
    /**
     * Act in this organization from now on.
     *
     * A client-side choice, not a new credential: the ticket is unchanged and the scope rides on
     * every request as a header. So switching organization is a state change and a re-render, never
     * a round trip to be re-issued something.
     *
     * The API still checks membership on every call — a caller naming an organization they do not
     * belong to is answered **not found**, because *"it exists, but not for you"* is itself a
     * disclosure. This is a convenience for the page, never a grant.
     */
    selectOrganization(organizationId: string | null): void;
}

export { AUTH };

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
    /** End the calling session. Ends this ticket and no other. */
    readonly signOut?: string;
}

export interface AuthOptions {
    readonly endpoints?: AuthEndpoints;
    /**
     * Where the ticket is kept between page loads.
     *
     * `undefined` means it is not kept: a reload signs you out. That is the safe default and a real
     * choice for a console, and a site that wants the other behaviour says so — a framework that
     * silently persisted a credential would be making a security decision on the site's behalf.
     */
    readonly store?: TicketStore;
    readonly now?: () => number;
}

export interface TicketStore {
    read(): string | undefined;
    write(token: string): void;
    clear(): void;
}

/**
 * `sessionStorage`, scoped to the tab.
 *
 * Offered rather than assumed. `localStorage` is deliberately not the default: it outlives the tab
 * and is readable by every script on the origin, which is a longer life than a ticket wants.
 */
export function sessionTicketStore(key = 'mesh-web/ticket'): TicketStore {
    return {
        read: () => {
            try { return globalThis.sessionStorage?.getItem(key) ?? undefined; } catch { return undefined; }
        },
        write: (token) => {
            try { globalThis.sessionStorage?.setItem(key, token); } catch { /* a private window; not fatal */ }
        },
        clear: () => {
            try { globalThis.sessionStorage?.removeItem(key); } catch { /* as above */ }
        },
    };
}

/**
 * `http`, and deliberately not `mesh`.
 *
 * `mesh` is typed by the API a contribution declares in its manifest, and this Extension is not tied
 * to one generated client — a site may point it at any identity answering the three shapes below.
 * `mesh` also routes through the credential seam, which this Extension *provides*, and sending the
 * attached ticket during sign-in — when there is not one yet — would be a circle with no useful end.
 *
 * `http` is therefore the right tool and it had to be added to get it. **This file called global
 * `fetch` until 2026-09-06**, which is network access nobody granted and nobody could see in a
 * manifest: exactly the failure the capability model exists to prevent, committed by the part best
 * placed to know better. `needs('http')` is now visible to anyone composing a site with this in it.
 */
const NEEDS = needs('credentials', 'http', 'state', 'log');

const DEFAULTS = {
    issue: '/api/identity/ticket',
    whoami: '/api/identity/whoami',
    // `sign_out`, not `ticket/revoke`. The latter is internal by its own domain and always was —
    // it takes a `userId`, so it ends every ticket a named person holds, which is an operator
    // suspending an account rather than a page signing out. This file posted to it anyway until the
    // client generator refused the contract and said so.
    signOut: '/api/identity/sign_out',
} as const;

/**
 * Where a requested scope goes — one header, and nothing else.
 *
 * The generation before this searched path params, query params and the body for any of `orgId`,
 * `tenantId`, `scope` or `organizationId`: four caller-controlled names across three locations, with
 * precedence decided by object spread order. Guessing which key meant scope is how a request ends up
 * reading the wrong organization's data, and the failure is silent because the wrong answer is a
 * perfectly valid one.
 *
 * The API reads this and nothing else. Absent means *not stated*, which for a caller in exactly one
 * organization is unambiguous and for a caller in several is an error the API explains.
 */
export const SCOPE_HEADER = 'x-organization';

/**
 * The Extension.
 *
 * A class, and the host constructs it. Construction is side-effect free:
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
        const store = this.#options.store;
        const now = this.#options.now ?? Date.now;
        const session = cx.state.signal<Session | null>(null);

        /**
         * The ticket, held here and nowhere a contribution can reach.
         *
         * A closure variable rather than a signal: nothing renders it, and a signal would make it
         * reactive state that something could come to depend on.
         */
        let ticket = store?.read();

        /**
         * Which organization the page is acting in.
         *
         * Beside the ticket rather than inside it, and deliberately: an org-scoped ticket would make
         * switching organization a re-issue, and a page that holds several tickets is a page with
         * several ways to be signed in.
         */
        let scope: string | null = null;

        // Attached once, and *before* any request could be made. The lookup runs per request, so a
        // ticket — or a scope — that arrives later is on the next call rather than on the next page
        // load.
        cx.credentials.attach((): Readonly<Record<string, string>> => ({
            ...(ticket === undefined ? {} : { authorization: `Bearer ${ticket}` }),
            ...(scope === null ? {} : { [SCOPE_HEADER]: scope }),
        }));

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
            const response = await cx.http.request<T>(`${cx.credentials.origin}${path}`, {
                method,
                ...(body === undefined ? {} : { body }),
                // **The ticket is attached here, by hand, and that is the point.** `http` never
                // attaches the page's credentials — it goes wherever it is told, so doing so would
                // let any part holding `needs('http')` post the session to an origin of its
                // choosing. This Extension holds the ticket and names the endpoint, so it is the one
                // caller entitled to send it.
                ...(ticket === undefined ? {} : { headers: { authorization: `Bearer ${ticket}` } }),
            });

            // A refusal is an answer: the ticket is not good. Anything else that is not ok is the
            // API failing, and must not be read as "not signed in" — otherwise a brief outage signs
            // everybody out and throws away tickets that were perfectly valid.
            if (response.status === 401 || response.status === 403) return undefined;
            if (!response.ok) throw new Error(`${method} ${path} failed with ${String(response.status)}`);

            return response.body;
        };

        const clear = (): void => {
            ticket = undefined;
            scope = null;
            store?.clear();
            session.set(null);
        };

        /**
         * One membership resolves itself; several do not.
         *
         * Choosing on someone's behalf when they belong to two organizations is exactly the mistake
         * the API refuses to make, and making it here instead would be worse — the page would look
         * confidently wrong rather than asking.
         */
        const sessionFrom = (who: WhoamiReply, expiresAt: number): Session => {
            const memberships = who.organizations;
            const only = memberships.length === 1 ? memberships[0]!.organizationId : null;
            scope = scope ?? only;

            return {
                userId: who.userId,
                email: who.email,
                displayName: who.displayName,
                roles: who.roles,
                memberships,
                organizationId: scope,
                expiresAt,
            };
        };

        /** Ask the API who this ticket belongs to. The API is the only thing that can answer. */
        const restore = async (expiresAt: number): Promise<Session | null> => {
            const reply = await request<WhoamiReply>(endpoints.whoami, 'GET');
            if (reply === undefined) {
                // The ticket is not accepted any more — revoked, expired, or issued by an API this
                // page no longer talks to. Whichever it is, holding it is worse than dropping it.
                clear();
                return null;
            }
            const restored = sessionFrom(reply, expiresAt);
            session.set(restored);
            return restored;
        };

        if (ticket !== undefined) {
            // A held ticket is a claim, never a session. Nothing is signed in until the API says so,
            // which is the same rule the API applies to itself.
            void restore(now() + UNKNOWN_LIFETIME).catch((error: unknown) => {
                cx.log.warn('could not restore a session from the held ticket', error);
                clear();
            });
        }

        return {
            session,

            selectOrganization(organizationId): void {
                scope = organizationId;

                // The session carries the choice, so anything rendering it re-renders. The header
                // picks it up on the next request without anything being re-issued.
                const current = session.peek();
                if (current !== null) session.set({ ...current, organizationId });
            },

            async signIn(credentials): Promise<Session> {
                const issued = await request<IssueReply>(endpoints.issue, 'POST', credentials);
                if (issued === undefined) throw new Error('Those credentials are not valid.');

                ticket = issued.token;
                store?.write(issued.token);

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
                    await request(endpoints.signOut, 'POST', { token: held });
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

/**
 * The two replies this reads — **generated, not written.**
 *
 * They used to be hand-written here: a second copy of mesh-serve's identity output schemas, in a
 * different repository, with nothing checking they still agreed. `npm run generate` reads the
 * contracts `mesh.json` declares and emits them, so adding a field to `identity.whoami` now shows up
 * as a diff rather than as a shape this file quietly disagrees with.
 *
 * The generated file states its shapes structurally and imports nothing but `@flybyme/mesh-web` — no
 * zod, no reference into the repository the contracts live in — so it cannot break because a
 * dependency changed how it infers types.
 */
type IssueReply = IdentityTicketIssueOutput;
type WhoamiReply = IdentityWhoamiOutput;
