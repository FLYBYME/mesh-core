import {
    command,
    element,
    text,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { CatalogApi } from '../contract.js';

function renderKindFilterButtons(app: CatalogApi): Described[] {
    return [
        element('Button', {
            props: {
                class: 'btn-filter-all',
                style: () => ({
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--edge, #30363d)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    background: app.kindFilter() === 'all' ? 'var(--accent, #58a6ff)' : 'var(--surface, #21262d)',
                    color: app.kindFilter() === 'all' ? 'var(--on-accent, #0d1117)' : 'var(--ink, #e6edf3)',
                }),
            },
            intents: { activate: { action: command('catalog.setKindFilter', 'all') } },
            children: [text('All')],
        }),
        element('Button', {
            props: {
                class: 'btn-filter-application',
                style: () => ({
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--edge, #30363d)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    background: app.kindFilter() === 'application' ? 'var(--accent, #58a6ff)' : 'var(--surface, #21262d)',
                    color: app.kindFilter() === 'application' ? 'var(--on-accent, #0d1117)' : 'var(--ink, #e6edf3)',
                }),
            },
            intents: { activate: { action: command('catalog.setKindFilter', 'application') } },
            children: [text('Apps')],
        }),
        element('Button', {
            props: {
                class: 'btn-filter-extension',
                style: () => ({
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--edge, #30363d)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    background: app.kindFilter() === 'extension' ? 'var(--accent, #58a6ff)' : 'var(--surface, #21262d)',
                    color: app.kindFilter() === 'extension' ? 'var(--on-accent, #0d1117)' : 'var(--ink, #e6edf3)',
                }),
            },
            intents: { activate: { action: command('catalog.setKindFilter', 'extension') } },
            children: [text('Extensions')],
        }),
    ];
}

export function renderCatalogHeader(app: CatalogApi): Described {
    return element('Row', {
        props: {
            class: 'catalog-header',
            style: {
                padding: '12px 16px',
                background: 'var(--chrome, #161b22)',
                borderBottom: '1px solid var(--edge, #30363d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flex: '0 0 auto',
            },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                children: [
                    element('Heading', {
                        props: {
                            level: 1,
                            style: { margin: '0', fontSize: '18px', fontWeight: '600' },
                        },
                        children: [text('Catalog Browser')],
                    }),
                    element('Badge', {
                        props: {
                            style: {
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                background: 'var(--surface, #21262d)',
                                color: 'var(--ink-dim, #8b949e)',
                                border: '1px solid var(--edge, #30363d)',
                            },
                        },
                        children: [
                            text(() => `${String(app.filteredParts().length)} of ${String(app.parts().length)} parts`),
                        ],
                    }),
                    element('Span', {
                        props: {
                            class: 'catalog-live-indicator live-indicator',
                            style: () => ({
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                background: app.live() ? 'rgba(56, 139, 253, 0.15)' : 'var(--surface, #21262d)',
                                color: app.live() ? 'var(--accent, #58a6ff)' : 'var(--ink-dim, #8b949e)',
                                border: '1px solid var(--edge, #30363d)',
                            }),
                        },
                        children: [text(() => (app.live() ? '● live' : '○ not following'))],
                    }),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                children: [
                    element('Input', {
                        props: {
                            placeholder: 'Search parts, keywords, publisher...',
                            value: () => app.searchQuery(),
                            class: 'catalog-search-input',
                            style: {
                                padding: '5px 10px',
                                borderRadius: '6px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                width: '220px',
                                fontSize: '13px',
                            },
                        },
                        intents: {
                            change: { action: command('catalog.setSearch') },
                        },
                    }),
                    ...renderKindFilterButtons(app),
                ],
            }),
        ],
    });
}
