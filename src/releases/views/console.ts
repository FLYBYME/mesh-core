import {
    element,
    text,
    when,
    type Node as Described,
    type ViewContext,
} from '@flybyme/mesh-web';

import type { ReleasesApi } from '../contract.js';
import { renderSitesSection } from './sitesSection.js';
import { renderReleasesSection } from './releasesSection.js';
import { renderSelectedReleaseCard } from './selectedReleaseCard.js';
import { renderComposerCard } from './composerCard.js';

function renderReleasesHeader(app: ReleasesApi): Described {
    return element('Row', {
        props: {
            class: 'releases-header',
            style: {
                padding: '12px 16px',
                background: 'var(--chrome, #161b22)',
                borderBottom: '1px solid var(--edge, #30363d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flex: '0 0 auto',
            },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                children: [
                    element('Heading', {
                        props: { level: 1, style: { margin: '0', fontSize: '18px', fontWeight: '600' } },
                        children: [text('Releases & Deployment Console')],
                    }),
                    element('Badge', {
                        props: {
                            style: {
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                background: 'rgba(88, 166, 255, 0.15)',
                                color: 'var(--accent, #58a6ff)',
                                border: '1px solid rgba(88, 166, 255, 0.3)',
                            },
                        },
                        children: [text('Tenant Scoped')],
                    }),
                    element('Span', {
                        props: {
                            class: 'releases-live-indicator live-indicator',
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
        ],
    });
}

function renderLeftPane(app: ReleasesApi): Described {
    return element('Stack', {
        props: {
            class: 'releases-sidebar',
            style: {
                display: 'flex',
                flexDirection: 'column',
                flex: '0 0 340px',
                borderRight: '1px solid var(--edge, #30363d)',
                background: 'var(--surface, #161b22)',
                boxSizing: 'border-box',
                height: '100%',
                overflow: 'hidden',
            },
        },
        children: [
            element('ScrollView', {
                props: {
                    orientation: 'vertical',
                    class: 'releases-sidebar-sites',
                    style: {
                        flex: '1 1 50%',
                        minHeight: '0',
                        padding: '12px',
                        boxSizing: 'border-box',
                    },
                },
                children: [
                    renderSitesSection(app),
                ],
            }),
            element('Divider', {
                props: {
                    orientation: 'horizontal',
                    style: { flex: '0 0 auto', margin: '0' },
                },
            }),
            element('ScrollView', {
                props: {
                    orientation: 'vertical',
                    class: 'releases-sidebar-releases',
                    style: {
                        flex: '1 1 50%',
                        minHeight: '0',
                        padding: '12px',
                        boxSizing: 'border-box',
                    },
                },
                children: [
                    renderReleasesSection(app),
                ],
            }),
        ],
    });
}

function renderNoReleaseCard(): Described {
    return element('Card', {
        props: {
            style: {
                padding: '24px',
                background: 'var(--chrome, #161b22)',
                borderRadius: '6px',
                border: '1px solid var(--edge, #30363d)',
                marginBottom: '20px',
                textAlign: 'center',
            },
        },
        children: [
            element('Heading', {
                props: { level: 2, style: { fontSize: '15px', color: 'var(--ink-dim, #8b949e)', margin: '0 0 6px 0' } },
                children: [text('No Release Selected')],
            }),
            element('Text', {
                props: { style: { fontSize: '12px', color: 'var(--ink-dim, #6e7681)' } },
                children: [text('Select a release from the list on the left to inspect its parts, deploy it to a site, or roll back.')],
            }),
        ],
    });
}

function renderRightPane(app: ReleasesApi, isLive: () => boolean): Described {
    return element('ScrollView', {
        props: {
            orientation: 'vertical',
            class: 'releases-details-pane',
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
                () => app.selectedRelease() !== null,
                () => renderSelectedReleaseCard(app, isLive),
                renderNoReleaseCard,
            ),
            renderComposerCard(app),
        ],
    });
}

export function renderReleasesView(vx: ViewContext<Record<string, never>, ReleasesApi>): Described {
    const app = vx.app;

    const isLive = (): boolean => {
        const s = app.selectedSite();
        const r = app.selectedRelease();
        return s !== null && r !== null && s.releaseHash === r.hash;
    };

    return element('Stack', {
        props: {
            class: 'releases-app-root',
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
            renderReleasesHeader(app),
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
                    renderLeftPane(app),
                    renderRightPane(app, isLive),
                ],
            }),
        ],
    });
}
