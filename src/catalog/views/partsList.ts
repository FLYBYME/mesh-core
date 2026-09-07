import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { PartFindOutputItem } from '../../generated/api.js';
import type { CatalogApi } from '../contract.js';
import { renderKindBadge } from './badges.js';

function renderPartItem(part: () => PartFindOutputItem, app: CatalogApi): Described {
    return element('Button', {
        props: {
            class: () => `part-item part-item-${part().name}${app.selectedPartName() === part().name ? ' selected' : ''}`,
            style: () => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                width: '100%',
                padding: '10px 12px',
                marginBottom: '6px',
                borderRadius: '6px',
                border: app.selectedPartName() === part().name
                    ? '1px solid var(--accent, #58a6ff)'
                    : '1px solid transparent',
                background: app.selectedPartName() === part().name
                    ? 'rgba(88, 166, 255, 0.12)'
                    : 'var(--surface, #21262d)',
                cursor: 'pointer',
                textAlign: 'left',
                boxSizing: 'border-box',
            }),
        },
        intents: { activate: { action: command('catalog.selectPart', part().name) } },
        children: [
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        marginBottom: '4px',
                    },
                },
                children: [
                    element('Span', {
                        props: { bold: true, style: { fontSize: '14px', color: 'var(--ink, #e6edf3)' } },
                        children: [text(() => part().name)],
                    }),
                    renderKindBadge(() => part().kind),
                ],
            }),
            element('Text', {
                props: {
                    style: {
                        fontSize: '12px',
                        color: 'var(--ink-dim, #8b949e)',
                        marginBottom: '4px',
                        lineHeight: '1.4',
                    },
                },
                children: [text(() => part().description ?? 'No description provided')],
            }),
            element('Span', {
                props: {
                    style: { fontSize: '11px', color: 'var(--ink-dim, #6e7681)' },
                },
                children: [text(() => `Publisher: ${part().publisher}`)],
            }),
        ],
    });
}

export function renderPartsList(app: CatalogApi): Described {
    return element('ScrollView', {
        props: {
            orientation: 'vertical',
            class: 'catalog-parts-list',
            style: {
                flex: '0 0 320px',
                borderRight: '1px solid var(--edge, #30363d)',
                background: 'var(--surface, #161b22)',
                padding: '8px',
                boxSizing: 'border-box',
                height: '100%',
            },
        },
        children: [
            when(
                () => app.status() === 'loading',
                () => element('Text', {
                    props: { style: { padding: '16px', color: 'var(--ink-dim, #8b949e)', display: 'block' } },
                    children: [text('Loading catalog parts...')],
                }),
            ),
            when(
                () => app.status() === 'error',
                () => element('Card', {
                    props: {
                        class: 'catalog-error-card',
                        style: {
                            padding: '12px',
                            margin: '8px',
                            borderRadius: '6px',
                            background: 'rgba(248, 81, 73, 0.1)',
                            border: '1px solid #f85149',
                            color: '#f85149',
                        },
                    },
                    children: [
                        element('Text', {
                            children: [text(() => app.errorMessage() ?? 'Unknown catalog error')],
                        }),
                    ],
                }),
            ),
            each(
                () => app.filteredParts(),
                (part) => part.name,
                (part) => renderPartItem(part, app),
            ),
            when(
                () => (app.status() === 'ready' || app.status() === 'empty') && app.filteredParts().length === 0,
                () => element('Text', {
                    props: { style: { padding: '24px 16px', color: 'var(--ink-dim, #8b949e)', display: 'block' } },
                    children: [text('No parts match the search criteria.')],
                }),
            ),
        ],
    });
}
