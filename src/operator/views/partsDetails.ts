import {
    command,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { PartFindOutputItem, PartVersionFindOutputItem } from '../../generated/api.js';
import type { CatalogFormSignals } from '../commands/parts.js';
import type { OperatorStateBundle } from '../state.js';
import { renderDeclarationCard, renderImportRepoCard, renderReleaseCards } from './partsCards.js';
import { renderRefusedControl } from './common.js';

export function renderRangeResolverCard(forms: CatalogFormSignals): Described {
    return element('Card', {
        props: {
            class: 'catalog-range-resolver-card',
            style: { padding: '16px', background: 'var(--surface, #161b22)', borderRadius: '6px', border: '1px solid var(--edge, #30363d)', marginBottom: '16px' },
        },
        children: [
            element('Heading', {
                props: { level: 3, style: { fontSize: '14px', margin: '0 0 10px 0' } },
                children: [text('Version Resolver (catalog.resolve)')],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '8px', marginBottom: '8px' } },
                children: [
                    element('Input', {
                        props: {
                            class: 'input-resolve-kernel',
                            placeholder: 'Kernel (^0.15)',
                            value: forms.resolveKernel,
                            style: { width: '110px', padding: '4px 8px', fontSize: '12px' },
                        },
                        intents: { change: { action: command('operator.setResolveKernel') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-resolve-part-name',
                            placeholder: 'Part name',
                            value: forms.resolvePartName,
                            style: { flex: '1 1 auto', padding: '4px 8px', fontSize: '12px' },
                        },
                        intents: { change: { action: command('operator.setResolvePartName') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-resolve-part-range',
                            placeholder: 'Range (^0.1.0)',
                            value: forms.resolvePartRange,
                            style: { width: '110px', padding: '4px 8px', fontSize: '12px' },
                        },
                        intents: { change: { action: command('operator.setResolvePartRange') } },
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-run-resolve',
                            disabled: () => forms.resolveStatus() === 'resolving',
                            style: { padding: '4px 12px', fontSize: '12px', cursor: 'pointer' },
                        },
                        intents: { activate: { action: command('operator.runResolve') } },
                        children: [text(() => (forms.resolveStatus() === 'resolving' ? 'Resolving…' : 'Resolve'))],
                    }),
                ],
            }),
            when(
                () => forms.resolveResult() !== null,
                () => element('Text', {
                    props: { class: 'resolve-result-box', style: { fontSize: '12px', color: 'var(--accent, #58a6ff)' } },
                    children: [text(() => `Resolved: kernel ${forms.resolveResult()?.kernel?.version ?? ''}`)],
                }),
            ),
        ],
    });
}

export function renderVersionTable(
    state: OperatorStateBundle,
): Described {
    const versions = state.cx.models('partVersion');
    return element('Stack', {
        props: { class: 'catalog-version-section', style: { marginBottom: '16px' } },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                children: [
                    element('Heading', {
                        props: { level: 3, style: { fontSize: '14px', margin: '0' } },
                        children: [text('Published Versions')],
                    }),
                    renderRefusedControl('Delete Version', 'internal #69'),
                ],
            }),
            element('Table', {
                props: {
                    class: 'catalog-version-table',
                    headers: ['Version', 'Kernel', 'Created', 'Artifact (builder.get_artifact)'],
                    rows: () => versions.rows().map((v: PartVersionFindOutputItem) => [
                        v.version,
                        v.kernel ?? 'any',
                        v.createdAt ? String(v.createdAt).slice(0, 10) : 'unknown',
                        v.artifactDigest ? `${v.artifactDigest.slice(0, 12)}…` : 'none',
                    ]),
                },
            }),
        ],
    });
}

export function renderPartDetailsPane(
    state: OperatorStateBundle,
    forms: CatalogFormSignals,
): Described {
    const parts = state.cx.models('part');
    const selectedPart = (): PartFindOutputItem | null => {
        const name = state.selectedPartName();
        if (name === null) return null;
        return parts.rows().find((p: PartFindOutputItem) => p.name === name) ?? null;
    };

    return element('ScrollView', {
        props: {
            class: 'catalog-part-details',
            orientation: 'vertical',
            style: { flex: '1 1 auto', padding: '20px 24px', boxSizing: 'border-box', height: '100%', background: 'var(--page, #0d1117)' },
        },
        children: [
            renderImportRepoCard(forms),
            when(
                () => selectedPart() !== null,
                () => element('Stack', {
                    children: [
                        element('Row', {
                            props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
                            children: [
                                element('Heading', {
                                    props: { level: 2, style: { margin: '0', fontSize: '20px' } },
                                    children: [text(() => selectedPart()?.name ?? '')],
                                }),
                                element('Text', {
                                    props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)' } },
                                    children: [text(() => `Publisher: ${selectedPart()?.publisher ?? ''}`)],
                                }),
                            ],
                        }),
                        element('Text', {
                            props: { style: { fontSize: '13px', color: 'var(--ink, #e6edf3)', marginBottom: '14px' } },
                            children: [text(() => selectedPart()?.description ?? 'No description provided.')],
                        }),
                        renderDeclarationCard(forms, selectedPart),
                        renderReleaseCards(forms, selectedPart),
                        renderVersionTable(state),
                        renderRangeResolverCard(forms),
                    ],
                }),
                () => element('Text', {
                    props: { style: { color: 'var(--ink-dim, #8b949e)', textAlign: 'center', padding: '32px' } },
                    children: [text('Select a part from the list to inspect its versions and declaration.')],
                }),
            ),
        ],
    });
}
