import {
    each,
    element,
    text,
    when,
    type Node as Described,
    type ViewContext,
} from '@flybyme/mesh-web';

import type { CatalogApi } from '../contract.js';
import type { PartFindOutputItem } from '../../generated/api.js';
import { renderKindBadge } from './badges.js';
import { renderCatalogHeader } from './header.js';
import { renderPartsList } from './partsList.js';
import { renderVersionTable } from './versionTable.js';
import { renderVersionProvenanceCard } from './versionProvenanceCard.js';
import { renderRangeResolverCard } from './rangeResolverCard.js';

/**
 * Every field reads through `app.selectedPart()` **at render time**, never from a value captured
 * when the description was built.
 *
 * This panel froze on whichever part was selected first, while the version table beside it updated
 * correctly. The cause is the pair of things above and below: the call site is
 * `when(() => app.selectedPart() !== null, () => renderPartDetails(app), …)`, and `when` rebuilds
 * its branch only when the **boolean** changes. Selecting a different part keeps it `true`, so the
 * branch is never rebuilt — and `const p = app.selectedPart()` had already baked one part's values
 * into static text.
 *
 * `Reactive<T> = T | (() => T)` permits both, which is what makes this easy to get wrong: a plain
 * value compiles and renders, and is simply never read again.
 */
function renderPartDetails(app: CatalogApi): Described {
    const part = (): PartFindOutputItem | null => app.selectedPart();
    const str = (pick: (p: PartFindOutputItem) => string | undefined): (() => string) =>
        () => { const p = part(); return p === null ? '' : pick(p) ?? ''; };

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
                                children: [text(str((p) => p.name))],
                            }),
                            renderKindBadge(str((p) => p.kind)),
                        ],
                    }),
                    element('Span', {
                        props: { style: { fontSize: '13px', color: 'var(--ink-dim, #8b949e)' } },
                        children: [text(str((p) => `Published by: ${p.publisher}`))],
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
                children: [text(str((p) => p.description ?? 'No description provided.'))],
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
                        children: [text(str((p) => `Repository: ${p.repository}`))],
                    }),
                    when(
                        () => part()?.license !== undefined,
                        () => element('Span', { children: [text(str((p) => `License: ${p.license ?? ''}`))] }),
                    ),
                    when(
                        () => part()?.homepage !== undefined,
                        () => element('Span', { children: [text(str((p) => `Homepage: ${p.homepage ?? ''}`))] }),
                    ),
                ],
            }),
            when(
                () => { const p = part(); return p !== null && p.keywords !== undefined && p.keywords.length > 0; },
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
                        each<string>(
                            () => part()?.keywords ?? [],
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
