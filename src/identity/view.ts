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

import { element, text, when, each, type Node, type PartApi, type ViewContext } from '@flybyme/mesh-web';

import { DetailSurface, EntityItem, EntityList, PropertyGrid, Table, TableRow, ActionButton, ActionCard } from '../ui/index.js';
import type { IdentityInternal, Membership, Organization } from './contract.js';

export function renderIdentity(
    vx: ViewContext<Record<string, never>, IdentityInternal, PartApi>,
): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'identity', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        children: [
            header(app),
            element('Row', {
                props: { class: 'identity-body', style: { display: 'flex', flex: '1', minHeight: '0' } },
                children: [index(app), detail(app)],
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
const header = (app: IdentityInternal): Node =>
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
            // Always present, refused when it cannot run, and saying which standing is missing.
            ActionButton({
                command: app.commands.createOrganization,
                input: { name: '', slug: '' },
                label: 'New organization',
                class: 'primary',
            }).view(),
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
const index = (app: IdentityInternal): Node =>
    EntityList({
        title: 'Organizations',
        status: () => app.status(),
        count: () => app.organizations().length,
        errorMessage: () => app.error(),
        loadingMessage: 'Loading organizations…',
        emptyMessage: 'No organizations yet.',
        emptyAction: () => createCard(app),
        width: 280,
        children: [
            each(
                () => app.organizations(),
                (o: Organization) => o.id,
                (o: () => Organization) => EntityItem({
                    title: () => o().name,
                    description: () => o().slug,
                    selected: () => app.selected() === o().id,
                    // An intent, not a handler: the same verb a key binding or an agent would reach.
                    intents: { activate: { action: { kind: 'handler', id: `identity.select:${o().id}` } } },
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
const detail = (app: IdentityInternal): Node =>
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
                    membersTable(app),
                    ActionCard({ command: app.commands.addMember, title: 'Add a member' }).view(),
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
const membersTable = (app: IdentityInternal): Node =>
    element('Stack', {
        props: { class: 'identity-members' },
        children: [
            element('Heading', { props: { level: 2 }, children: [text('Members')] }),
            when(
                () => app.members().length === 0,
                () => element('Text', {
                    props: { class: 'identity-empty' },
                    children: [text('Nobody belongs to this organization yet.')],
                }),
                () => Table({
                    headers: ['Account', 'Role', ''],
                    children: [
                        each(
                            () => app.members(),
                            (m: Membership) => m.id,
                            (m: () => Membership) => TableRow({
                                children: [
                                    // The account id, for the same reason as the owner above.
                                    element('Text', { children: [text(() => m().userId)] }),
                                    element('Text', { children: [text(() => m().roleKey)] }),
                                    removeButton(app, m()),
                                ],
                            }),
                        ),
                    ],
                }),
            ),
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
const removeButton = (app: IdentityInternal, member: Membership): Node =>
    ActionButton({
        command: app.commands.removeMember,
        input: { id: member.id },
        label: 'Remove',
        runningLabel: 'Removing…',
        class: 'danger',
    // A composite is created and then rendered: `create` returns its state *and* a `view()`, so a
    // caller that wants only the description asks for it. That is the difference from a component,
    // which is props in and description out with nothing to own.
    }).view();

const createCard = (app: IdentityInternal): Node =>
    ActionCard({ command: app.commands.createOrganization, title: 'New organization' }).view();
