/**
 * **The identity screen. One window, three regions.**
 *
 * `spec/ui/anatomy.md`: a HEADER that says where you are, an INDEX you pick from, a DETAIL that
 * shows what you picked. They scroll independently and the view fills its surface without growing
 * it.
 *
 * The whole file reads `vx.internal` and never `vx.app`. That is the point of the reordering —
 * `ViewContext` is `params, internal, app`, input then state then output, and a view reaching for
 * `app` to find its own state is publishing that state to every part on the page and to any tool
 * caller. The app this replaces did exactly that, and ended with a password buffer on a public API.
 */

import {
    element, text, when, each,
    type Node, type PartApi, type Registrar, type ViewContext,
} from '@flybyme/mesh-web';

import { DetailSurface, EntityItem, EntityList, PropertyGrid, Table, TableRow, ActionButton, ActionCard, formatRefusal } from '../ui/index.js';
import type { IdentityInternal, Membership, Organization } from './contract.js';

export function renderIdentity(
    vx: ViewContext<Record<string, never>, IdentityInternal, PartApi>,
): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'identity', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        children: [
            header(app, vx.on),
            /**
             * **The new-organization form, above the two regions and below the header.**
             *
             * Not in the DETAIL region, which is showing an organization, and not a modal. A modal
             * would be the fourth thing on this page that dims and covers the others — `confirm` is
             * already one — and `spec/ui/anatomy.md` gives an app regions rather than layers. This
             * is a band that pushes the regions down while it is open, so nothing it covers is
             * needed to fill it in and nothing behind it is lost.
             */
            when(
                () => app.creating(),
                () => createCard(app, vx.on),
            ),
            element('Row', {
                props: { class: 'identity-body', style: { display: 'flex', flex: '1', minHeight: '0' } },
                children: [index(app, vx.on), detail(app, vx.on)],
            }),
        ],
    });
}

// ---------------------------------------------------------------------------- header

/**
 * **The primary action lives here, and mounting the app is what proved it has to.**
 *
 * It was only the INDEX's `emptyAction`, which reads sensibly and is wrong: `emptyAction` shows on
 * `empty`, and the state a signed-out person actually gets is `error` — the list cannot load. So the
 * first screen anybody sees had *no controls on it at all*, including the one that would fix the
 * situation. Every unit test passed, because each one called a piece that was never on screen.
 *
 * `spec/ui/vocabulary.md` already said so, under `ui.ButtonRow`: *"one primary action — that belongs
 * to the header"*. A primary action in the empty state is an action that disappears exactly when
 * something has gone wrong.
 */
/**
 * Why creating an organization is refused, or `undefined` when it is not.
 *
 * `Availability` is a discriminated union — `{ can: true }` carries no `detail`, and only the
 * refusing arm does — so reading `.detail` off the union does not typecheck. That is the type doing
 * its job: *a reason for a refusal that did not happen* is not a thing, and a screen that reached for
 * one would render an empty explanation beside an enabled control.
 */
const refusal = (app: IdentityInternal): string | undefined => {
    const standing = app.commands.createOrganization.available();
    return standing.can ? undefined : formatRefusal(standing);
};

const header = (app: IdentityInternal, on: Registrar): Node =>
    element('Row', {
        props: { class: 'identity-header' },
        children: [
            element('Stack', {
                props: { class: 'identity-title' },
                children: [
                    element('Heading', { props: { level: 1 }, children: [text('Identity')] }),
                    element('Text', {
                        props: { class: 'identity-subtitle' },
                        children: [text(() => {
                            const org = app.selectedOrganization();
                            return org === null ? 'Who may act, and where' : org.name;
                        })],
                    }),
                ],
            }),
            /**
             * **It opens the form. It does not run the command.**
             *
             * It used to run it, with the input written into the call as `{ name: '', slug: '' }`,
             * so pressing it posted two empty strings and the server answered *slug: String must
             * contain at least 1 character(s)*. The server was right; there was no form.
             *
             * `ActionButton` is for a command that is ready to run. This is incidental interaction —
             * revealing a region — so it is a plain button and `on`, the same way selecting a row is.
             * The refusal it used to carry moves to the card, where the command actually lives, and
             * is still visible: `createOrganization.available()` is what disables the submit.
             */
            element('Button', {
                props: {
                    class: 'identity-btn primary',
                    /**
                     * **Still refused when the command is, even though pressing it only opens a
                     * form.** `spec/ui/states.md` §4 — a refused control stays on screen, disabled,
                     * saying what is missing. Opening a form you cannot submit teaches somebody the
                     * feature works and then refuses them a step later, which is the same lie a
                     * vanishing control tells, one screen further in.
                     */
                    disabled: () => app.creating() || !app.commands.createOrganization.available().can,
                    'data-refused': () => (app.commands.createOrganization.available().can ? 'false' : 'true'),
                    title: () => refusal(app) ?? '',
                },
                intents: { activate: { action: on(() => { app.creating.set(true); }) } },
                children: [text(() => {
                    const why = refusal(app);
                    return why === undefined ? 'New organization' : `New organization — ${why}`;
                })],
            }),
        ],
    });

// ---------------------------------------------------------------------------- index

/**
 * The INDEX: organizations, live.
 *
 * Four states and no more — `loading`, `ready`, `empty`, `error`. There is no `refused` here and no
 * `unauthenticated`, because those are not list states: they are answers to *may I*, and a list you
 * may not read is a list whose read command is unavailable. Modelling them as statuses is what made
 * every app hand-roll the two hardest ones differently.
 */
const index = (app: IdentityInternal, on: Registrar): Node =>
    EntityList({
        title: 'Organizations',
        status: () => app.status(),
        count: () => app.organizations().length,
        errorMessage: () => app.error(),
        loadingMessage: 'Loading organizations…',
        emptyMessage: 'No organizations yet.',
        /**
         * **No `emptyAction`, and removing it is the point of this change.**
         *
         * It rendered `createCard` here, so with the form now also opening from the header there
         * were two of the same form on one screen, each with its own buffers, one of them visible
         * only in a state a signed-out person never reaches.
         *
         * `spec/ui/vocabulary.md` under `ui.ButtonRow`: *"one primary action — that belongs to the
         * header"*. The header carries it in every state, which is what an empty list needed and
         * what an errored one needed more.
         */
        width: 280,
        children: [
            each(
                () => app.organizations(),
                (o: Organization) => o.id,
                (o: () => Organization) => EntityItem({
                    title: () => o().name,
                    description: () => o().slug,
                    selected: () => app.selected() === o().id,
                    /**
                     * **Selecting a row is incidental, so it is a handler and now a real one.**
                     *
                     * The comment here used to claim the opposite — *"an intent, not a handler"* —
                     * over an `id` this file invented and nothing registered, so clicking an
                     * organization did nothing. Which row is highlighted is not a verb anyone binds
                     * a key to or calls from a tool; minting a palette command per row is how a
                     * command list becomes noise. `vx.on` is exactly the tool for this, and the
                     * closure reads the row through its accessor so a reordered list still selects
                     * the row that was clicked.
                     */
                    intents: { activate: { action: on(() => app.select(o().id)) } },
                }),
            ),
        ],
    });

// ---------------------------------------------------------------------------- detail

/**
 * The DETAIL: who is in the selected organization.
 *
 * `DetailSurface` carries its own no-selection placeholder, which is why there is no `when` around
 * this whole region — an empty detail is a state of the region, not an absence of one.
 */
const detail = (app: IdentityInternal, on: Registrar): Node =>
    DetailSurface({
        selected: () => app.selectedOrganization() !== null,
        placeholderTitle: 'Select an organization',
        placeholderMessage: 'Pick one on the left to see who belongs to it.',
        title: () => app.selectedOrganization()?.name ?? '',
        badge: () => `${String(app.members().length)} members`,
        children: [
            element('Stack', {
                props: { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
                children: [
                    facts(app),
                    membersTable(app, on),
                    ActionCard({ on, command: app.commands.addMember, title: 'Add a member' }).view(),
                ],
            }),
        ],
    });

/**
 * The rows are fixed; the **values** are reactive.
 *
 * `PropertyGridProps.items` is a plain array and each `value` is a `Reactive`, which is the right
 * split: which facts a thing has is a property of the *screen*, and what they currently say is a
 * property of the data. A reactive list of rows would rebuild the grid to change a word.
 */
const facts = (app: IdentityInternal): Node =>
    PropertyGrid({
        items: [
            { label: 'Slug', value: () => app.selectedOrganization()?.slug ?? '—' },
            // An id, not a name. `user` is internal, so the platform will not say who this is.
            // That is surfdns#71, rendered rather than worked around.
            { label: 'Owner', value: () => app.selectedOrganization()?.ownerId ?? '—' },
        ],
    });

/**
 * A `Table` and not an `EntityList`, by the vocabulary's own test: somebody reads across these rows
 * comparing who holds which role. A list is for picking one and looking at it.
 */
const membersTable = (app: IdentityInternal, on: Registrar): Node =>
    element('Stack', {
        props: { class: 'identity-members' },
        children: [
            element('Heading', { props: { level: 2 }, children: [text('Members')] }),
            Table({
                headers: ['Account', 'Role', ''],
                status: () => {
                    const status = app.membershipsStatus();
                    if (status === 'ready' && app.members().length === 0) return 'empty';
                    return status;
                },
                errorMessage: () => app.membershipsError(),
                loadingMessage: 'Loading members…',
                emptyMessage: 'Nobody belongs to this organization yet.',
                children: [
                    each(
                        () => app.members(),
                        (m: Membership) => m.id,
                        (m: () => Membership) => TableRow({
                            children: [
                                // The account id, for the same reason as the owner above.
                                element('Text', { children: [text(() => m().userId)] }),
                                element('Text', { children: [text(() => m().roleKey)] }),
                                removeButton(app, m(), on),
                            ],
                        }),
                    ),
                ],
            }),
        ],
    });

/**
 * The one destructive control on the platform that can actually be exercised — `membership.delete`
 * is the only public `delete` anywhere (surfdns#69).
 *
 * The button takes the command and nothing else. Refused, running and confirm-first all come from
 * the command's own `available()` and `confirm`, so none of it is this file's to remember — which is
 * the entire argument for `ui.ActionButton` existing.
 */
const removeButton = (app: IdentityInternal, member: Membership, on: Registrar): Node =>
    ActionButton({
        on,
        command: app.commands.removeMember,
        input: { id: member.id },
        label: 'Remove',
        runningLabel: 'Removing…',
        class: 'danger',
    // A composite is created and then rendered: `create` returns its state *and* a `view()`, so a
    // caller that wants only the description asks for it. That is the difference from a component,
    // which is props in and description out with nothing to own.
    }).view();

/**
 * The form itself, generated from `createOrganization`'s own input schema.
 *
 * Nobody writes a field, a label or a buffer for `name` and `slug`: `ActionCard` reads the schema on
 * the command. It carries the command's `available()` too, so signed out the submit is disabled and
 * says why, which is where the refusal that used to sit on the header button now lives.
 *
 * **Cancel is now supported by the composite.**
 * `ActionCardProps` has `onSecondary`, allowing the card to be dismissed without a custom wrapper.
 */
const createCard = (app: IdentityInternal, on: Registrar): Node =>
    element('Stack', {
        props: { class: 'identity-create' },
        children: [
            ActionCard({
                on,
                command: app.commands.createOrganization,
                title: 'New organization',
                onResult: () => { app.creating.set(false); },
                onSecondary: () => { app.creating.set(false); },
            }).view(),
        ],
    });
