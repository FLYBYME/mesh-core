/**
 * **The identity app: what it talks to, what it keeps, and what it offers.**
 *
 * The first application written against the rebuilt shapes, and it exists to find out whether they
 * hold. Everything about it is deliberately small: **one view in one window**, because an app is a
 * thing a person opens, not a set of windows they arrange. The four consoles this platform started
 * with opened a window each and a person ended up managing furniture instead of a platform.
 *
 * ## What it can and cannot show
 *
 * `organization`, `membership` and `role` are exposed for reading; `membership` is also the only
 * collection on the whole platform that exposes `delete`, and `organization` and `membership` expose
 * `create`.
 *
 * **`user` is entirely internal**, so an app about identity cannot list people. That is not an
 * oversight to work around — it is FLYBYME/surfdns#71, and this app is the thing that makes it
 * concrete: a screen for organizations and memberships, where the members are ids because the
 * platform will not say who they are.
 */

import {
    call, consumes, defineApi, needs, provider,
    schema, AVAILABLE,
    type Availability, type BoundCommand, type PartApi, type ProviderToken,
    type ReadonlySignal, type Signal,
} from '@flybyme/mesh-web';

import { AUTH } from '../auth/index.js';

// ---------------------------------------------------------------------------- what it talks to

/**
 * Hand-declared rather than generated.
 *
 * `mesh-serve client` generates this from a site's descriptor, and that is how it should arrive once
 * this app is composed into a site. Declaring it by hand here keeps the app buildable before there
 * is a site to generate from — and it is checked the moment there is one, because a generated client
 * carries the exposure hash and refuses to speak to an API serving a different shape.
 *
 * Only what §1 says is public. A call that is not exposed is not written here, because writing it
 * would mean discovering the refusal at run time instead of at compile time.
 */
export const identityApi = defineApi({
    id: 'identity',
    /**
     * **Empty on purpose, and this is what marks the file as a stand-in.**
     *
     * `exposure` and `shapeHash` are computed by `mesh-serve client` over a site's real descriptor;
     * nothing hand-written can know them. `createClient` treats both sides as optional — a client
     * generated before the hash existed carries none — so an empty one is *tolerated* rather than
     * *checked*, which means this file loses the staleness check that makes a generated client
     * trustworthy.
     *
     * The consequence, stated so nobody has to discover it: if the platform changes a path or a
     * schema, this client keeps compiling and starts failing on the wire. Regenerate it the moment
     * this app is composed into a site.
     */
    exposure: '',
    shapeHash: '',
    calls: {
        'organization.find': call<{ query?: Record<string, unknown> }, readonly Organization[]>('GET', '/organizations'),
        'organization.create': call<{ name: string; slug: string; ownerId: string }, Organization>('POST', '/organizations'),
        'membership.find': call<{ query?: Record<string, unknown> }, readonly Membership[]>('GET', '/memberships'),
        'membership.create': call<{ userId: string; organizationId: string; roleKey: string }, Membership>('POST', '/memberships'),
        'membership.delete': call<{ id: string }, { ok: boolean }>('DELETE', '/memberships/:id'),
        'role.find': call<{ query?: Record<string, unknown> }, readonly Role[]>('GET', '/roles'),
        'identity.whoami': call<Record<string, never>, Whoami>('GET', '/identity/whoami'),
    },
});

export interface Organization {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly ownerId: string;
}

export interface Membership {
    readonly id: string;
    readonly userId: string;
    readonly organizationId: string;
    readonly roleKey: string;
}

export interface Role {
    readonly id: string;
    readonly key: string;
    readonly scope: 'cluster' | 'organization';
    readonly builtin: boolean;
}

export interface Whoami {
    readonly userId: string;
    readonly memberships: readonly Membership[];
}

// ---------------------------------------------------------------------------- what it keeps

/**
 * **Internal: everything a view needs and nobody else may touch.**
 *
 * `internal` is required now, and this is why. Every one of these was, in the app this replaces, a
 * member of the *published* API — because `render` used to receive the public API, so anything a
 * view read had to be public. `PeopleApi` ended with 33 members of which eight were genuinely
 * public, including a password buffer that any part on the page could read *and write*.
 *
 * The rule that follows: a form buffer is never published. It is not a fact about identity, it is a
 * fact about a half-finished interaction, and no other part has any business in it.
 */
export interface IdentityInternal {
    readonly organizations: ReadonlySignal<readonly Organization[]>;
    readonly memberships: ReadonlySignal<readonly Membership[]>;
    readonly roles: ReadonlySignal<readonly Role[]>;
    readonly status: ReadonlySignal<'loading' | 'ready' | 'empty' | 'error'>;
    readonly error: ReadonlySignal<string | null>;

    /** Which organization the DETAIL region is showing. Internal: selection is this app's business. */
    readonly selected: Signal<string | null>;
    readonly select: (id: string | null) => void;

    /** The members of the selected organization, derived rather than stored. */
    readonly members: () => readonly Membership[];
    readonly selectedOrganization: () => Organization | null;

    readonly commands: IdentityCommands;
}

export interface IdentityCommands {
    readonly createOrganization: BoundCommand<{ name: string; slug: string }, Organization>;
    readonly addMember: BoundCommand<{ userId: string; roleKey: string }, Membership>;
    readonly removeMember: BoundCommand<{ id: string }, { ok: boolean }>;
}

// ---------------------------------------------------------------------------- what it offers

/**
 * **Published: three slots, and nothing else.**
 *
 * `commands`, `components` and `state` — the same three every part publishes, so a consumer knows
 * where to look without knowing which part it is holding.
 *
 * `state` is `ReadonlySignal`, never `Signal`: read is an observable value, write is a command.
 * Anything published is reachable by a tool caller, so a writable signal here would be a hole, not
 * an ergonomic.
 *
 * What is deliberately absent: the selection, the form buffers, the status. Another part has no use
 * for which row this app has highlighted.
 */
export const IDENTITY: ProviderToken<PartApi> = provider<PartApi>('mesh-core/identity');

export const NEEDS = needs('models', 'mesh', 'state', 'log', 'confirmation', 'windows');
export const CONSUMES = consumes(AUTH);

/**
 * The static half, readable before the app runs.
 *
 * The kernel checks it against what `start()` binds and refuses a mismatch in either direction — a
 * declared command with no implementation is an advertisement for something that is not there; a
 * bound one nobody declared is a surface nobody can review.
 */
export const PUBLISHES = {
    commands: [
        {
            action: 'createOrganization',
            description: 'Creates an organization, owned by the caller.',
            input: schema<{ name: string; slug: string }>({
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'What people call it.' },
                    slug: { type: 'string', description: 'URL-safe, unique across the platform.' },
                },
                required: ['name', 'slug'],
            }),
            output: schema<Organization>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'addMember',
            description: 'Adds a person to the selected organization with a role.',
            input: schema<{ userId: string; roleKey: string }>({
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'The account to add. An id: the platform will not resolve names (surfdns#71).' },
                    roleKey: { type: 'string', description: 'Which role they hold in this organization.' },
                },
                required: ['userId', 'roleKey'],
            }),
            output: schema<Membership>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'removeMember',
            description: 'Removes a person from an organization. They lose access immediately.',
            input: schema<{ id: string }>({
                type: 'object',
                properties: { id: { type: 'string' } },
                required: ['id'],
            }),
            output: schema<{ ok: boolean }>(),
            available: (): Availability => AVAILABLE,
            /**
             * The only destructive control in this app, and the only one on the platform that can be
             * exercised at all — `membership.delete` is the sole public `delete` anywhere
             * (surfdns#69).
             *
             * `requiresUser` because an agent must not be able to answer it. A confirmation is a
             * control that answers an intent, so whatever can raise `commit` can answer one; without
             * this, the mechanism that automates the UI is the mechanism that defeats the check.
             */
            confirm: {
                message: 'Remove this person from the organization? They lose access immediately.',
                requiresUser: true,
            },
        },
    ],
    state: [
        {
            name: 'organizations',
            description: 'Every organization the caller belongs to.',
            schema: schema<readonly Organization[]>(),
        },
        {
            name: 'roles',
            description: 'The roles this platform defines.',
            schema: schema<readonly Role[]>(),
        },
    ],
} as const;
