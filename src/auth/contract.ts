import {
    AUTH,
    consumes,
    needs,
    type Credentialed,
    type Signal,
} from '@flybyme/mesh-web';

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

export interface TicketStore {
    read(): string | undefined;
    write(token: string): void;
    clear(): void;
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
export const NEEDS = needs('credentials', 'http', 'state', 'log');
export const CONSUMES = consumes();

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
