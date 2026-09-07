import {
    each,
    element,
    text,
    when,
    type Node as Described,
    type ViewContext,
} from '@flybyme/mesh-web';

import type { CatalogApi } from '../contract.js';
import { renderKindBadge } from './badges.js';
import { renderCatalogHeader } from './header.js';
import { renderPartsList } from './partsList.js';
import { renderVersionTable } from './versionTable.js';
import { renderVersionProvenanceCard } from './versionProvenanceCard.js';
import { renderRangeResolverCard } from './rangeResolverCard.js';

function renderPartDetails(app: CatalogApi): Described {
    const p = app.selectedPart();
    if (p === null) return element('EmptyNode');
    return element('Stack', {
        children: [
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                        children: [
                            element('Heading', {
                                props: { level: 2, style: { margin: '0', fontSize: '22px' } },
                                children: [text(p.name)],
                            }),
                            renderKindBadge(() => p.kind),
                        ],
                    }),
                    element('Span', {
                        props: { style: { fontSize: '13px', color: 'var(--ink-dim, #8b949e)' } },
                        children: [text(`Published by: ${p.publisher}`)],
                    }),
                ],
            }),
            element('Text', {
                props: {
                    style: {
                        fontSize: '14px',
                        lineHeight: '1.5',
                        marginBottom: '14px',
                        color: 'var(--ink, #e6edf3)',
                    },
                },
                children: [text(p.description ?? 'No description provided.')],
            }),
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        gap: '16px',
                        fontSize: '12px',
                        color: 'var(--ink-dim, #8b949e)',
                        marginBottom: '16px',
                    },
                },
                children: [
                    element('Span', {
                        children: [text(`Repository: ${p.repository}`)],
                    }),
                    when(
                        () => p.license !== undefined,
                        () => element('Span', { children: [text(`License: ${p.license ?? ''}`)] }),
                    ),
                    when(
                        () => p.homepage !== undefined,
                        () => element('Span', { children: [text(`Homepage: ${p.homepage ?? ''}`)] }),
                    ),
                ],
            }),
            when(
                () => p.keywords !== undefined && p.keywords.length > 0,
                () => element('Row', {
                    props: {
                        style: {
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            marginBottom: '16px',
                        },
                    },
                    children: [
                        each(
                            () => p.keywords ?? [],
                            (kw) => kw,
                            (kw) => element('Badge', {
                                props: {
                                    style: {
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        background: 'var(--surface, #21262d)',
                                        border: '1px solid var(--edge, #30363d)',
                                        color: 'var(--ink-dim, #8b949e)',
                                    },
                                },
                                children: [text(kw)],
                            }),
                        ),
                    ],
                }),
            ),
            element('Divider', { props: { orientation: 'horizontal', style: { marginBottom: '16px' } } }),
            renderVersionTable(app),
            renderVersionProvenanceCard(app),
            element('Divider', { props: { orientation: 'horizontal', style: { marginBottom: '16px' } } }),
            renderRangeResolverCard(app),
        ],
    });
}

function renderNoPartSelectedPlaceholder(): Described {
    return element('Stack', {
        props: { style: { padding: '40px 20px', alignItems: 'center' } },
        children: [
            element('Heading', {
                props: { level: 2, style: { color: 'var(--ink-dim, #8b949e)' } },
                children: [text('Select a part from the catalog list to browse its versions and details.')],
            }),
        ],
    });
}

function renderRightDetailsPane(app: CatalogApi): Described {
    return element('ScrollView', {
        props: {
            orientation: 'vertical',
            class: 'catalog-part-details',
            style: {
                flex: '1 1 auto',
                padding: '20px 24px',
                boxSizing: 'border-box',
                height: '100%',
                background: 'var(--page, #0d1117)',
            },
        },
        children: [
            when(
                () => app.selectedPart() !== null,
                () => renderPartDetails(app),
                renderNoPartSelectedPlaceholder,
            ),
        ],
    });
}

export function renderCatalogView(vx: ViewContext<Record<string, never>, CatalogApi>): Described {
    const app = vx.app;

    return element('Stack', {
        props: {
            class: 'catalog-app-root',
            style: {
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                boxSizing: 'border-box',
                background: 'var(--page, #0d1117)',
                color: 'var(--ink, #e6edf3)',
            },
        },
        children: [
            renderCatalogHeader(app),
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        flex: '1 1 auto',
                        height: 'calc(100% - 56px)',
                        overflow: 'hidden',
                    },
                },
                children: [
                    renderPartsList(app),
                    renderRightDetailsPane(app),
                ],
            }),
        ],
    });
}
