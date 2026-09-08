import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { FleetNode } from '../contract.js';
import type { FleetFormSignals } from '../commands/fleet.js';
import type { OperatorStateBundle } from '../state.js';
import {
    renderEmptyState,
    renderErrorBanner,
    renderLoadingSkeleton,
    renderUnauthenticatedState,
} from './common.js';
import { renderMachineDetail } from './fleetDetail.js';

function renderFleetNodeItem(node: () => FleetNode, state: OperatorStateBundle): Described {
    return element('Row', {
        props: {
            class: () => `fleet-node fleet-node-${node().hostname} ${state.selectedNodeId() === node().hostname ? 'selected-node' : ''}`,
            style: () => ({
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '4px',
                background: state.selectedNodeId() === node().hostname ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                color: state.selectedNodeId() === node().hostname ? 'var(--accent, #58a6ff)' : 'var(--ink, #e6edf3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }),
        },
        intents: { activate: { action: command('operator.selectNode', node().hostname) } },
        children: [
            element('Stack', {
                children: [
                    element('Text', { props: { style: { fontWeight: '500', fontSize: '13px' } }, children: [text(() => node().hostname)] }),
                    element('Text', {
                        props: { style: { fontSize: '11px', color: 'var(--ink-dim, #8b949e)', marginTop: '2px' } },
                        children: [text(() => `${String((node().running ?? []).length)} running · ${String((node().services ?? []).length)} assigned`)],
                    }),
                ],
            }),
            element('Badge', {
                props: {
                    style: () => ({
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: node().connected ? 'rgba(63, 185, 80, 0.15)' : 'var(--surface, #21262d)',
                        color: node().connected ? '#3fb950' : 'var(--ink-dim, #8b949e)',
                    }),
                },
                children: [text(() => (node().connected ? '● connected' : '○ offline'))],
            }),
        ],
    });
}

export function renderFleetView(state: OperatorStateBundle, forms: FleetFormSignals): Described {
    return element('Stack', {
        props: { class: 'operator-view operator-view-fleet', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        children: [
            when(() => state.effectiveState() === 'loading', () => renderLoadingSkeleton('Loading fleet nodes and groups…')),
            when(() => state.effectiveState() === 'unauthenticated', () => renderUnauthenticatedState()),
            when(() => state.effectiveState() === 'error', () => renderErrorBanner(state.errorMessage, state.refresh)),
            when(
                () => state.effectiveState() === 'empty',
                () => renderEmptyState('No nodes in fleet', 'Provision machines onto the mesh using the form on the right.'),
            ),
            when(
                () => state.effectiveState() === 'ready',
                () => element('Grid', {
                    props: { columns: '320px 1fr', gap: 16, style: { flex: '1 1 auto', overflow: 'hidden' } },
                    children: [
                        element('Stack', {
                            props: {
                                class: 'fleet-sidebar',
                                style: { borderRight: '1px solid var(--edge, #30363d)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
                            },
                            children: [
                                element('Heading', { props: { level: 4, style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', padding: '8px 12px 4px' } }, children: [text('Machines')] }),
                                element('ScrollView', {
                                    props: { class: 'fleet-nodes-list', orientation: 'vertical', style: { flex: '1 1 auto', padding: '4px' } },
                                    children: [
                                        each<FleetNode>(
                                            () => state.fleet(),
                                            (n) => n.hostname,
                                            (n) => renderFleetNodeItem(n, state),
                                        ),
                                    ],
                                }),
                            ],
                        }),
                        element('ScrollView', {
                            props: { orientation: 'vertical', style: { flex: '1 1 auto', padding: '16px' } },
                            children: [renderMachineDetail(state, forms)],
                        }),
                    ],
                }),
            ),
        ],
    });
}
