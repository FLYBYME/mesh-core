import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { ReleaseFindOutputItem } from '../../generated/api.js';
import type { ReleasesApi } from '../contract.js';

function renderReleaseItem(rel: () => ReleaseFindOutputItem, app: ReleasesApi): Described {
    const isLiveOnSelected = (): boolean => {
        const s = app.selectedSite();
        return s !== null && s.releaseHash === rel().hash;
    };
    return element('Button', {
        props: {
            class: () => `release-item release-item-${rel().hash}${app.selectedReleaseHash() === rel().hash ? ' selected' : ''}`,
            style: () => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                width: '100%',
                padding: '8px 12px',
                marginBottom: '6px',
                borderRadius: '6px',
                border: app.selectedReleaseHash() === rel().hash
                    ? '1px solid var(--accent, #58a6ff)'
                    : '1px solid var(--edge, #30363d)',
                background: app.selectedReleaseHash() === rel().hash
                    ? 'rgba(88, 166, 255, 0.15)'
                    : 'var(--surface, #21262d)',
                cursor: 'pointer',
                textAlign: 'left',
                boxSizing: 'border-box',
                color: 'var(--ink, #e6edf3)',
            }),
        },
        intents: { activate: { action: command('releases.selectRelease', rel().hash) } },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' } },
                children: [
                    element('Span', {
                        props: { bold: true, style: { fontSize: '13px' } },
                        children: [text(() => (rel().name && rel().name !== '' ? rel().name ?? '' : 'Unnamed Release'))],
                    }),
                    when(
                        isLiveOnSelected,
                        () => element('Badge', {
                            props: {
                                style: {
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: '#238636',
                                    color: '#ffffff',
                                },
                            },
                            children: [text('✓ LIVE')],
                        }),
                    ),
                ],
            }),
            element('Span', {
                props: {
                    code: true,
                    style: {
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#58a6ff',
                        marginTop: '2px',
                    },
                },
                children: [text(() => rel().hash.slice(0, 20) + '...')],
            }),
            element('Row', {
                props: { style: { marginTop: '4px', fontSize: '11px', color: 'var(--ink-dim, #8b949e)', display: 'flex', gap: '8px' } },
                children: [
                    element('Span', { children: [text(() => `Kernel: ${rel().kernel.version}`)] }),
                    element('Span', { children: [text(() => `Parts: ${String(Object.keys(rel().parts).length)}`)] }),
                    element('Span', { children: [text(() => rel().composedAt.slice(0, 10))] }),
                ],
            }),
        ],
    });
}

export function renderReleasesSection(app: ReleasesApi): Described {
    return element('Stack', {
        props: { style: { marginBottom: '20px' } },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                children: [
                    element('Heading', {
                        props: { level: 2, style: { margin: '0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--ink-dim, #8b949e)', letterSpacing: '0.5px' } },
                        children: [text(() => `Releases (${String(app.releases().length)})`)],
                    }),
                ],
            }),
            when(
                () => app.releasesStatus() === 'loading',
                () => element('Text', {
                    props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', padding: '8px' } },
                    children: [text('Loading scoped releases...')],
                }),
            ),
            when(
                () => app.releasesStatus() === 'error',
                () => element('Card', {
                    props: {
                        class: 'releases-error-card',
                        style: {
                            padding: '8px 12px',
                            background: 'rgba(248, 81, 73, 0.1)',
                            border: '1px solid #f85149',
                            color: '#f85149',
                            borderRadius: '6px',
                            fontSize: '12px',
                            marginBottom: '8px',
                        },
                    },
                    children: [text(() => app.releasesError() ?? 'Failed to load releases')],
                }),
            ),
            each(
                () => app.releases(),
                (rel) => rel.hash,
                (rel) => renderReleaseItem(rel, app),
            ),
            when(
                () => (app.releasesStatus() === 'ready' || app.releasesStatus() === 'empty') && app.releases().length === 0,
                () => element('Text', {
                    props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', padding: '8px' } },
                    children: [text('No releases composed yet. Use the composer on the right.')],
                }),
            ),
        ],
    });
}
