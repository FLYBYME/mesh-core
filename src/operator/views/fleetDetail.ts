import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { GroupFindOutputItem } from '../../generated/api.js';
import type { FleetNode } from '../contract.js';
import type { FleetFormSignals } from '../commands/fleet.js';
import type { OperatorStateBundle } from '../state.js';
import { renderRefusedControl } from './common.js';
import { renderGroupForms, renderProvisionCard } from './fleetCards.js';

export function renderMachineDetail(state: OperatorStateBundle, forms: FleetFormSignals): Described {
    const node = (): FleetNode | null => state.selectedNode();
    const knownServices = ['api', 'identity', 'fleet', 'supervisor', 'dns'];

    return element('Stack', {
        props: { class: 'fleet-detail', style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
        children: [
            renderProvisionCard(forms),
            renderGroupForms(forms),
            when(
                () => node() !== null,
                () => element('Card', {
                    props: {
                        class: 'selected-node-card',
                        style: { padding: '16px', background: 'var(--chrome, #161b22)', borderRadius: '6px', border: '1px solid var(--edge, #30363d)' },
                    },
                    children: [
                        element('Row', {
                            props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
                            children: [
                                element('Stack', {
                                    children: [
                                        element('Heading', { props: { level: 2, style: { margin: '0', fontSize: '16px' } }, children: [text(() => node()?.hostname ?? '')] }),
                                        element('Text', { props: { style: { fontSize: '11px', color: 'var(--ink-dim, #8b949e)', marginTop: '2px' } }, children: [text(() => (node()?.connected ? 'connected' : 'offline'))] }),
                                    ],
                                }),
                                element('Row', {
                                    props: { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                                    children: [
                                        element('Button', {
                                            props: {
                                                class: 'btn-reconcile-node',
                                                disabled: forms.busy,
                                                style: { padding: '4px 10px', fontSize: '12px', borderRadius: '4px', background: 'var(--surface, #21262d)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)', cursor: 'pointer' },
                                            },
                                            intents: { activate: { action: command('operator.reconcileNode') } },
                                            children: [text(() => (forms.busy() ? 'Reconciling…' : '↻ Reconcile'))],
                                        }),
                                        renderRefusedControl('Delete Node', 'internal #69'),
                                    ],
                                }),
                            ],
                        }),
                        element('Stack', {
                            props: { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' } },
                            children: [
                                element('Heading', { props: { level: 4, style: { fontSize: '12px', margin: '0' } }, children: [text('Service Assignments')] }),
                                element('Row', {
                                    props: { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                                    children: knownServices.map((svc) => element('Button', {
                                        props: {
                                            class: () => `fleet-chip fleet-chip-${node()?.services?.includes(svc) ? 'on' : 'off'}`,
                                            style: () => ({
                                                padding: '3px 10px',
                                                borderRadius: '999px',
                                                fontSize: '12px',
                                                border: '1px solid var(--edge, #30363d)',
                                                background: node()?.services?.includes(svc) ? 'var(--accent, #58a6ff)' : 'var(--surface, #21262d)',
                                                color: node()?.services?.includes(svc) ? 'var(--on-accent, #0d1117)' : 'var(--ink-dim, #8b949e)',
                                                cursor: 'pointer',
                                            }),
                                        },
                                        intents: { activate: { action: command('operator.toggleNodeService', svc) } },
                                        children: [text(svc)],
                                    })),
                                }),
                            ],
                        }),
                        element('Stack', {
                            props: { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' } },
                            children: [
                                element('Heading', { props: { level: 4, style: { fontSize: '12px', margin: '0' } }, children: [text('Groups')] }),
                                element('Row', {
                                    props: { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                                    children: [
                                        each<GroupFindOutputItem>(
                                            () => state.groups(),
                                            (g) => g.id,
                                            (g) => element('Button', {
                                                props: {
                                                    class: () => `fleet-chip fleet-chip-${node()?.groups?.includes(g().name) ? 'on' : 'off'}`,
                                                    style: () => ({
                                                        padding: '3px 10px',
                                                        borderRadius: '999px',
                                                        fontSize: '12px',
                                                        border: '1px solid var(--edge, #30363d)',
                                                        background: node()?.groups?.includes(g().name) ? 'var(--accent, #58a6ff)' : 'var(--surface, #21262d)',
                                                        color: node()?.groups?.includes(g().name) ? 'var(--on-accent, #0d1117)' : 'var(--ink-dim, #8b949e)',
                                                        cursor: 'pointer',
                                                    }),
                                                },
                                                intents: { activate: { action: command('operator.toggleNodeGroup', g().name) } },
                                                children: [text(() => g().name)],
                                            }),
                                        ),
                                    ],
                                }),
                            ],
                        }),
                        element('Stack', {
                            props: { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                            children: [
                                element('Heading', { props: { level: 4, style: { fontSize: '12px', margin: '0' } }, children: [text('Observed')] }),
                                element('Text', {
                                    props: { class: 'fleet-observed-provisioned', style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)' } },
                                    children: [text(() => `Provisioned (can run): ${(node()?.provisioned ?? []).join(', ') || 'None.'}`)],
                                }),
                                element('Text', {
                                    props: { class: 'fleet-observed-running', style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)' } },
                                    children: [text(() => `Running (active): ${(node()?.running ?? []).join(', ') || 'None.'}`)],
                                }),
                            ],
                        }),
                    ],
                }),
            ),
        ],
    });
}
