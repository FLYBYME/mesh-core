import {
    command,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { SiteFindOutputItem } from '../../generated/api.js';
import type { SitesFormSignals } from '../commands/sites.js';
import type { OperatorStateBundle } from '../state.js';
import { renderRefusedControl } from './common.js';
import { renderMeshExposureEditor } from './sitesMesh.js';

export function renderSiteCreateCard(forms: SitesFormSignals): Described {
    return element('Card', {
        props: {
            class: 'site-create-card',
            style: { padding: '16px', background: 'var(--surface, #161b22)', borderRadius: '6px', border: '1px solid var(--edge, #30363d)', marginBottom: '16px' },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                children: [
                    element('Heading', { props: { level: 3, style: { fontSize: '14px', margin: '0' } }, children: [text('Create Site (site.create)')] }),
                    element('Badge', {
                        props: { style: { fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(63, 185, 80, 0.15)', color: '#3fb950', border: '1px solid rgba(63, 185, 80, 0.3)' } },
                        children: [text('Exposed Action')],
                    }),
                ],
            }),
            element('Text', {
                props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', display: 'block', marginBottom: '12px' } },
                children: [text('Register a new hostname on the mesh. Sets default policy, theme, and operator application.')],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '8px', marginBottom: '8px' } },
                children: [
                    element('Input', {
                        props: {
                            class: 'input-new-site-host',
                            placeholder: 'Hostname (e.g. docs.example.com)',
                            value: forms.newSiteHost,
                            style: { flex: '1 1 auto', padding: '6px 10px', fontSize: '12px', borderRadius: '4px', background: 'var(--chrome, #0d1117)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)' },
                        },
                        intents: { change: { action: command('operator.setNewSiteHost') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-new-site-title',
                            placeholder: 'Title (optional)',
                            value: forms.newSiteTitle,
                            style: { flex: '1 1 auto', padding: '6px 10px', fontSize: '12px', borderRadius: '4px', background: 'var(--chrome, #0d1117)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)' },
                        },
                        intents: { change: { action: command('operator.setNewSiteTitle') } },
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-create-site',
                            disabled: forms.busy,
                            style: { padding: '6px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '4px', background: 'var(--accent, #58a6ff)', color: 'var(--on-accent, #0d1117)', border: 'none', cursor: 'pointer' },
                        },
                        intents: { activate: { action: command('operator.runCreateSite') } },
                        children: [text(() => (forms.busy() ? 'Creating…' : 'Create Site'))],
                    }),
                ],
            }),
            when(
                () => forms.lastAction() !== null,
                () => element('Text', {
                    props: { class: 'site-action-msg', style: { color: '#3fb950', fontSize: '12px', marginTop: '4px', display: 'block' } },
                    children: [text(() => forms.lastAction() ?? '')],
                }),
            ),
        ],
    });
}

export function renderSiteDetailCard(state: OperatorStateBundle, forms: SitesFormSignals): Described {
    const site = (): SiteFindOutputItem | null => state.sites().find((s) => s.host === state.selectedHost()) ?? null;

    return element('Stack', {
        children: [
            renderSiteCreateCard(forms),
            when(
                () => site() !== null,
                () => element('Card', {
                    props: {
                        class: 'site-detail-card',
                        style: { padding: '16px', background: 'var(--chrome, #161b22)', borderRadius: '6px', border: '1px solid var(--edge, #30363d)' },
                    },
                    children: [
                        element('Row', {
                            props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
                            children: [
                                element('Stack', {
                                    children: [
                                        element('Heading', { props: { level: 2, style: { margin: '0', fontSize: '16px' } }, children: [text(() => site()?.host ?? '')] }),
                                        element('Text', { props: { style: { fontSize: '11px', color: 'var(--ink-dim, #8b949e)', marginTop: '2px' } }, children: [text(() => `ID: ${site()?.id ?? ''}`)] }),
                                    ],
                                }),
                                element('Row', {
                                    props: { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                                    children: [
                                        element('Badge', {
                                            props: {
                                                class: 'site-release-badge',
                                                style: () => ({
                                                    fontSize: '11px',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    background: site()?.releaseHash ? 'rgba(63, 185, 80, 0.15)' : 'var(--surface, #21262d)',
                                                    color: site()?.releaseHash ? '#3fb950' : 'var(--ink-dim, #8b949e)',
                                                }),
                                            },
                                            children: [text(() => {
                                                const r = site()?.releaseHash;
                                                return r ? `release ${r.slice(0, 10)}` : 'unreleased';
                                            })],
                                        }),
                                        renderRefusedControl('Delete Site', 'internal #69'),
                                    ],
                                }),
                            ],
                        }),
                        element('Stack', {
                            props: { class: 'site-meta-form', style: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' } },
                            children: [
                                element('Stack', {
                                    children: [
                                        element('Text', { props: { style: { fontSize: '12px', fontWeight: '500', marginBottom: '4px' } }, children: [text('Title')] }),
                                        element('Input', {
                                            props: {
                                                class: 'input-title',
                                                placeholder: 'Site title',
                                                value: forms.formTitle,
                                                style: { padding: '6px 10px', fontSize: '12px', borderRadius: '4px', background: 'var(--surface, #21262d)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)' },
                                            },
                                            intents: { change: { action: command('operator.setSiteTitle') } },
                                        }),
                                    ],
                                }),
                                element('Stack', {
                                    children: [
                                        element('Text', { props: { style: { fontSize: '12px', fontWeight: '500', marginBottom: '4px' } }, children: [text('Description')] }),
                                        element('Input', {
                                            props: {
                                                class: 'input-description',
                                                placeholder: 'Site description',
                                                value: forms.formDescription,
                                                style: { padding: '6px 10px', fontSize: '12px', borderRadius: '4px', background: 'var(--surface, #21262d)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)' },
                                            },
                                            intents: { change: { action: command('operator.setSiteDescription') } },
                                        }),
                                    ],
                                }),
                                element('Row', {
                                    props: { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' } },
                                    children: [
                                        element('Input', {
                                            props: {
                                                type: 'checkbox',
                                                class: 'input-indexable',
                                                checked: forms.formIndexable,
                                            },
                                            intents: { change: { action: command('operator.setSiteIndexable') } },
                                        }),
                                        element('Span', { props: { style: { fontSize: '12px', color: 'var(--ink, #e6edf3)' } }, children: [text('Indexable by search engines')] }),
                                    ],
                                }),
                                element('Row', {
                                    props: { style: { display: 'flex', justifyContent: 'flex-start', marginTop: '6px' } },
                                    children: [
                                        element('Button', {
                                            props: {
                                                class: 'btn-save-site-metadata',
                                                disabled: forms.busy,
                                                style: { padding: '6px 16px', fontSize: '12px', fontWeight: '600', borderRadius: '4px', background: 'var(--accent, #58a6ff)', color: 'var(--on-accent, #0d1117)', border: 'none', cursor: 'pointer' },
                                            },
                                            intents: { activate: { action: command('operator.runSaveSite') } },
                                            children: [text(() => (forms.busy() ? 'Saving…' : 'Save Metadata'))],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        renderMeshExposureEditor(state, forms),
                    ],
                }),
            ),
        ],
    });
}
