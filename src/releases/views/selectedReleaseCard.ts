import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { ReleasesApi } from '../contract.js';

function renderDeployActionBox(app: ReleasesApi, isLive: () => boolean): Described {
    return element('Card', {
        props: {
            class: 'deploy-action-box',
            style: {
                padding: '12px 14px',
                background: 'var(--surface, #21262d)',
                borderRadius: '6px',
                border: '1px solid var(--edge, #30363d)',
            },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                children: [
                    element('Stack', {
                        children: [
                            element('Span', {
                                props: { bold: true, style: { fontSize: '13px' } },
                                children: [
                                    text(() => {
                                        const curHost = app.selectedHost();
                                        if (curHost === null) return 'Select a target site on the left to deploy or roll back.';
                                        if (isLive()) return `Site "${curHost}" is currently running this release.`;
                                        const curSite = app.selectedSite();
                                        if (curSite?.releaseHash) return `Roll back or deploy "${curHost}" to this release.`;
                                        return `Deploy release to "${curHost}".`;
                                    }),
                                ],
                            }),
                            element('Text', {
                                props: { style: { fontSize: '11px', color: 'var(--ink-dim, #8b949e)', marginTop: '2px' } },
                                children: [
                                    text('Deploying writes site.releaseHash. Rollback is the exact same call backwards.'),
                                ],
                            }),
                        ],
                    }),
                    when(
                        () => app.selectedHost() !== null && !isLive(),
                        () => element('Button', {
                            props: {
                                class: 'btn-deploy-release',
                                style: () => ({
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    background: app.selectedSite()?.releaseHash ? '#d29922' : '#238636',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }),
                            },
                            intents: {
                                activate: {
                                    action: command('releases.deployRelease'),
                                },
                            },
                            children: [
                                text(() => {
                                    if (app.deployStatus() === 'deploying') return 'Deploying...';
                                    if (app.selectedSite()?.releaseHash) return '↺ Roll Back to this Release';
                                    return 'Deploy to Site';
                                }),
                            ],
                        }),
                    ),
                ],
            }),
            when(
                () => app.deployStatus() === 'error',
                () => element('Text', {
                    props: {
                        class: 'deploy-error-msg',
                        style: { color: '#f85149', fontSize: '12px', marginTop: '8px', display: 'block' },
                    },
                    children: [text(() => app.deployError() ?? 'Deployment failed')],
                }),
            ),
            when(
                () => app.deployStatus() === 'success' && app.deployResult() !== null,
                () => element('Row', {
                    props: {
                        class: 'deploy-success-msg',
                        style: {
                            marginTop: '8px',
                            padding: '6px 10px',
                            background: 'rgba(63, 185, 80, 0.1)',
                            border: '1px solid #3fb950',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#3fb950',
                        },
                    },
                    children: [
                        text(() => {
                            const res = app.deployResult();
                            return res ? `Successfully pointed ${res.host} at ${res.release.slice(0, 16)}... (changed: ${String(res.changed)})` : '';
                        }),
                    ],
                }),
            ),
        ],
    });
}

function renderIncludedParts(app: ReleasesApi): Described[] {
    return [
        element('Heading', {
            props: { level: 3, style: { margin: '0 0 6px 0', fontSize: '13px', color: 'var(--ink-dim, #8b949e)' } },
            children: [text('Included Parts:')],
        }),
        element('Grid', {
            props: {
                columns: '120px 100px 1fr',
                gap: 6,
                class: 'parts-grid-header',
                style: {
                    padding: '6px 10px',
                    background: 'var(--surface, #21262d)',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    color: 'var(--ink-dim, #8b949e)',
                    borderRadius: '4px 4px 0 0',
                },
            },
            children: [
                element('Text', { children: [text('Part')] }),
                element('Text', { children: [text('Version')] }),
                element('Text', { children: [text('Artifact Digest')] }),
            ],
        }),
        element('Stack', {
            props: {
                style: {
                    border: '1px solid var(--edge, #30363d)',
                    borderTop: '0',
                    borderRadius: '0 0 4px 4px',
                    marginBottom: '16px',
                    background: 'var(--page, #0d1117)',
                },
            },
            children: [
                each(
                    () => {
                        const rel = app.selectedRelease();
                        return rel ? Object.entries(rel.parts) : [];
                    },
                    (entry) => entry[0],
                    (entry) => element('Grid', {
                        props: {
                            columns: '120px 100px 1fr',
                            gap: 6,
                            style: {
                                padding: '6px 10px',
                                fontSize: '11px',
                                borderBottom: '1px solid var(--edge, #30363d)',
                                alignItems: 'center',
                            },
                        },
                        children: [
                            element('Span', { props: { bold: true }, children: [text(() => entry()[0])] }),
                            element('Span', { children: [text(() => entry()[1].version)] }),
                            element('Span', {
                                props: { code: true, style: { fontFamily: 'monospace', color: 'var(--ink-dim, #8b949e)' } },
                                children: [text(() => entry()[1].digest)],
                            }),
                        ],
                    }),
                ),
            ],
        }),
    ];
}

export function renderSelectedReleaseCard(app: ReleasesApi, isLive: () => boolean): Described {
    return when(
        () => app.selectedRelease() !== null,
        () => element('Card', {
            props: {
                class: 'selected-release-card',
                style: {
                    padding: '16px',
                    background: 'var(--chrome, #161b22)',
                    border: '1px solid var(--edge, #30363d)',
                    borderRadius: '6px',
                    marginBottom: '20px',
                },
            },
            children: [
                element('Row', {
                    props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
                    children: [
                        element('Heading', {
                            props: { level: 2, style: { margin: '0', fontSize: '18px' } },
                            children: [text(() => {
                                const rel = app.selectedRelease();
                                return rel?.name && rel.name !== '' ? rel.name : 'Selected Release';
                            })],
                        }),
                        when(
                            isLive,
                            () => element('Badge', {
                                props: {
                                    style: {
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        background: '#238636',
                                        color: '#ffffff',
                                        fontWeight: 'bold',
                                        fontSize: '11px',
                                    },
                                },
                                children: [text(() => `✓ Live on ${app.selectedSite()?.host ?? ''}`)],
                            }),
                        ),
                    ],
                }),
                element('Grid', {
                    props: { columns: '140px 1fr', gap: 6, style: { fontSize: '12px', marginBottom: '14px' } },
                    children: [
                        element('Span', { props: { bold: true }, children: [text('Release Hash:')] }),
                        element('Span', {
                            props: { code: true, style: { fontFamily: 'monospace', color: '#58a6ff' } },
                            children: [text(() => app.selectedRelease()?.hash ?? '')],
                        }),
                        element('Span', { props: { bold: true }, children: [text('Kernel Version:')] }),
                        element('Span', {
                            children: [text(() => {
                                const rel = app.selectedRelease();
                                return rel ? `${rel.kernel.version} (digest: ${rel.kernel.digest.slice(0, 14)}...)` : '';
                            })],
                        }),
                        element('Span', { props: { bold: true }, children: [text('Composed At:')] }),
                        element('Span', { children: [text(() => app.selectedRelease()?.composedAt ?? '')] }),
                        element('Span', { props: { bold: true }, children: [text('Required Contracts:')] }),
                        element('Span', {
                            children: [text(() => {
                                const rel = app.selectedRelease();
                                return rel?.requires && rel.requires.length > 0 ? rel.requires.join(', ') : 'None';
                            })],
                        }),
                    ],
                }),
                ...renderIncludedParts(app),
                renderDeployActionBox(app, isLive),
            ],
        }),
    );
}
