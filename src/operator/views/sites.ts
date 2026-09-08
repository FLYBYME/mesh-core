import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { SiteFindOutputItem } from '../../generated/api.js';
import type { SitesFormSignals } from '../commands/sites.js';
import type { OperatorStateBundle } from '../state.js';
import {
    renderEmptyState,
    renderErrorBanner,
    renderLoadingSkeleton,
    renderUnauthenticatedState,
} from './common.js';
import { renderSiteDetailCard } from './sitesDetail.js';

function renderSiteSidebarItem(site: () => SiteFindOutputItem, state: OperatorStateBundle): Described {
    return element('Row', {
        props: {
            class: () => `site-item site-item-${site().host} ${state.selectedHost() === site().host ? 'selected-site' : ''}`,
            style: () => ({
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '4px',
                background: state.selectedHost() === site().host ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                color: state.selectedHost() === site().host ? 'var(--accent, #58a6ff)' : 'var(--ink, #e6edf3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }),
        },
        intents: { activate: { action: command('operator.selectSite', site().host) } },
        children: [
            element('Stack', {
                children: [
                    element('Text', { props: { style: { fontWeight: '500', fontSize: '13px' } }, children: [text(() => site().host)] }),
                    element('Text', { props: { style: { fontSize: '11px', color: 'var(--ink-dim, #8b949e)', marginTop: '2px' } }, children: [text(() => site().title ?? site().application)] }),
                ],
            }),
            element('Badge', {
                props: {
                    class: 'site-release-badge',
                    style: () => ({
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: site().releaseHash ? 'rgba(63, 185, 80, 0.15)' : 'var(--surface, #21262d)',
                        color: site().releaseHash ? '#3fb950' : 'var(--ink-dim, #8b949e)',
                    }),
                },
                children: [text(() => {
                    const r = site().releaseHash;
                    return r ? r.slice(0, 10) : 'unreleased';
                })],
            }),
        ],
    });
}

export function renderSitesView(state: OperatorStateBundle, forms: SitesFormSignals): Described {
    return element('Stack', {
        props: { class: 'operator-view operator-view-sites', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        children: [
            when(() => state.effectiveState() === 'loading', () => renderLoadingSkeleton('Loading sites…')),
            when(() => state.effectiveState() === 'unauthenticated', () => renderUnauthenticatedState()),
            when(() => state.effectiveState() === 'error', () => renderErrorBanner(state.errorMessage, state.refresh)),
            when(
                () => state.effectiveState() === 'empty',
                () => renderEmptyState('No sites configured', 'Create a site using the form on the right.'),
            ),
            when(
                () => state.effectiveState() === 'ready',
                () => element('Grid', {
                    props: { columns: '320px 1fr', gap: 16, style: { flex: '1 1 auto', overflow: 'hidden' } },
                    children: [
                        element('Stack', {
                            props: {
                                class: 'sites-sidebar',
                                style: { borderRight: '1px solid var(--edge, #30363d)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
                            },
                            children: [
                                element('Heading', { props: { level: 4, style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', padding: '8px 12px 4px' } }, children: [text('Sites')] }),
                                element('ScrollView', {
                                    props: { class: 'sites-list', orientation: 'vertical', style: { flex: '1 1 auto', padding: '4px' } },
                                    children: [
                                        each<SiteFindOutputItem>(
                                            () => state.sites(),
                                            (s) => s.host,
                                            (s) => renderSiteSidebarItem(s, state),
                                        ),
                                    ],
                                }),
                            ],
                        }),
                        element('ScrollView', {
                            props: { orientation: 'vertical', style: { flex: '1 1 auto', padding: '16px' } },
                            children: [renderSiteDetailCard(state, forms)],
                        }),
                    ],
                }),
            ),
        ],
    });
}
