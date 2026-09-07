import {
    command,
    each,
    element,
    text,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { PartVersionFindOutputItem } from '../../generated/api.js';
import type { CatalogApi } from '../contract.js';
import { UI_TABLE, UI_TABLE_ROW } from '../../ui/contract.js';
import { renderStateBadge } from './badges.js';

function renderVersionRow(v: () => PartVersionFindOutputItem, app: CatalogApi): Described {
    return element(UI_TABLE_ROW, {
        props: {
            class: () => `version-row version-row-${v().version}`,
            selected: () => app.selectedVersionNumber() === v().version,
        },
        intents: { activate: { action: command('catalog.selectVersion', v().version) } },
        children: [
            element('Span', {
                props: { bold: true },
                children: [text(() => v().version)],
            }),
            renderStateBadge(() => v().state),
            element('Span', {
                props: { code: true, style: { fontSize: '11px', fontFamily: 'monospace' } },
                children: [text(() => v().commit.slice(0, 10))],
            }),
            element('Span', {
                props: { style: { fontSize: '11px', color: 'var(--ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                children: [
                    text(() => `${v().repository ?? 'repo'}${v().subdirectory ? `/${v().subdirectory}` : ''}:${v().entry}`),
                ],
            }),
            element('Span', {
                props: { style: { fontSize: '11px', color: 'var(--ink-dim)' } },
                children: [text(() => v().publishedAt.slice(0, 10))],
            }),
        ],
    });
}

export function renderVersionTable(app: CatalogApi): Described {
    return element('Stack', {
        children: [
            element('Heading', {
                props: { level: 3, style: { margin: '0 0 8px 0', fontSize: '15px' } },
                children: [
                    text(() => `Published Versions (${String(app.versions().length)})`),
                ],
            }),
            element(UI_TABLE, {
                props: {
                    columns: '110px 90px 140px 1fr 140px',
                    headers: ['Version', 'State', 'Commit', 'Built From', 'Published'],
                    headerClass: 'version-grid-header',
                    rowsClass: 'version-grid-rows',
                    status: () => app.versionStatus(),
                    loadingMessage: 'Loading versions for selected part...',
                    errorMessage: () => app.versionErrorMessage() ?? 'Version load error',
                    emptyMessage: 'No published versions found for this part.',
                    count: () => app.versions().length,
                },
                children: [
                    each(
                        () => app.versions(),
                        (v) => v.version,
                        (v) => renderVersionRow(v, app),
                    ),
                ],
            }),
        ],
    });
}
