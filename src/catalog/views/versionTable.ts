import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { PartVersionFindOutputItem } from '../../generated/api.js';
import type { CatalogApi } from '../contract.js';
import { renderStateBadge } from './badges.js';

function renderVersionRow(v: () => PartVersionFindOutputItem, app: CatalogApi): Described {
    return element('Button', {
        props: {
            class: () => `version-row version-row-${v().version}${app.selectedVersionNumber() === v().version ? ' active-version' : ''}`,
            style: () => ({
                display: 'grid',
                gridTemplateColumns: '110px 90px 140px 1fr 140px',
                gap: '6px',
                padding: '8px 12px',
                borderBottom: '1px solid var(--edge, #30363d)',
                background: app.selectedVersionNumber() === v().version
                    ? 'rgba(88, 166, 255, 0.15)'
                    : 'transparent',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                alignItems: 'center',
                cursor: 'pointer',
                color: 'var(--ink, #e6edf3)',
                fontSize: '12px',
            }),
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
                props: { style: { fontSize: '11px', color: 'var(--ink-dim, #8b949e)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                children: [
                    text(() => `${v().repository ?? 'repo'}${v().subdirectory ? `/${v().subdirectory}` : ''}:${v().entry}`),
                ],
            }),
            element('Span', {
                props: { style: { fontSize: '11px', color: 'var(--ink-dim, #6e7681)' } },
                children: [text(() => v().publishedAt.slice(0, 10))],
            }),
        ],
    });
}

export function renderVersionTable(app: CatalogApi): Described {
    return element('Stack', {
        props: { style: { width: '100%', marginBottom: '20px' } },
        children: [
            element('Heading', {
                props: { level: 3, style: { margin: '0 0 8px 0', fontSize: '15px' } },
                children: [
                    text(() => `Published Versions (${String(app.versions().length)})`),
                ],
            }),
            when(
                () => app.versionStatus() === 'loading',
                () => element('Text', {
                    props: { style: { padding: '8px 0', color: 'var(--ink-dim, #8b949e)', display: 'block' } },
                    children: [text('Loading versions for selected part...')],
                }),
            ),
            when(
                () => app.versionStatus() === 'error',
                () => element('Card', {
                    props: {
                        style: {
                            padding: '8px 12px',
                            background: 'rgba(248, 81, 73, 0.1)',
                            border: '1px solid #f85149',
                            color: '#f85149',
                            borderRadius: '6px',
                        },
                    },
                    children: [text(() => app.versionErrorMessage() ?? 'Version load error')],
                }),
            ),
            element('Grid', {
                props: {
                    columns: '110px 90px 140px 1fr 140px',
                    gap: 6,
                    class: 'version-grid-header',
                    style: {
                        padding: '8px 12px',
                        background: 'var(--chrome, #161b22)',
                        borderBottom: '1px solid var(--edge, #30363d)',
                        borderRadius: '6px 6px 0 0',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: 'var(--ink-dim, #8b949e)',
                        alignItems: 'center',
                    },
                },
                children: [
                    element('Text', { children: [text('Version')] }),
                    element('Text', { children: [text('State')] }),
                    element('Text', { children: [text('Commit')] }),
                    element('Text', { children: [text('Built From')] }),
                    element('Text', { children: [text('Published')] }),
                ],
            }),
            element('Stack', {
                props: {
                    class: 'version-grid-rows',
                    style: {
                        border: '1px solid var(--edge, #30363d)',
                        borderTop: '0',
                        borderRadius: '0 0 6px 6px',
                        background: 'var(--surface, #21262d)',
                    },
                },
                children: [
                    each(
                        () => app.versions(),
                        (v) => v.version,
                        (v) => renderVersionRow(v, app),
                    ),
                    when(
                        () => (app.versionStatus() === 'ready' || app.versionStatus() === 'empty') && app.versions().length === 0,
                        () => element('Text', {
                            props: { style: { padding: '16px', color: 'var(--ink-dim, #8b949e)', display: 'block' } },
                            children: [text('No published versions found for this part.')],
                        }),
                    ),
                ],
            }),
        ],
    });
}
