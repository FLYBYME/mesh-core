import {
    command,
    each,
    element,
    needs,
    provider,
    text,
    when,
    type Application,
    type CollectionStatus,
    type CommandDecl,
    type Context,
    type Json,
    type Node as Described,
    type ProviderToken,
    type ReadonlySignal,
    type Signal,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';

import {
    chromeApi,
    type CdnComposeInputPart,
    type CdnComposeOutput,
    type CdnDeployOutput,
    type ReleaseFindOutputItem,
    type SiteFindOutputItem,
} from '../generated/api.js';

export interface ReleasesApi {
    readonly sites: ReadonlySignal<readonly SiteFindOutputItem[]>;
    readonly selectedHost: Signal<string | null>;
    readonly selectedSite: () => SiteFindOutputItem | null;
    readonly releases: ReadonlySignal<readonly ReleaseFindOutputItem[]>;
    readonly selectedReleaseHash: Signal<string | null>;
    readonly selectedRelease: () => ReleaseFindOutputItem | null;
    readonly sitesStatus: ReadonlySignal<CollectionStatus>;
    readonly sitesError: () => string | null;
    readonly releasesStatus: ReadonlySignal<CollectionStatus>;
    readonly releasesError: () => string | null;

    readonly composeKernel: Signal<string>;
    readonly composeName: Signal<string>;
    readonly composePartsText: Signal<string>;
    readonly composeStatus: Signal<'idle' | 'composing' | 'success' | 'error'>;
    readonly composeResult: Signal<CdnComposeOutput | null>;
    readonly composeError: Signal<string | null>;

    readonly deployStatus: Signal<'idle' | 'deploying' | 'success' | 'error'>;
    readonly deployResult: Signal<CdnDeployOutput | null>;
    readonly deployError: Signal<string | null>;

    loadData(): Promise<void>;
    selectSite(host: string): void;
    selectRelease(hash: string): void;
    setComposeKernel(kernel: string): void;
    setComposeName(name: string): void;
    setComposePartsText(text: string): void;
    runCompose(dryRun: boolean): Promise<void>;
    runDeploy(host: string, releaseHash: string): Promise<void>;
}

export const RELEASES: ProviderToken<ReleasesApi> = provider<ReleasesApi>('releases');

const NEEDS = needs('models', 'mesh', 'state', 'commands', 'windows', 'log');

function parsePartsInput(raw: string): readonly CdnComposeInputPart[] {
    const lines = raw.split('\n');
    const result: CdnComposeInputPart[] = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) continue;
        const colon = trimmed.indexOf(':');
        if (colon > 0) {
            const id = trimmed.slice(0, colon).trim();
            const version = trimmed.slice(colon + 1).trim();
            if (id !== '' && version !== '') {
                const kind: 'application' | 'extension' = (id === 'chrome' || id === 'theme' || id === 'auth')
                    ? 'extension'
                    : 'application';
                result.push({ id, version, kind });
            }
        }
    }
    return result;
}

function renderReleasesView(vx: ViewContext<Record<string, never>, ReleasesApi>): Described {
    const app = vx.app;

    const header = element('Row', {
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
                ],
            }),
            element('Button', {
                props: {
                    class: 'btn-refresh-data',
                    style: {
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: 'var(--surface, #21262d)',
                        border: '1px solid var(--edge, #30363d)',
                        color: 'var(--ink, #e6edf3)',
                        cursor: 'pointer',
                        fontSize: '12px',
                    },
                },
                intents: { activate: { action: command('releases.refresh') } },
                children: [text('↻ Refresh')],
            }),
        ],
    });

    const sitesSection = element('Stack', {
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
                (site) => element('Button', {
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
                }),
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

    const releasesSection = element('Stack', {
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
                (rel) => {
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
                },
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

    const leftPane = element('ScrollView', {
        props: {
            orientation: 'vertical',
            class: 'releases-sidebar',
            style: {
                flex: '0 0 340px',
                borderRight: '1px solid var(--edge, #30363d)',
                background: 'var(--surface, #161b22)',
                padding: '12px',
                boxSizing: 'border-box',
                height: '100%',
            },
        },
        children: [
            sitesSection,
            element('Divider', { props: { orientation: 'horizontal', style: { marginBottom: '16px' } } }),
            releasesSection,
        ],
    });

    const isLive = (): boolean => {
        const s = app.selectedSite();
        const r = app.selectedRelease();
        return s !== null && r !== null && s.releaseHash === r.hash;
    };

    const selectedReleaseCard = (): Described => when(
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

                // Deploy / Rollback Action Block
                element('Card', {
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
                }),
            ],
        }),
    );

    const composerCard = (): Described => element('Card', {
        props: {
            class: 'release-composer-card',
            style: {
                padding: '16px',
                background: 'var(--chrome, #161b22)',
                border: '1px solid var(--edge, #30363d)',
                borderRadius: '6px',
            },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                children: [
                    element('Heading', {
                        props: { level: 2, style: { margin: '0', fontSize: '16px' } },
                        children: [text('Compose Release (cdn.compose)')],
                    }),
                    element('Badge', {
                        props: {
                            style: {
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(210, 153, 34, 0.15)',
                                color: '#d29922',
                                border: '1px solid rgba(210, 153, 34, 0.3)',
                            },
                        },
                        children: [text('Compose Before Deploy')],
                    }),
                ],
            }),
            element('Text', {
                props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', display: 'block', marginBottom: '14px', lineHeight: '1.4' } },
                children: [
                    text('Compose resolves version ranges, validates that parts hold together, and reports problems. Nothing goes live until cdn.deploy is called.'),
                ],
            }),
            element('Grid', {
                props: { columns: '140px 1fr', gap: 10, style: { marginBottom: '12px', alignItems: 'center' } },
                children: [
                    element('Span', { props: { bold: true, style: { fontSize: '12px' } }, children: [text('Release Label:')] }),
                    element('Input', {
                        props: {
                            class: 'input-compose-name',
                            value: () => app.composeName(),
                            placeholder: 'Human label for this release',
                            style: {
                                padding: '6px 10px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('releases.setComposeName') } },
                    }),
                    element('Span', { props: { bold: true, style: { fontSize: '12px' } }, children: [text('Kernel Range:')] }),
                    element('Input', {
                        props: {
                            class: 'input-compose-kernel',
                            value: () => app.composeKernel(),
                            placeholder: '^0.11',
                            style: {
                                padding: '6px 10px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontSize: '12px',
                                width: '120px',
                            },
                        },
                        intents: { change: { action: command('releases.setComposeKernel') } },
                    }),
                ],
            }),
            element('Stack', {
                props: { style: { marginBottom: '14px' } },
                children: [
                    element('Span', {
                        props: { bold: true, style: { fontSize: '12px', marginBottom: '4px', display: 'block' } },
                        children: [text('Parts & Version Requirements (one per line, "id: range"):')],
                    }),
                    element('TextArea', {
                        props: {
                            class: 'textarea-compose-parts',
                            value: () => app.composePartsText(),
                            placeholder: 'chrome: ^0.1.2\ncatalog: ^0.1.0\nreleases: ^0.1.0',
                            rows: 4,
                            style: {
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                boxSizing: 'border-box',
                            },
                        },
                        intents: { change: { action: command('releases.setComposeParts') } },
                    }),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '10px', marginBottom: '14px' } },
                children: [
                    element('Button', {
                        props: {
                            class: 'btn-dryrun-compose',
                            title: 'Inspect resolution without creating a release record',
                            style: {
                                padding: '7px 14px',
                                borderRadius: '6px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('releases.dryRunCompose') } },
                        children: [text(() => (app.composeStatus() === 'composing' ? 'Inspecting...' : '⚡ Inspect Resolution (Dry Run)'))],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-commit-compose',
                            title: 'Compose release and record immutable row',
                            style: {
                                padding: '7px 16px',
                                borderRadius: '6px',
                                background: 'var(--accent, #58a6ff)',
                                border: 'none',
                                color: 'var(--on-accent, #0d1117)',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('releases.commitCompose') } },
                        children: [text(() => (app.composeStatus() === 'composing' ? 'Composing...' : '✓ Compose Release'))],
                    }),
                ],
            }),
            when(
                () => app.composeStatus() === 'error',
                () => element('Card', {
                    props: {
                        class: 'compose-error-card',
                        style: {
                            padding: '10px 12px',
                            background: 'rgba(248, 81, 73, 0.1)',
                            border: '1px solid #f85149',
                            color: '#f85149',
                            borderRadius: '4px',
                            fontSize: '12px',
                        },
                    },
                    children: [text(() => app.composeError() ?? 'Composition error')],
                }),
            ),
            when(
                () => app.composeStatus() === 'success' && app.composeResult() !== null,
                () => {
                    const res = app.composeResult();
                    if (res === null) return element('EmptyNode');
                    const hasProblems = res.problems.length > 0;

                    return element('Stack', {
                        props: {
                            class: 'compose-result-box',
                            style: {
                                padding: '12px',
                                background: hasProblems ? 'rgba(248, 81, 73, 0.08)' : 'rgba(63, 185, 80, 0.08)',
                                border: hasProblems ? '1px solid #f85149' : '1px solid #3fb950',
                                borderRadius: '6px',
                                fontSize: '12px',
                            },
                        },
                        children: [
                            element('Row', {
                                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                                children: [
                                    element('Span', {
                                        props: { bold: true, style: { color: hasProblems ? '#f85149' : '#3fb950' } },
                                        children: [
                                            text(() => (hasProblems
                                                ? `Composition reported ${String(res.problems.length)} problem(s):`
                                                : `Composition valid: ${res.hash.slice(0, 20)}...${res.existed ? ' (existed)' : ''}`)),
                                        ],
                                    }),
                                ],
                            }),
                            when(
                                () => hasProblems,
                                () => element('Stack', {
                                    children: [
                                        each(
                                            () => res.problems,
                                            (prob) => `${prob.kind}:${prob.message}`,
                                            (prob) => element('Text', {
                                                props: { style: { color: '#f85149', marginBottom: '4px' } },
                                                children: [text(() => `• [${prob().kind}] ${prob().message}`)],
                                            }),
                                        ),
                                    ],
                                }),
                            ),
                            when(
                                () => !hasProblems,
                                () => element('Stack', {
                                    children: [
                                        element('Text', {
                                            children: [text(() => `Kernel: ${res.kernel.version} (${res.kernel.digest.slice(0, 16)}...)`)],
                                        }),
                                        each(
                                            () => Object.entries(res.parts),
                                            (entry) => entry[0],
                                            (entry) => element('Text', {
                                                children: [text(() => `• ${entry()[0]}: version ${entry()[1].version} (${entry()[1].digest.slice(0, 16)}...)`)],
                                            }),
                                        ),
                                    ],
                                }),
                            ),
                        ],
                    });
                },
            ),
        ],
    });

    const rightPane = element('ScrollView', {
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
                selectedReleaseCard,
                () => element('Card', {
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
                }),
            ),
            composerCard(),
        ],
    });

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
            header,
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
                    leftPane,
                    rightPane,
                ],
            }),
        ],
    });
}

export default class ReleasesApp implements Application<typeof NEEDS, readonly [], typeof RELEASES, typeof chromeApi> {
    readonly needs = NEEDS;
    readonly provides = RELEASES;
    readonly api = chromeApi;

    readonly commands: readonly CommandDecl[] = [
        { id: 'releases.refresh', title: 'Releases: Refresh Data' },
        { id: 'releases.selectSite', title: 'Releases: Select Site' },
        { id: 'releases.selectRelease', title: 'Releases: Select Release' },
        { id: 'releases.setComposeKernel', title: 'Releases: Set Kernel Range' },
        { id: 'releases.setComposeName', title: 'Releases: Set Release Name' },
        { id: 'releases.setComposeParts', title: 'Releases: Set Parts Text' },
        { id: 'releases.dryRunCompose', title: 'Releases: Dry Run Compose' },
        { id: 'releases.commitCompose', title: 'Releases: Commit Compose' },
        { id: 'releases.deployRelease', title: 'Releases: Deploy Release' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, ReleasesApi>[] = [
        {
            id: 'console',
            title: 'Releases & Deploy Console',
            render: renderReleasesView,
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly [], typeof chromeApi>): Promise<ReleasesApi> {
        const sites = cx.models('site');
        const selectedHost = cx.state.signal<string | null>(null);
        const releases = cx.models('release');
        const selectedReleaseHash = cx.state.signal<string | null>(null);

        const sitesError = cx.state.computed<string | null>(() => {
            const err = sites.error();
            if (err === null) return null;
            const detail = 'detail' in err && typeof err.detail === 'string'
                ? err.detail
                : err.kind;
            return `Failed to load sites (${err.kind}): ${detail}`;
        });

        const releasesError = cx.state.computed<string | null>(() => {
            const err = releases.error();
            if (err === null) return null;
            const detail = 'detail' in err && typeof err.detail === 'string'
                ? err.detail
                : err.kind;
            return `Failed to load releases (${err.kind}): ${detail}`;
        });

        const composeKernel = cx.state.signal<string>('^0.11');
        const composeName = cx.state.signal<string>('Console Release');
        const composePartsText = cx.state.signal<string>('chrome: ^0.1.2\ncatalog: ^0.1.0\nreleases: ^0.1.0');
        const composeStatus = cx.state.signal<'idle' | 'composing' | 'success' | 'error'>('idle');
        const composeResult = cx.state.signal<CdnComposeOutput | null>(null);
        const composeError = cx.state.signal<string | null>(null);

        const deployStatus = cx.state.signal<'idle' | 'deploying' | 'success' | 'error'>('idle');
        const deployResult = cx.state.signal<CdnDeployOutput | null>(null);
        const deployError = cx.state.signal<string | null>(null);

        const selectedSite = cx.state.computed<SiteFindOutputItem | null>(() => {
            const h = selectedHost();
            if (h === null) return null;
            for (const s of sites.rows()) {
                if (s.host === h) return s;
            }
            return null;
        });

        const selectedRelease = cx.state.computed<ReleaseFindOutputItem | null>(() => {
            const hash = selectedReleaseHash();
            if (hash === null) return null;
            for (const r of releases.rows()) {
                if (r.hash === hash) return r;
            }
            return null;
        });

        cx.state.effect(() => {
            const sRows = sites.rows();
            if (selectedHost() === null && sRows.length > 0) {
                const first = sRows[0];
                if (first !== undefined) {
                    selectedHost.set(first.host);
                }
            }
        });

        cx.state.effect(() => {
            const rRows = releases.rows();
            if (selectedReleaseHash() === null && rRows.length > 0) {
                const first = rRows[0];
                if (first !== undefined) {
                    selectedReleaseHash.set(first.hash);
                }
            }
        });

        const loadData = async (): Promise<void> => {
            await Promise.all([sites.refetch(), releases.refetch()]);
        };

        const selectSite = (host: string): void => {
            selectedHost.set(host);
            deployResult.set(null);
            deployError.set(null);
        };

        const selectRelease = (hash: string): void => {
            selectedReleaseHash.set(hash);
            deployResult.set(null);
            deployError.set(null);
        };

        const setComposeKernel = (kernel: string): void => {
            composeKernel.set(kernel);
        };

        const setComposeName = (name: string): void => {
            composeName.set(name);
        };

        const setComposePartsText = (textVal: string): void => {
            composePartsText.set(textVal);
        };

        const runCompose = async (dryRun: boolean): Promise<void> => {
            composeStatus.set('composing');
            composeError.set(null);
            composeResult.set(null);

            const parts = parsePartsInput(composePartsText());
            if (parts.length === 0) {
                composeStatus.set('error');
                composeError.set('No valid parts entered. Format: "id: range" (e.g. "chrome: ^0.1.2").');
                return;
            }

            const trimmedName = composeName().trim();
            const res = await cx.mesh.call('cdn.compose', {
                kernel: composeKernel().trim() === '' ? '^0.11' : composeKernel().trim(),
                parts,
                dryRun,
                ...(trimmedName !== '' ? { name: trimmedName } : {}),
            });

            if (res.ok) {
                composeResult.set(res.value);
                composeStatus.set('success');
                if (!dryRun) {
                    await releases.refetch();
                    selectedReleaseHash.set(res.value.hash);
                }
            } else {
                composeStatus.set('error');
                const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                    ? res.error.detail
                    : res.error.kind;
                composeError.set(`Composition failed (${res.error.kind}): ${detail}`);
            }
        };

        const runDeploy = async (host: string, releaseHash: string): Promise<void> => {
            deployStatus.set('deploying');
            deployError.set(null);
            deployResult.set(null);

            const res = await cx.mesh.call('cdn.deploy', { host, release: releaseHash });
            if (res.ok) {
                deployResult.set(res.value);
                deployStatus.set('success');
                await sites.refetch();
            } else {
                deployStatus.set('error');
                const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                    ? res.error.detail
                    : res.error.kind;
                deployError.set(`Deploy failed (${res.error.kind}): ${detail}`);
            }
        };

        cx.commands.implement('releases.refresh', async () => {
            await loadData();
        });

        cx.commands.implement('releases.selectSite', (val?: Json) => {
            if (typeof val === 'string') selectSite(val);
        });

        cx.commands.implement('releases.selectRelease', (val?: Json) => {
            if (typeof val === 'string') selectRelease(val);
        });

        cx.commands.implement('releases.setComposeKernel', (val?: Json) => {
            if (typeof val === 'string') setComposeKernel(val);
        });

        cx.commands.implement('releases.setComposeName', (val?: Json) => {
            if (typeof val === 'string') setComposeName(val);
        });

        cx.commands.implement('releases.setComposeParts', (val?: Json) => {
            if (typeof val === 'string') setComposePartsText(val);
        });

        cx.commands.implement('releases.dryRunCompose', async () => {
            await runCompose(true);
        });

        cx.commands.implement('releases.commitCompose', async () => {
            await runCompose(false);
        });

        cx.commands.implement('releases.deployRelease', async (hostVal?: Json, releaseVal?: Json) => {
            const h = typeof hostVal === 'string' && hostVal !== '' ? hostVal : selectedHost();
            const r = typeof releaseVal === 'string' && releaseVal !== '' ? releaseVal : selectedReleaseHash();
            if (h !== null && r !== null) {
                await runDeploy(h, r);
            }
        });

        await loadData();

        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'console' });
            }
        });

        return {
            sites: sites.rows,
            selectedHost,
            selectedSite,
            releases: releases.rows,
            selectedReleaseHash,
            selectedRelease,
            sitesStatus: sites.status,
            sitesError,
            releasesStatus: releases.status,
            releasesError,
            composeKernel,
            composeName,
            composePartsText,
            composeStatus,
            composeResult,
            composeError,
            deployStatus,
            deployResult,
            deployError,
            loadData,
            selectSite,
            selectRelease,
            setComposeKernel,
            setComposeName,
            setComposePartsText,
            runCompose,
            runDeploy,
        };
    }
}
