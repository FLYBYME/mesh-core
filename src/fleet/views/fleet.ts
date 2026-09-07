import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
    type ViewContext,
} from '@flybyme/mesh-web';

import { UI_DETAIL_SURFACE, UI_ENTITY_ITEM, UI_ENTITY_LIST } from '../../ui/contract.js';
import type { FleetApi, FleetNode } from '../contract.js';

/**
 * The fleet, as a list of machines beside one machine in detail.
 *
 * The layout claim is small and worth stating: **desired and observed sit next to each other on
 * every row.** A machine that should run three services and is running two is the only interesting
 * thing this screen can tell you, and it can only tell you that by showing both numbers.
 */

const row = (children: readonly Described[], gap = '8px'): Described =>
    element('Row', {
        props: { style: { display: 'flex', alignItems: 'center', gap, flexWrap: 'wrap' } },
        children: [...children],
    });

const chip = (
    label: string,
    tone: 'on' | 'off' | 'warn' | 'quiet',
    onActivate?: string,
    arg?: string,
): Described => element('Button', {
    props: {
        class: `fleet-chip fleet-chip-${tone}`,
        style: {
            padding: '2px 9px',
            borderRadius: '999px',
            fontSize: '12px',
            cursor: onActivate === undefined ? 'default' : 'pointer',
            border: '1px solid var(--edge)',
            background: tone === 'on' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : 'var(--surface)',
            color: tone === 'on' || tone === 'warn' ? 'var(--on-accent)' : 'var(--ink-dim)',
        },
    },
    ...(onActivate === undefined
        ? {}
        : { intents: { activate: { action: command(onActivate, arg ?? '') } } }),
    children: [text(label)],
});

function renderNodeItem(node: () => FleetNode, app: FleetApi): Described {
    return element(UI_ENTITY_ITEM, {
        props: {
            class: () => `fleet-node fleet-node-${node().hostname}`,
            selected: () => app.selectedHostname() === node().hostname,
        },
        intents: { activate: { action: command('fleet.select', node().hostname) } },
        children: [
            row([
                element('Text', {
                    props: { style: { fontWeight: '600' } },
                    children: [text(() => node().hostname)],
                }),
                // Connected is observed, live, and the first thing anyone wants to know.
                element('Text', {
                    props: {
                        // The whole `style` is the getter, not a property inside it.
                        // `Props = Reactive<Json> | undefined` applies per prop, and a style object
                        // holding a function is a Json object holding a function.
                        style: () => ({
                            fontSize: '11px',
                            color: node().connected ? 'var(--accent)' : 'var(--ink-dim)',
                        }),
                    },
                    children: [text(() => (node().connected ? '● connected' : '○ offline'))],
                }),
            ]),
            element('Text', {
                props: { style: { fontSize: '11px', color: 'var(--ink-dim)' } },
                children: [
                    text(() => {
                        const n = node();
                        const desired = n.services.length + (n.groups.length > 0 ? n.groups.length : 0);
                        // Two numbers, never one. A single "healthy" would hide the only fact worth
                        // reading, and there is deliberately no such field anywhere in this system.
                        return `${String(n.running.length)} running · ${String(n.services.length)} assigned`
                            + (n.groups.length > 0 ? ` · ${n.groups.join(', ')}` : '')
                            + (desired === 0 ? ' · unassigned' : '');
                    }),
                ],
            }),
            when(
                () => node().missing.length > 0,
                () => element('Text', {
                    props: { style: { fontSize: '11px', color: 'var(--warn)' } },
                    children: [text(() => `not running: ${node().missing.join(', ')}`)],
                }),
            ),
        ],
    });
}

function renderDetail(app: FleetApi): Described {
    const node = (): FleetNode | null => app.selected();
    const str = (pick: (n: FleetNode) => string): (() => string) =>
        () => { const n = node(); return n === null ? '' : pick(n); };

    return element(UI_DETAIL_SURFACE, {
        props: {
            class: 'fleet-detail',
            title: str((n) => n.hostname),
            subtitle: str((n) => (n.connected ? 'connected to the mesh' : 'not currently connected')),
            placeholder: 'Select a machine.',
            empty: () => node() === null,
        },
        children: [
            when(
                () => node() !== null,
                () => element('Stack', {
                    props: { style: { display: 'flex', flexDirection: 'column', gap: '18px' } },
                    children: [
                        element('Stack', {
                            props: { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                            children: [
                                element('Heading', {
                                    props: { level: 3, style: { fontSize: '13px', margin: '0' } },
                                    children: [text('Services')],
                                }),
                                element('Text', {
                                    props: { style: { fontSize: '11px', color: 'var(--ink-dim)' } },
                                    children: [text('Filled is assigned. A service running but not assigned is marked.')],
                                }),
                                row([
                                    each(
                                        () => app.knownServices(),
                                        (s) => s,
                                        (service) => chip(
                                            service(),
                                            (() => {
                                                const n = node();
                                                if (n === null) return 'quiet';
                                                if (n.extra.includes(service())) return 'warn';
                                                return n.services.includes(service()) ? 'on' : 'off';
                                            })(),
                                            'fleet.toggleService', service(),
                                        ),
                                    ),
                                ]),
                            ],
                        }),

                        element('Stack', {
                            props: { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                            children: [
                                element('Heading', {
                                    props: { level: 3, style: { fontSize: '13px', margin: '0' } },
                                    children: [text('Groups')],
                                }),
                                element('Text', {
                                    props: { style: { fontSize: '11px', color: 'var(--ink-dim)' } },
                                    children: [text('A group is stored by name, so editing one rolls onto every machine in it.')],
                                }),
                                row([
                                    each(
                                        () => app.groups(),
                                        (g) => g.name,
                                        (group) => chip(
                                            `${group().name} (${String((group().services ?? []).length)})`,
                                            node()?.groups.includes(group().name) === true ? 'on' : 'off',
                                            'fleet.toggleGroup', group().name,
                                        ),
                                    ),
                                ]),
                            ],
                        }),

                        element('Stack', {
                            props: { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                            children: [
                                element('Heading', {
                                    props: { level: 3, style: { fontSize: '13px', margin: '0' } },
                                    children: [text('Observed')],
                                }),
                                element('Text', {
                                    props: { style: { fontSize: '12px', color: 'var(--ink-dim)' } },
                                    children: [
                                        text(str((n) => (n.running.length === 0
                                            ? 'Nothing running.'
                                            : `Running: ${n.running.join(', ')}`))),
                                    ],
                                }),
                                when(
                                    () => (node()?.missing.length ?? 0) > 0,
                                    () => element('Text', {
                                        props: { style: { fontSize: '12px', color: 'var(--warn)' } },
                                        children: [
                                            text(str((n) => `Assigned but not running: ${n.missing.join(', ')}`)),
                                        ],
                                    }),
                                ),
                                when(
                                    () => (node()?.extra.length ?? 0) > 0,
                                    () => element('Text', {
                                        props: { style: { fontSize: '12px', color: 'var(--warn)' } },
                                        children: [
                                            text(str((n) => `Running but not assigned: ${n.extra.join(', ')}`)),
                                        ],
                                    }),
                                ),
                                element('Button', {
                                    props: {
                                        class: 'fleet-reconcile-one',
                                        style: { padding: '4px 12px', fontSize: '12px', alignSelf: 'flex-start' },
                                        disabled: () => app.busy(),
                                    },
                                    intents: {
                                        activate: {
                                            action: command('fleet.reconcile', node()?.hostname ?? ''),
                                        },
                                    },
                                    children: [text('Reconcile this machine')],
                                }),
                            ],
                        }),
                    ],
                }),
            ),
        ],
    });
}

export function renderFleetView(vx: ViewContext<Record<string, never>, FleetApi>): Described {
    const app = vx.app;

    return element('Stack', {
        props: {
            class: 'fleet-view',
            style: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%' },
        },
        children: [
            element('Row', {
                props: {
                    class: 'fleet-toolbar',
                    style: {
                        display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto',
                        padding: '8px 12px', borderBottom: '1px solid var(--edge)',
                        background: 'var(--chrome)',
                    },
                },
                children: [
                    element('Heading', {
                        props: { level: 2, style: { fontSize: '14px', margin: '0', flex: '1 1 auto' } },
                        children: [text(() => `Fleet — ${String(app.fleet().length)} machine(s)`)],
                    }),
                    element('Button', {
                        props: {
                            style: { padding: '4px 12px', fontSize: '12px' },
                            disabled: () => app.busy(),
                        },
                        intents: { activate: { action: command('fleet.refresh') } },
                        children: [text('Refresh')],
                    }),
                    element('Button', {
                        props: {
                            style: { padding: '4px 12px', fontSize: '12px' },
                            disabled: () => app.busy(),
                        },
                        intents: { activate: { action: command('fleet.reconcileAll') } },
                        children: [text('Reconcile all')],
                    }),
                ],
            }),

            when(
                () => app.lastAction() !== null || app.statusError() !== null,
                () => element('Text', {
                    props: {
                        class: 'fleet-message',
                        style: () => ({
                            flex: '0 0 auto', padding: '6px 12px', fontSize: '12px',
                            borderBottom: '1px solid var(--edge)',
                            color: app.statusError() !== null ? 'var(--error)' : 'var(--ink-dim)',
                        }),
                    },
                    children: [text(() => app.statusError() ?? app.lastAction() ?? '')],
                }),
            ),

            element('Row', {
                props: {
                    style: { display: 'flex', flex: '1 1 auto', minHeight: '0', overflow: 'hidden' },
                },
                children: [
                    element(UI_ENTITY_LIST, {
                        props: {
                            class: 'fleet-list',
                            status: () => app.nodesStatus(),
                            loadingMessage: 'Reading the fleet...',
                            errorMessage: () => app.nodesError() ?? 'Unknown fleet error',
                            emptyMessage: 'No machines have announced themselves yet.',
                            count: () => app.fleet().length,
                        },
                        children: [
                            each(() => app.fleet(), (n: FleetNode) => n.hostname,
                                (n: () => FleetNode) => renderNodeItem(n, app)),
                        ],
                    }),
                    element('Stack', {
                        props: {
                            style: {
                                display: 'flex', flexDirection: 'column', flex: '1 1 auto',
                                minWidth: '0', overflowY: 'auto', padding: '16px',
                            },
                        },
                        children: [renderDetail(app)],
                    }),
                ],
            }),
        ],
    });
}
