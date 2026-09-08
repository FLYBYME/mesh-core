import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { PartFindOutputItem } from '../../generated/api.js';
import type { CatalogFormSignals } from '../commands/parts.js';
import type { OperatorStateBundle } from '../state.js';
import {
    renderEmptyState,
    renderErrorBanner,
    renderLoadingSkeleton,
    renderRefusedControl,
    renderUnauthenticatedState,
} from './common.js';
import { renderPartDetailsPane } from './partsDetails.js';

export function renderPartsView(
    state: OperatorStateBundle,
    forms: CatalogFormSignals,
): Described {
    const parts = state.cx.models('part');

    const filteredParts = (): readonly PartFindOutputItem[] => {
        const q = forms.searchQuery().toLowerCase().trim();
        const k = forms.kindFilter();
        return parts.rows().filter((p: PartFindOutputItem) => {
            if (k !== 'all' && p.kind !== k) return false;
            if (q === '') return true;
            return p.name.toLowerCase().includes(q)
                || p.publisher.toLowerCase().includes(q)
                || (p.description ?? '').toLowerCase().includes(q);
        });
    };

    return element('Stack', {
        props: {
            class: 'parts-view',
            'data-view': 'parts',
            style: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--page, #0d1117)' },
        },
        children: [
            renderErrorBanner(state.error, state.refresh),
            when(
                () => !state.isSignedIn(),
                renderUnauthenticatedState,
            ),
            when(
                () => parts.status() === 'loading',
                () => renderLoadingSkeleton('catalog parts'),
            ),
            when(
                () => parts.status() !== 'loading' && parts.rows().length === 0,
                () => renderEmptyState(
                    'No parts published',
                    'The catalog is currently empty. Import a git repository to declare parts and publish versions.',
                ),
            ),
            element('Row', {
                props: {
                    style: { display: 'flex', flex: '1 1 auto', height: '100%', overflow: 'hidden' },
                },
                children: [
                    element('Stack', {
                        props: {
                            class: 'parts-sidebar',
                            style: { flex: '0 0 320px', borderRight: '1px solid var(--edge, #30363d)', background: 'var(--surface, #161b22)', display: 'flex', flexDirection: 'column' },
                        },
                        children: [
                            element('Row', {
                                props: { style: { padding: '12px', borderBottom: '1px solid var(--edge, #30363d)', display: 'flex', gap: '8px' } },
                                children: [
                                    element('TextInput', {
                                        props: {
                                            class: 'input-catalog-search',
                                            placeholder: 'Search parts…',
                                            value: forms.searchQuery,
                                            style: { flex: '1 1 auto', padding: '4px 8px', fontSize: '12px' },
                                        },
                                        intents: { change: { action: command('operator.setSearch') } },
                                    }),
                                    renderRefusedControl('Delete', 'internal #69'),
                                ],
                            }),
                            element('ScrollView', {
                                props: { orientation: 'vertical', style: { flex: '1 1 auto', padding: '8px' } },
                                children: [
                                    each<PartFindOutputItem>(
                                        filteredParts,
                                        (p) => p.name,
                                        (p) => element('Row', {
                                            props: {
                                                class: () => `part-row part-item ${state.selectedPartName() === p().name ? 'selected-part' : ''}`,
                                                style: () => ({
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    borderRadius: '4px',
                                                    background: state.selectedPartName() === p().name ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                                                    color: state.selectedPartName() === p().name ? 'var(--accent, #58a6ff)' : 'var(--ink, #e6edf3)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                }),
                                            },
                                            intents: { activate: { action: command('operator.selectPart', p().name) } },
                                            children: [
                                                element('Text', { props: { style: { fontWeight: '500' } }, children: [text(() => p().name)] }),
                                                element('Badge', {
                                                    props: { style: { fontSize: '10px', padding: '1px 6px', background: 'var(--surface, #21262d)', borderRadius: '10px' } },
                                                    children: [text(() => p().kind)],
                                                }),
                                            ],
                                        }),
                                    ),
                                ],
                            }),
                        ],
                    }),
                    renderPartDetailsPane(state, forms),
                ],
            }),
        ],
    });
}
