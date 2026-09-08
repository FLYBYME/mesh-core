import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { SitesFormSignals } from '../commands/sites.js';
import type { OperatorStateBundle } from '../state.js';
import { type ContractRowData, getAllContractRows } from './sitesMeshModel.js';

function renderContractRow(item: () => ContractRowData, forms: SitesFormSignals): Described {
    return element('Row', {
        props: {
            class: () => `mesh-contract-row mesh-contract-${item().key.replace(/\./g, '-')}${item().isUnused ? ' is-unused' : ''}${item().isGranted ? ' is-granted' : ''}`,
            style: () => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '4px',
                marginBottom: '4px',
                background: item().isUnused ? 'rgba(210, 153, 34, 0.08)' : item().isGranted ? 'rgba(56, 139, 253, 0.06)' : 'transparent',
                border: item().isUnused ? '1px solid rgba(210, 153, 34, 0.35)' : item().isGranted ? '1px solid rgba(56, 139, 253, 0.2)' : '1px solid var(--edge, #30363d)',
                fontSize: '12px',
                gap: '8px',
            }),
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', minWidth: '0' } },
                children: [
                    element('Button', {
                        props: {
                            class: () => `mesh-grant-toggle mesh-grant-toggle-${item().key.replace(/\./g, '-')}`,
                            disabled: forms.busy,
                            style: () => ({
                                padding: '2px 8px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                cursor: forms.busy() ? 'not-allowed' : 'pointer',
                                background: item().isGranted ? 'var(--accent, #1f6feb)' : 'var(--surface, #21262d)',
                                color: item().isGranted ? 'var(--on-accent, #ffffff)' : 'var(--ink-dim, #8b949e)',
                                border: '1px solid var(--edge, #30363d)',
                                fontWeight: '600',
                            }),
                        },
                        intents: { activate: { action: command('operator.toggleSiteGrant', item().key) } },
                        children: [text(() => (item().isGranted ? '☑ Granted' : '☐ Grant'))],
                    }),
                    element('Text', {
                        props: {
                            class: 'mesh-contract-key',
                            style: () => ({
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                fontWeight: item().isGranted ? '600' : 'normal',
                                color: item().isGranted ? 'var(--ink, #e6edf3)' : 'var(--ink-dim, #8b949e)',
                            }),
                        },
                        children: [text(() => item().key)],
                    }),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                children: [
                    element('Badge', {
                        props: {
                            class: 'mesh-contract-gate',
                            style: () => ({
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: item().gate === 'public' ? 'rgba(56, 139, 253, 0.15)' : 'rgba(210, 153, 34, 0.15)',
                                color: item().gate === 'public' ? '#58a6ff' : '#d29922',
                                border: '1px solid var(--edge, #30363d)',
                                textTransform: 'uppercase',
                                fontWeight: '600',
                            }),
                        },
                        children: [text(() => item().gate)],
                    }),
                    when(
                        () => item().isUnused,
                        () => element('Badge', {
                            props: {
                                class: 'mesh-unused-grant',
                                style: { fontSize: '10px', padding: '1px 7px', borderRadius: '4px', background: 'rgba(210, 153, 34, 0.25)', color: '#d29922', border: '1px solid #d29922', fontWeight: '700' },
                            },
                            children: [text('⚠️ Unused grant')],
                        }),
                    ),
                    when(
                        () => item().isRequired && !item().isGranted,
                        () => element('Badge', {
                            props: {
                                class: 'mesh-missing-grant',
                                style: { fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(248, 81, 73, 0.15)', color: '#f85149', border: '1px solid #f85149', fontWeight: '600' },
                            },
                            children: [text('Required by release')],
                        }),
                    ),
                    when(
                        () => item().isRequired && item().isGranted,
                        () => element('Badge', {
                            props: {
                                class: 'mesh-satisfied-grant',
                                style: { fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(63, 185, 80, 0.15)', color: '#3fb950', border: '1px solid #3fb950', fontWeight: '600' },
                            },
                            children: [text('✓ Required')],
                        }),
                    ),
                ],
            }),
        ],
    });
}

export function renderMeshExposureEditor(state: OperatorStateBundle, forms: SitesFormSignals): Described {
    const allRows = () => getAllContractRows(state, forms);
    const filteredRows = () => {
        const all = allRows();
        const filter = forms.meshFilter();
        const search = forms.meshSearch().trim().toLowerCase();
        return all.filter((r) => {
            if (search && !r.key.toLowerCase().includes(search)) return false;
            if (filter === 'granted') return r.isGranted;
            if (filter === 'required') return r.isRequired;
            if (filter === 'unused') return r.isUnused;
            return true;
        });
    };

    return element('Stack', {
        props: {
            class: 'mesh-exposure-editor',
            style: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--surface, #161b22)', border: '1px solid var(--edge, #30363d)', borderRadius: '6px', width: '100%' },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', fontSize: '12px' } },
                        children: [
                            element('Span', { props: { class: 'mesh-summary-total', style: { color: 'var(--ink-dim, #8b949e)' } }, children: [text(() => `${String(allRows().length)} available`)] }),
                            element('Span', { props: { class: 'mesh-summary-granted', style: { color: 'var(--accent, #58a6ff)' } }, children: [text(() => `${String(allRows().filter((r) => r.isGranted).length)} granted`)] }),
                            element('Span', { props: { class: 'mesh-summary-required', style: { color: '#3fb950' } }, children: [text(() => `${String(allRows().filter((r) => r.isRequired).length)} required`)] }),
                        ],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-toggle-raw-mesh',
                            type: 'button',
                            style: { padding: '2px 8px', fontSize: '11px', background: 'var(--chrome, #0d1117)', border: '1px solid var(--edge, #30363d)', borderRadius: '4px', color: 'var(--ink-dim, #8b949e)', cursor: 'pointer' },
                        },
                        intents: { activate: { action: command('operator.toggleRawMesh') } },
                        children: [text(() => (forms.showRawMesh() ? 'Hide Raw JSON' : 'Show Raw JSON'))],
                    }),
                ],
            }),
            when(
                () => allRows().some((r) => r.isUnused),
                () => element('Row', {
                    props: {
                        class: 'mesh-unused-warning-banner',
                        style: { display: 'flex', alignItems: 'center', padding: '6px 10px', background: 'rgba(210, 153, 34, 0.15)', border: '1px solid var(--warn, #d29922)', borderRadius: '4px', fontSize: '12px', color: 'var(--warn, #d29922)' },
                    },
                    children: [
                        element('Span', {
                            props: { style: { fontWeight: '600' } },
                            children: [text(() => {
                                const unused = allRows().filter((r) => r.isUnused);
                                return `⚠️ ${String(unused.length)} unused grant(s): ${unused.map((u) => u.key).join(', ')}`;
                            })],
                        }),
                    ],
                }),
            ),
            when(
                () => forms.showRawMesh(),
                () => element('Input', {
                    props: {
                        class: 'input-mesh',
                        multiline: true,
                        value: forms.formMesh,
                        style: { width: '100%', height: '120px', fontFamily: 'monospace', fontSize: '11px', background: 'var(--surface, #21262d)', color: 'var(--ink, #e6edf3)', border: '1px solid var(--edge, #30363d)', borderRadius: '4px', padding: '8px' },
                    },
                    intents: { change: { action: command('operator.setFormMesh') } },
                }),
            ),
            element('Row', {
                props: { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', marginBottom: '8px' } },
                children: [
                    element('Input', {
                        props: {
                            class: 'input-mesh-search',
                            placeholder: 'Filter contracts…',
                            value: forms.meshSearch,
                            style: { flex: '1 1 auto', padding: '4px 8px', fontSize: '12px', borderRadius: '4px', background: 'var(--surface, #21262d)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)' },
                        },
                        intents: { change: { action: command('operator.setMeshSearch') } },
                    }),
                ],
            }),
            element('ScrollView', {
                props: { orientation: 'vertical', style: { maxHeight: '300px', display: 'flex', flexDirection: 'column' } },
                children: [
                    each<ContractRowData>(
                        filteredRows,
                        (r) => r.key,
                        (r) => renderContractRow(r, forms),
                    ),
                ],
            }),
        ],
    });
}
