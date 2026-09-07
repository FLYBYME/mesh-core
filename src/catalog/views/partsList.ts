import {
    command,
    each,
    element,
    text,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { PartFindOutputItem } from '../../generated/api.js';
import type { CatalogApi } from '../contract.js';
import { UI_ENTITY_ITEM, UI_ENTITY_LIST } from '../../ui/contract.js';
import { renderKindBadge } from './badges.js';

function renderPartItem(part: () => PartFindOutputItem, app: CatalogApi): Described {
    return element(UI_ENTITY_ITEM, {
        props: {
            class: () => `part-item part-item-${part().name}`,
            selected: () => app.selectedPartName() === part().name,
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
                        props: { bold: true, style: { fontSize: '14px', color: 'var(--ink)' } },
                        children: [text(() => part().name)],
                    }),
                    renderKindBadge(() => part().kind),
                ],
            }),
            element('Text', {
                props: {
                    style: {
                        fontSize: '12px',
                        color: 'var(--ink-dim)',
                        marginBottom: '4px',
                        lineHeight: '1.4',
                    },
                },
                children: [text(() => part().description ?? 'No description provided')],
            }),
            element('Span', {
                props: {
                    style: { fontSize: '11px', color: 'var(--ink-dim)' },
                },
                children: [text(() => `Publisher: ${part().publisher}`)],
            }),
        ],
    });
}

export function renderPartsList(app: CatalogApi): Described {
    return element(UI_ENTITY_LIST, {
        props: {
            class: 'catalog-parts-list',
            status: () => app.status(),
            loadingMessage: 'Loading catalog parts...',
            errorMessage: () => app.errorMessage() ?? 'Unknown catalog error',
            errorClass: 'catalog-error-card',
            emptyMessage: 'No parts match the search criteria.',
            count: () => app.filteredParts().length,
        },
        children: [
            each(
                () => app.filteredParts(),
                (part) => part.name,
                (part) => renderPartItem(part, app),
            ),
        ],
    });
}
