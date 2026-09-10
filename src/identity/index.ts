/**
 * **The identity app. One view, one window.**
 *
 * Manifest only: state and commands are built in `start`, the screen is `view.ts`.
 *
 * ## One window, and why that is a rule rather than a preference
 *
 * The four consoles this platform started with opened a window each — catalog, releases, sites,
 * fleet — and a person operating it spent their time arranging furniture. Folding them into one app
 * with four views was better and still wrong: four views is four things to place.
 *
 * **An app is a thing a person opens.** It gets one window, and inside it the regions of
 * `spec/ui/anatomy.md` — a HEADER, an INDEX you pick from, a DETAIL that shows what you picked.
 * Wanting a second window is almost always wanting a second *region*, and a chrome that can tile is
 * not a reason to hand it ten things to tile.
 *
 * ## What this app is for
 *
 * It is the first application written against the rebuilt shapes, and it exists to find out whether
 * they hold — `internal` being mandatory, `vx.internal` versus `vx.app`, `checkBindings` refusing a
 * mismatch, a composite mounting, a command carrying its own refusal and its own confirmation.
 *
 * Those were all changed today and every one of them is covered by tests that call a piece
 * directly. **Nothing had mounted one.** `mesh-demos` was the proving ground and it was deleted this
 * morning, so this app is what replaces it — the first outside user of the framework since.
 */

import {
    AVAILABLE, describe,
    type Application, type Availability, type BoundCommand, type Context,
    type PartApi, type ViewDecl,
} from '@flybyme/mesh-web';

import { AUTH } from '../auth/index.js';
import {
    CONSUMES, IDENTITY, NEEDS, PUBLISHES, identityApi,
    type IdentityCommands, type IdentityInternal, type Membership, type Organization, type Role,
} from './contract.js';
import { renderIdentity } from './view.js';

export default class IdentityApp implements Application<
    typeof NEEDS,
    typeof CONSUMES,
    typeof IDENTITY,
    typeof identityApi,
    IdentityInternal
> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = IDENTITY;
    readonly api = identityApi;
    readonly publishes = PUBLISHES;
    readonly session = 'optional' as const;

    /**
     * One view. Not one *per collection* — organizations, memberships and roles are three
     * collections and one screen, because a person managing access is doing one job.
     */
    readonly views: readonly ViewDecl<Record<string, never>, IdentityInternal, PartApi>[] = [
        {
            id: 'main',
            title: 'Identity',
            instances: 'one',
            window: { defaultSize: { width: 940, height: 620 }, minSize: { width: 520, height: 360 } },
            render: renderIdentity,
        },
    ];

    async start(
        cx: Context<typeof NEEDS, typeof CONSUMES, typeof identityApi>,
    ): Promise<{ api: PartApi; internal: IdentityInternal }> {
        /**
         * Live, not fetched once. `spec/ui/rules.md` §1: a collection streams its own changes, so a
         * membership removed in another tab leaves this screen without anybody pressing anything.
         */
        const organizations = cx.models('organization');
        const memberships = cx.models('membership');
        const roles = cx.models('role');

        const selected = cx.state.signal<string | null>(null);
        /** Whether the new-organization form is showing. See `IdentityInternal.creating`. */
        const creating = cx.state.signal(false);

        const selectedOrganization = (): Organization | null =>
            organizations.rows().find((o) => o.id === selected()) ?? null;

        /**
         * Derived, never stored. A second signal holding "the members of the selected org" would be
         * a thing to keep in step with two others, and the bug it produces is a list that is right
         * until something changes.
         */
        const members = (): readonly Membership[] => {
            const id = selected();
            return id === null ? [] : memberships.rows().filter((m) => m.organizationId === id);
        };

        /**
         * **The collection already knows which of the four states it is in.**
         *
         * This was derived here instead, and it was wrong in the way that is hardest to see:
         *
         * ```ts
         * if (organizations.error() !== undefined) return 'error';
         * ```
         *
         * `error()` answers **`null`** when there is nothing wrong, and `null !== undefined` is
         * `true` — so this app was in `error` on every render it ever did, including the ones where
         * the server had just answered with a list. The screen said *Failed to load* over a
         * successful response, with no message under it, because the `error` computed below got the
         * sentinel right and correctly reported that there was no error to describe.
         *
         * The comment explaining the sentinel was three lines below the line that got it wrong,
         * written by whoever learned it while writing the second computed and did not look up.
         *
         * So neither is derived now. `models` publishes `status` — the same four states this screen
         * needs plus `idle`, which means *nothing has asked yet* and is a fact about the collection
         * rather than about the screen. To a person waiting, a fetch that has not started and one in
         * flight are the same thing, so it folds into `loading` here.
         */
        const status = cx.state.computed<'loading' | 'ready' | 'empty' | 'error'>(() => {
            const state = organizations.status();
            return state === 'idle' ? 'loading' : state;
        });

        const error = cx.state.computed<string | null>(() => {
            const failure = organizations.error();
            return failure === null ? null : describe(failure);
        });

        /**
         * **`available()` reads the session, so a refusal is rendered rather than discovered.**
         *
         * `spec/ui/states.md` §4: the control stays visible, disabled, labelled with what is
         * missing. Everything here needs a session; nothing here needs an operator, because an
         * organization is a tenant's own business.
         */
        /**
         * The session comes from the **auth Extension**, not from a capability.
         *
         * There is no `cx.state.session`, and that is right: the kernel holds a session for its own
         * use — `models` scopes a query with it, `credentials` attaches it — but *whether a site has
         * accounts at all* is a site's decision, so what a part reads is whatever fills the seam.
         * Here that is `AUTH`, declared in `consumes`, so a site can see this app needs one.
         */
        const auth = cx.use(AUTH);

        const needsSession = (): Availability =>
            auth.session() === null
                ? { can: false, why: 'needs_session', detail: 'Sign in to manage access.' }
                : AVAILABLE;

        const needsSelection = (): Availability => {
            const session = needsSession();
            if (!session.can) return session;
            return selected() === null
                ? { can: false, why: 'not_ready', detail: 'Choose an organization first.' }
                : AVAILABLE;
        };

        const decl = PUBLISHES.commands;

        const commands: IdentityCommands = {
            createOrganization: {
                ...decl[0],
                available: needsSession,
                run: async (input): Promise<Organization> => {
                    /**
                     * `ownerId` is sent and ignored — the server overwrites it with the caller.
                     *
                     * That is not a mistake on either side: `defineCrud` derives its create input
                     * from the stored record and cannot omit a required field, so the API asks for a
                     * value it discards. Recorded as mesh-serve **F10**, third occurrence. Sending
                     * the caller's own id rather than a placeholder keeps it honest if the override
                     * is ever removed.
                     */
                    const owner = auth.session()?.userId ?? '';
                    const created = await cx.mesh.call('organization.create', { ...input, ownerId: owner });
                    if (!created.ok) throw new Error(describe(created.error));
                    // `describe` is the framework's — a site's error copy is one thing to change,
                    // and a new transport failure is a compile error there rather than an
                    // `undefined` in a toast here.
                    selected.set(created.value.id);
                    // The form closes because the thing it was for happened. Closing it before the
                    // call would take the fields away from somebody the server is about to refuse.
                    creating.set(false);
                    return created.value;
                },
            } as BoundCommand<{ name: string; slug: string }, Organization>,

            addMember: {
                ...decl[1],
                available: needsSelection,
                run: async (input): Promise<Membership> => {
                    const organizationId = selected();
                    if (organizationId === null) throw new Error('No organization is selected.');
                    const created = await cx.mesh.call('membership.create', { ...input, organizationId });
                    if (!created.ok) throw new Error(describe(created.error));
                    // `describe` is the framework's — a site's error copy is one thing to change,
                    // and a new transport failure is a compile error there rather than an
                    // `undefined` in a toast here.
                    return created.value;
                },
            } as BoundCommand<{ userId: string; roleKey: string }, Membership>,

            removeMember: {
                ...decl[2],
                available: needsSelection,
                run: async (input): Promise<{ ok: boolean }> => {
                    const removed = await cx.mesh.call('membership.delete', input);
                    if (!removed.ok) throw new Error(describe(removed.error));
                    return removed.value;
                },
            } as BoundCommand<{ id: string }, { ok: boolean }>,
        };

        const internal: IdentityInternal = {
            organizations: cx.state.computed(() => organizations.rows() as readonly Organization[]),
            memberships: cx.state.computed(() => memberships.rows() as readonly Membership[]),
            roles: cx.state.computed(() => roles.rows() as readonly Role[]),
            status,
            error,
            selected,
            select: (id) => { selected.set(id); },
            members,
            selectedOrganization,
            creating,
            commands,
        };

        /**
         * **What leaves this app, and what does not.**
         *
         * Three slots. The selection, the status and the command *implementations* stay internal —
         * another part has no use for which row is highlighted, and anything published is reachable
         * by a tool caller.
         *
         * `state` is the computed signals, which are read-only by construction. Publishing
         * `selected` — a writable `Signal` — would let any part on the page drive this screen, which
         * is the shape of bug that put a password buffer on a public API.
         */
        const api: PartApi = {
            commands: {
                createOrganization: commands.createOrganization as BoundCommand<unknown, unknown>,
                addMember: commands.addMember as BoundCommand<unknown, unknown>,
                removeMember: commands.removeMember as BoundCommand<unknown, unknown>,
            },
            components: {},
            state: {
                organizations: internal.organizations,
                roles: internal.roles,
            },
        };

        cx.windows.open({ view: 'main' });

        return { api, internal };
    }

    async stop(): Promise<void> {
        // Nothing to unwind: every effect belongs to the context and the kernel disposes it.
        await Promise.resolve();
    }
}

