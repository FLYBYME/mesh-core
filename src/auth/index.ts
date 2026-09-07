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
    type Context,
    type Extension,
} from '@flybyme/mesh-web';

import {
    AUTH,
    NEEDS,
    SCOPE_HEADER,
    type AuthApi,
    type AuthOptions,
    type Session,
} from './contract.js';

import type {
    IdentityTicketIssueOutput,
    IdentityWhoamiOutput,
} from '../generated/api.js';

export * from './contract.js';
export { sessionTicketStore } from './store.js';

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

export default AuthExtension;

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
