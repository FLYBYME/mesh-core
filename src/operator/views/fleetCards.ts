import {
    command,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { FleetFormSignals } from '../commands/fleet.js';
import { renderRefusedControl } from './common.js';

export function renderProvisionCard(forms: FleetFormSignals): Described {
    return element('Card', {
        props: {
            class: 'fleet-provision-card',
            style: { padding: '16px', background: 'var(--surface, #161b22)', borderRadius: '6px', border: '1px solid var(--edge, #30363d)', marginBottom: '16px' },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                children: [
                    element('Heading', { props: { level: 3, style: { fontSize: '14px', margin: '0' } }, children: [text('Provision Node (node.provision)')] }),
                    element('Badge', {
                        props: { style: { fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(88, 166, 255, 0.15)', color: '#58a6ff' } },
                        children: [text('Exposed Action')],
                    }),
                ],
            }),
            element('Stack', {
                props: { class: 'fleet-provision-form', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' } },
                children: [
                    element('Input', {
                        props: {
                            class: 'input-hostname',
                            placeholder: 'Hostname (required)',
                            value: forms.provisionHostname,
                            style: { padding: '4px 8px', fontSize: '12px', background: 'var(--chrome, #0d1117)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)', borderRadius: '4px' },
                        },
                        intents: { change: { action: command('operator.setProvisionHostname') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-name',
                            placeholder: 'Service Name (required)',
                            value: forms.provisionName,
                            style: { padding: '4px 8px', fontSize: '12px', background: 'var(--chrome, #0d1117)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)', borderRadius: '4px' },
                        },
                        intents: { change: { action: command('operator.setProvisionName') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-repository',
                            placeholder: 'Repository URL (required)',
                            value: forms.provisionRepository,
                            style: { padding: '4px 8px', fontSize: '12px', background: 'var(--chrome, #0d1117)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)', borderRadius: '4px' },
                        },
                        intents: { change: { action: command('operator.setProvisionRepository') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-ref',
                            placeholder: 'Ref (immutable SHA/tag required)',
                            value: forms.provisionRef,
                            style: { padding: '4px 8px', fontSize: '12px', background: 'var(--chrome, #0d1117)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)', borderRadius: '4px' },
                        },
                        intents: { change: { action: command('operator.setProvisionRef') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-path',
                            placeholder: 'Path (optional)',
                            value: forms.provisionPath,
                            style: { padding: '4px 8px', fontSize: '12px', background: 'var(--chrome, #0d1117)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)', borderRadius: '4px' },
                        },
                        intents: { change: { action: command('operator.setProvisionPath') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-dependsOn',
                            placeholder: 'Depends On (comma-separated)',
                            value: forms.provisionDependsOn,
                            style: { padding: '4px 8px', fontSize: '12px', background: 'var(--chrome, #0d1117)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)', borderRadius: '4px' },
                        },
                        intents: { change: { action: command('operator.setProvisionDependsOn') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-mountKey',
                            placeholder: 'Mount Key (optional)',
                            value: forms.provisionMountKey,
                            style: { padding: '4px 8px', fontSize: '12px', background: 'var(--chrome, #0d1117)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)', borderRadius: '4px' },
                        },
                        intents: { change: { action: command('operator.setProvisionMountKey') } },
                    }),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '8px' } },
                children: [
                    element('Button', {
                        props: {
                            class: 'btn-provision-node',
                            disabled: forms.busy,
                            style: { padding: '6px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '4px', background: 'var(--accent, #58a6ff)', color: 'var(--on-accent, #0d1117)', border: 'none', cursor: 'pointer' },
                        },
                        intents: { activate: { action: command('operator.runProvisionNode') } },
                        children: [text(() => (forms.busy() ? 'Provisioning…' : 'Provision Service'))],
                    }),
                ],
            }),
            when(
                () => forms.lastAction() !== null,
                () => element('Card', {
                    props: { class: 'fleet-provision-success-card', style: { marginTop: '8px', padding: '8px', background: 'rgba(63, 185, 80, 0.1)', color: '#3fb950', fontSize: '12px', borderRadius: '4px' } },
                    children: [text(() => forms.lastAction() ?? '')],
                }),
            ),
            when(
                () => forms.provisionError() !== null,
                () => element('Card', {
                    props: { class: 'fleet-provision-error-card', style: { marginTop: '8px', padding: '8px', background: 'rgba(248, 81, 73, 0.1)', color: '#f85149', fontSize: '12px', borderRadius: '4px' } },
                    children: [text(() => forms.provisionError() ?? '')],
                }),
            ),
        ],
    });
}

export function renderGroupForms(forms: FleetFormSignals): Described {
    return element('Card', {
        props: {
            class: 'fleet-groups-card',
            style: { padding: '16px', background: 'var(--surface, #161b22)', borderRadius: '6px', border: '1px solid var(--edge, #30363d)', marginBottom: '16px' },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                children: [
                    element('Heading', { props: { level: 3, style: { fontSize: '14px', margin: '0' } }, children: [text('Group Management (group.create / group.update)')] }),
                    renderRefusedControl('Delete Group', 'internal #69'),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '8px', marginBottom: '8px' } },
                children: [
                    element('Input', {
                        props: {
                            class: 'input-group-name',
                            placeholder: 'New group name',
                            value: forms.newGroupName,
                            style: { flex: '1 1 auto', padding: '4px 8px', fontSize: '12px', background: 'var(--chrome, #0d1117)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)', borderRadius: '4px' },
                        },
                        intents: { change: { action: command('operator.setNewGroupName') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-group-description',
                            placeholder: 'Description',
                            value: forms.newGroupDescription,
                            style: { flex: '1 1 auto', padding: '4px 8px', fontSize: '12px', background: 'var(--chrome, #0d1117)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)', borderRadius: '4px' },
                        },
                        intents: { change: { action: command('operator.setNewGroupDescription') } },
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-create-group',
                            disabled: forms.busy,
                            style: { padding: '4px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '4px', background: 'var(--surface, #21262d)', color: 'var(--ink, #e6edf3)', border: '1px solid var(--edge, #30363d)', cursor: 'pointer' },
                        },
                        intents: { activate: { action: command('operator.runCreateGroup') } },
                        children: [text('Create Group')],
                    }),
                ],
            }),
        ],
    });
}
