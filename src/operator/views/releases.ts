import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { ReleaseFindOutputItem, SiteFindOutputItem } from '../../generated/api.js';
import type { ReleasesFormSignals } from '../commands/releases.js';
import type { OperatorStateBundle } from '../state.js';
import {
    renderEmptyState,
    renderErrorBanner,
    renderLoadingSkeleton,
    renderRefusedControl,
    renderUnauthenticatedState,
} from './common.js';
import { renderReleasesComposer } from './releasesComposer.js';

function renderSiteItem(site: () => SiteFindOutputItem, state: OperatorStateBundle): Described {
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
            element('Text', { props: { style: { fontWeight: '500', fontSize: '13px' } }, children: [text(() => site().host)] }),
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

function renderReleaseItem(rel: () => ReleaseFindOutputItem, state: OperatorStateBundle): Described {
    return element('Row', {
        props: {
            class: () => `release-item release-item-${rel().hash.slice(0, 8)} ${state.selectedReleaseHash() === rel().hash ? 'selected-release' : ''}`,
            style: () => ({
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '4px',
                background: state.selectedReleaseHash() === rel().hash ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                color: state.selectedReleaseHash() === rel().hash ? 'var(--accent, #58a6ff)' : 'var(--ink, #e6edf3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }),
        },
        intents: { activate: { action: command('operator.selectRelease', rel().hash) } },
        children: [
            element('Text', { props: { style: { fontWeight: '500', fontSize: '13px' } }, children: [text(() => rel().name ?? rel().hash.slice(0, 12))] }),
            element('Badge', {
                props: { style: { fontSize: '10px', padding: '1px 6px', background: 'var(--surface, #21262d)', borderRadius: '10px' } },
                children: [text(() => rel().kernel?.version ?? 'kernel')],
            }),
        ],
    });
}

function renderDeployActionBox(state: OperatorStateBundle, forms: ReleasesFormSignals): Described {
    const selectedRel = () => state.releases().find((r) => r.hash === state.selectedReleaseHash()) ?? null;
    const selectedSite = () => state.sites().find((s) => s.host === state.selectedHost()) ?? null;
    const isLive = () => {
        const s = selectedSite();
        const r = selectedRel();
        return s !== null && r !== null && s.releaseHash === r.hash;
    };

    return element('Card', {
        props: {
            class: 'deploy-action-box',
            style: { padding: '16px', background: 'var(--surface, #161b22)', borderRadius: '6px', border: '1px solid var(--edge, #30363d)', marginBottom: '16px' },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                children: [
                    element('Stack', {
                        children: [
                            element('Heading', { props: { level: 3, style: { fontSize: '14px', margin: '0 0 4px 0' } }, children: [text('Deploy / Rollback (cdn.deploy)')] }),
                            element('Text', {
                                props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)' } },
                                children: [
                                    text(() => {
                                        const h = state.selectedHost();
                                        if (h === null) return 'Select a target site on the left to deploy.';
                                        if (isLive()) return `Site "${h}" is currently running this release.`;
                                        const s = selectedSite();
                                        if (s?.releaseHash) return `Roll back or deploy "${h}" to this release.`;
                                        return `Deploy release to "${h}".`;
                                    }),
                                ],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                        children: [
                            when(
                                () => state.selectedHost() !== null && !isLive(),
                                () => element('Button', {
                                    props: {
                                        class: 'btn-deploy-release',
                                        disabled: () => forms.deployStatus() === 'deploying',
                                        style: () => ({
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            background: selectedSite()?.releaseHash ? '#d29922' : '#238636',
                                            border: 'none',
                                            color: '#ffffff',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                        }),
                                    },
                                    intents: { activate: { action: command('operator.runDeploy') } },
                                    children: [
                                        text(() => {
                                            if (forms.deployStatus() === 'deploying') return 'Deploying…';
                                            if (selectedSite()?.releaseHash) return '↺ Roll Back to this Release';
                                            return 'Deploy to Site';
                                        }),
                                    ],
                                }),
                            ),
                            renderRefusedControl('Delete', 'internal #69'),
                        ],
                    }),
                ],
            }),
            when(
                () => forms.deployStatus() === 'error',
                () => element('Text', {
                    props: { class: 'deploy-error-msg', style: { color: '#f85149', fontSize: '12px', marginTop: '8px', display: 'block' } },
                    children: [text(() => forms.deployError() ?? 'Deployment failed')],
                }),
            ),
            when(
                () => forms.deployStatus() === 'success' && forms.deployResult() !== null,
                () => element('Text', {
                    props: { class: 'deploy-success-msg', style: { color: '#3fb950', fontSize: '12px', marginTop: '8px', display: 'block' } },
                    children: [text(() => `Deployment successful: ${forms.deployResult()?.release.slice(0, 16) ?? ''}`)],
                }),
            ),
        ],
    });
}

function renderReleaseDetailCard(state: OperatorStateBundle, forms: ReleasesFormSignals): Described {
    const rel = () => state.releases().find((r) => r.hash === state.selectedReleaseHash()) ?? null;

    return element('Stack', {
        children: [
            when(
                () => rel() !== null,
                () => element('Card', {
                    props: {
                        class: 'selected-release-card',
                        style: { padding: '16px', background: 'var(--chrome, #161b22)', borderRadius: '6px', border: '1px solid var(--edge, #30363d)', marginBottom: '16px' },
                    },
                    children: [
                        element('Row', {
                            props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                            children: [
                                element('Heading', { props: { level: 3, style: { margin: '0', fontSize: '15px' } }, children: [text(() => rel()?.name ?? 'Release')] }),
                                element('Badge', {
                                    props: { style: { fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--surface, #21262d)' } },
                                    children: [text(() => rel()?.kernel?.version ?? 'Kernel')],
                                }),
                            ],
                        }),
                        element('Text', {
                            props: { style: { fontSize: '11px', color: 'var(--ink-dim, #8b949e)', fontFamily: 'monospace', marginBottom: '12px', display: 'block' } },
                            children: [text(() => `Hash: ${rel()?.hash ?? ''}`)],
                        }),
                        renderDeployActionBox(state, forms),
                    ],
                }),
            ),
            renderReleasesComposer(state, forms),
        ],
    });
}

export function renderReleasesView(state: OperatorStateBundle, forms: ReleasesFormSignals): Described {
    return element('Stack', {
        props: { class: 'operator-view operator-view-releases', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        children: [
            when(() => state.effectiveState() === 'loading', () => renderLoadingSkeleton('Loading releases and sites…')),
            when(() => state.effectiveState() === 'unauthenticated', () => renderUnauthenticatedState()),
            when(() => state.effectiveState() === 'error', () => renderErrorBanner(state.errorMessage, state.refresh)),
            when(
                () => state.effectiveState() === 'empty',
                () => renderEmptyState('No releases found', 'Compose a new release using the form to populate immutable releases.'),
            ),
            when(
                () => state.effectiveState() === 'ready',
                () => element('Grid', {
                    props: { columns: '320px 1fr', gap: 16, style: { flex: '1 1 auto', overflow: 'hidden' } },
                    children: [
                        element('Stack', {
                            props: {
                                class: 'releases-sidebar',
                                style: { borderRight: '1px solid var(--edge, #30363d)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
                            },
                            children: [
                                element('Heading', { props: { level: 4, style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', padding: '8px 12px 4px' } }, children: [text('Sites')] }),
                                element('ScrollView', {
                                    props: { class: 'releases-sidebar-sites', orientation: 'vertical', style: { maxHeight: '180px', padding: '4px' } },
                                    children: [
                                        each<SiteFindOutputItem>(
                                            () => state.sites(),
                                            (s) => s.host,
                                            (s) => renderSiteItem(s, state),
                                        ),
                                    ],
                                }),
                                element('Heading', { props: { level: 4, style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', padding: '12px 12px 4px', borderTop: '1px solid var(--edge, #30363d)' } }, children: [text('Releases')] }),
                                element('ScrollView', {
                                    props: { class: 'releases-sidebar-releases', orientation: 'vertical', style: { flex: '1 1 auto', padding: '4px' } },
                                    children: [
                                        each<ReleaseFindOutputItem>(
                                            () => state.releases(),
                                            (r) => r.hash,
                                            (r) => renderReleaseItem(r, state),
                                        ),
                                    ],
                                }),
                            ],
                        }),
                        element('ScrollView', {
                            props: { orientation: 'vertical', style: { flex: '1 1 auto', padding: '16px' } },
                            children: [renderReleaseDetailCard(state, forms)],
                        }),
                    ],
                }),
            ),
        ],
    });
}
