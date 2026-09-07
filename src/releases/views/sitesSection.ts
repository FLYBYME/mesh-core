import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { SiteFindOutputItem } from '../../generated/api.js';
import type { ReleasesApi } from '../contract.js';

function renderSiteItem(site: () => SiteFindOutputItem, app: ReleasesApi): Described {
    return element('Button', {
        props: {
            class: () => `site-item site-item-${site().host}${app.selectedHost() === site().host ? ' selected' : ''}`,
            style: () => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                width: '100%',
                padding: '8px 12px',
                marginBottom: '6px',
                borderRadius: '6px',
                border: app.selectedHost() === site().host
                    ? '1px solid var(--accent, #58a6ff)'
                    : '1px solid var(--edge, #30363d)',
                background: app.selectedHost() === site().host
                    ? 'rgba(88, 166, 255, 0.15)'
                    : 'var(--surface, #21262d)',
                cursor: 'pointer',
                textAlign: 'left',
                boxSizing: 'border-box',
                color: 'var(--ink, #e6edf3)',
            }),
        },
        intents: { activate: { action: command('releases.selectSite', site().host) } },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' } },
                children: [
                    element('Span', {
                        props: { bold: true, style: { fontSize: '13px' } },
                        children: [text(() => site().host)],
                    }),
                    element('Badge', {
                        props: {
                            style: {
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.06)',
                                color: 'var(--ink-dim, #8b949e)',
                            },
                        },
                        children: [text(() => site().application)],
                    }),
                ],
            }),
            element('Row', {
                props: { style: { marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' } },
                children: [
                    element('Span', { props: { style: { fontSize: '11px', color: 'var(--ink-dim, #8b949e)' } }, children: [text('Live Release:')] }),
                    element('Span', {
                        props: {
                            code: true,
                            style: {
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                color: site().releaseHash ? '#3fb950' : '#8b949e',
                            },
                        },
                        children: [text(() => (site().releaseHash ? site().releaseHash?.slice(0, 17) + '...' : 'None deployed'))],
                    }),
                ],
            }),
        ],
    });
}

export function renderSitesSection(app: ReleasesApi): Described {
    return element('Stack', {
        props: { style: { marginBottom: '20px' } },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                children: [
                    element('Heading', {
                        props: { level: 2, style: { margin: '0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--ink-dim, #8b949e)', letterSpacing: '0.5px' } },
                        children: [text(() => `Sites (${String(app.sites().length)})`)],
                    }),
                ],
            }),
            when(
                () => app.sitesStatus() === 'idle',
                () => element('Text', {
                    props: { class: 'sites-idle-message', style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', padding: '8px' } },
                    children: [text('Sign in to view scoped sites.')],
                }),
            ),
            when(
                () => app.sitesStatus() === 'loading',
                () => element('Text', {
                    props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', padding: '8px' } },
                    children: [text('Loading scoped sites...')],
                }),
            ),
            when(
                () => app.sitesStatus() === 'error',
                () => element('Card', {
                    props: {
                        class: 'sites-error-card',
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
                    children: [text(() => app.sitesError() ?? 'Failed to load sites')],
                }),
            ),
            each(
                () => app.sites(),
                (site) => site.host,
                (site) => renderSiteItem(site, app),
            ),
            when(
                () => (app.sitesStatus() === 'ready' || app.sitesStatus() === 'empty') && app.sites().length === 0,
                () => element('Text', {
                    props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', padding: '8px' } },
                    children: [text('No sites provisioned for this tenant.')],
                }),
            ),
        ],
    });
}
