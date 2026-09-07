import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
    type ViewContext,
} from '@flybyme/mesh-web';

import type { CatalogApi } from '../contract.js';

function renderKindBadge(kind: () => string): Described {
    return element('Badge', {
        props: {
            class: 'part-kind-badge',
            style: () => {
                const k = kind();
                const bg = k === 'kernel' ? '#8957e5' : k === 'application' ? '#1f6feb' : '#238636';
                return {
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: '#ffffff',
                    backgroundColor: bg,
                    display: 'inline-block',
                };
            },
        },
        children: [text(kind)],
    });
}

function renderStateBadge(state: () => string): Described {
    return element('Badge', {
        props: {
            class: 'version-state-badge',
            style: () => {
                const s = state();
                const bg = s === 'built' ? '#238636' : s === 'declared' ? '#9e6a03' : '#da3633';
                return {
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#ffffff',
                    backgroundColor: bg,
                    display: 'inline-block',
                };
            },
        },
        children: [text(state)],
    });
}

export function renderCatalogView(vx: ViewContext<Record<string, never>, CatalogApi>): Described {
    const app = vx.app;

    const header = element('Row', {
        props: {
            class: 'catalog-header',
            style: {
                padding: '12px 16px',
                background: 'var(--chrome, #161b22)',
                borderBottom: '1px solid var(--edge, #30363d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flex: '0 0 auto',
            },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                children: [
                    element('Heading', {
                        props: {
                            level: 1,
                            style: { margin: '0', fontSize: '18px', fontWeight: '600' },
                        },
                        children: [text('Catalog Browser')],
                    }),
                    element('Badge', {
                        props: {
                            style: {
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                background: 'var(--surface, #21262d)',
                                color: 'var(--ink-dim, #8b949e)',
                                border: '1px solid var(--edge, #30363d)',
                            },
                        },
                        children: [
                            text(() => `${String(app.filteredParts().length)} of ${String(app.parts().length)} parts`),
                        ],
                    }),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                children: [
                    element('Input', {
                        props: {
                            placeholder: 'Search parts, keywords, publisher...',
                            value: () => app.searchQuery(),
                            class: 'catalog-search-input',
                            style: {
                                padding: '5px 10px',
                                borderRadius: '6px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                width: '220px',
                                fontSize: '13px',
                            },
                        },
                        intents: {
                            change: { action: command('catalog.setSearch') },
                        },
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-filter-all',
                            style: () => ({
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--edge, #30363d)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                background: app.kindFilter() === 'all' ? 'var(--accent, #58a6ff)' : 'var(--surface, #21262d)',
                                color: app.kindFilter() === 'all' ? 'var(--on-accent, #0d1117)' : 'var(--ink, #e6edf3)',
                            }),
                        },
                        intents: { activate: { action: command('catalog.setKindFilter', 'all') } },
                        children: [text('All')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-filter-application',
                            style: () => ({
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--edge, #30363d)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                background: app.kindFilter() === 'application' ? 'var(--accent, #58a6ff)' : 'var(--surface, #21262d)',
                                color: app.kindFilter() === 'application' ? 'var(--on-accent, #0d1117)' : 'var(--ink, #e6edf3)',
                            }),
                        },
                        intents: { activate: { action: command('catalog.setKindFilter', 'application') } },
                        children: [text('Apps')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-filter-extension',
                            style: () => ({
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--edge, #30363d)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                background: app.kindFilter() === 'extension' ? 'var(--accent, #58a6ff)' : 'var(--surface, #21262d)',
                                color: app.kindFilter() === 'extension' ? 'var(--on-accent, #0d1117)' : 'var(--ink, #e6edf3)',
                            }),
                        },
                        intents: { activate: { action: command('catalog.setKindFilter', 'extension') } },
                        children: [text('Extensions')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-refresh-parts',
                            title: 'Reload catalog from mesh',
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
                        intents: { activate: { action: command('catalog.refresh') } },
                        children: [text('↻ Refresh')],
                    }),
                ],
            }),
        ],
    });

    const leftPartsPane = element('ScrollView', {
        props: {
            orientation: 'vertical',
            class: 'catalog-parts-list',
            style: {
                flex: '0 0 320px',
                borderRight: '1px solid var(--edge, #30363d)',
                background: 'var(--surface, #161b22)',
                padding: '8px',
                boxSizing: 'border-box',
                height: '100%',
            },
        },
        children: [
            when(
                () => app.status() === 'loading',
                () => element('Text', {
                    props: { style: { padding: '16px', color: 'var(--ink-dim, #8b949e)', display: 'block' } },
                    children: [text('Loading catalog parts...')],
                }),
            ),
            when(
                () => app.status() === 'error',
                () => element('Card', {
                    props: {
                        class: 'catalog-error-card',
                        style: {
                            padding: '12px',
                            margin: '8px',
                            borderRadius: '6px',
                            background: 'rgba(248, 81, 73, 0.1)',
                            border: '1px solid #f85149',
                            color: '#f85149',
                        },
                    },
                    children: [
                        element('Text', {
                            children: [text(() => app.errorMessage() ?? 'Unknown catalog error')],
                        }),
                    ],
                }),
            ),
            each(
                () => app.filteredParts(),
                (part) => part.name,
                (part) => element('Button', {
                    props: {
                        class: () => `part-item part-item-${part().name}${app.selectedPartName() === part().name ? ' selected' : ''}`,
                        style: () => ({
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            width: '100%',
                            padding: '10px 12px',
                            marginBottom: '6px',
                            borderRadius: '6px',
                            border: app.selectedPartName() === part().name
                                ? '1px solid var(--accent, #58a6ff)'
                                : '1px solid transparent',
                            background: app.selectedPartName() === part().name
                                ? 'rgba(88, 166, 255, 0.12)'
                                : 'var(--surface, #21262d)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            boxSizing: 'border-box',
                        }),
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
                                    props: { bold: true, style: { fontSize: '14px', color: 'var(--ink, #e6edf3)' } },
                                    children: [text(() => part().name)],
                                }),
                                renderKindBadge(() => part().kind),
                            ],
                        }),
                        element('Text', {
                            props: {
                                style: {
                                    fontSize: '12px',
                                    color: 'var(--ink-dim, #8b949e)',
                                    marginBottom: '4px',
                                    lineHeight: '1.4',
                                },
                            },
                            children: [text(() => part().description ?? 'No description provided')],
                        }),
                        element('Span', {
                            props: {
                                style: { fontSize: '11px', color: 'var(--ink-dim, #6e7681)' },
                            },
                            children: [text(() => `Publisher: ${part().publisher}`)],
                        }),
                    ],
                }),
            ),
            when(
                () => (app.status() === 'ready' || app.status() === 'empty') && app.filteredParts().length === 0,
                () => element('Text', {
                    props: { style: { padding: '24px 16px', color: 'var(--ink-dim, #8b949e)', display: 'block' } },
                    children: [text('No parts match the search criteria.')],
                }),
            ),
        ],
    });

    const versionTable = (): Described => element('Stack', {
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
                        (v) => element('Button', {
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
                        }),
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

    const versionProvenanceCard = (): Described => when(
        () => app.selectedVersion() !== null,
        () => {
            const v = app.selectedVersion();
            if (v === null) return element('EmptyNode');
            return element('Card', {
                props: {
                    class: 'version-provenance-card',
                    style: {
                        padding: '16px',
                        background: 'var(--chrome, #161b22)',
                        border: '1px solid var(--edge, #30363d)',
                        borderRadius: '6px',
                        marginBottom: '20px',
                    },
                },
                children: [
                    element('Heading', {
                        props: { level: 3, style: { margin: '0 0 12px 0', fontSize: '15px' } },
                        children: [
                            text(() => `Version Provenance & Build Details: ${v.partName}@${v.version}`),
                        ],
                    }),
                    element('Grid', {
                        props: {
                            columns: '180px 1fr',
                            gap: 8,
                            style: { fontSize: '13px', alignItems: 'baseline' },
                        },
                        children: [
                            element('Span', { props: { bold: true }, children: [text('Exact Commit:')] }),
                            element('Span', {
                                props: { code: true, style: { fontFamily: 'monospace', color: '#58a6ff' } },
                                children: [text(v.commit)],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Source Repository:')] }),
                            element('Span', { children: [text(v.repository ?? '(inherited from part)')] }),

                            element('Span', { props: { bold: true }, children: [text('Build Entry:')] }),
                            element('Span', {
                                children: [text(`${v.subdirectory ? `[${v.subdirectory}] ` : ''}${v.entry}`)],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Artifact Digest:')] }),
                            element('Span', {
                                props: { code: true, style: { fontFamily: 'monospace' } },
                                children: [text(v.artifactDigest ?? 'Not yet built (declared)')],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Target Kernel:')] }),
                            element('Span', { children: [text(v.kernel ?? 'Any')] }),

                            element('Span', { props: { bold: true }, children: [text('Contract Requirements:')] }),
                            element('Span', {
                                children: [
                                    text(v.requires && v.requires.length > 0
                                        ? v.requires.join(', ')
                                        : 'None (no mesh contracts declared)'),
                                ],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Capabilities (Needs):')] }),
                            element('Span', {
                                children: [
                                    text(v.capabilities.needs && v.capabilities.needs.length > 0
                                        ? v.capabilities.needs.join(', ')
                                        : 'None'),
                                ],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Capabilities (Provides):')] }),
                            element('Span', {
                                children: [
                                    text(v.capabilities.provides && v.capabilities.provides.length > 0
                                        ? v.capabilities.provides.join(', ')
                                        : 'None'),
                                ],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Required Parts:')] }),
                            element('Span', {
                                children: [
                                    text(v.requiredParts && v.requiredParts.length > 0
                                        ? v.requiredParts.map((rp) => `${rp.id} (${rp.version})`).join(', ')
                                        : 'None'),
                                ],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Changelog:')] }),
                            element('Span', {
                                props: { style: { whiteSpace: 'pre-wrap', color: 'var(--ink-dim, #8b949e)' } },
                                children: [text(v.changelog ?? 'No changelog recorded with this release.')],
                            }),
                        ],
                    }),
                ],
            });
        },
    );

    const rangeResolverSection = (): Described => element('Card', {
        props: {
            class: 'catalog-resolver-card',
            style: {
                padding: '16px',
                background: 'var(--chrome, #161b22)',
                border: '1px solid var(--edge, #30363d)',
                borderRadius: '6px',
                marginBottom: '20px',
            },
        },
        children: [
            element('Heading', {
                props: { level: 3, style: { margin: '0 0 6px 0', fontSize: '15px' } },
                children: [text('Catalog Range Resolver')],
            }),
            element('Text', {
                props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', display: 'block', marginBottom: '12px' } },
                children: [
                    text('Test pure semver range resolution against published versions before composing a release.'),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' } },
                children: [
                    element('Span', { props: { style: { fontSize: '12px' } }, children: [text('Kernel Range:')] }),
                    element('Input', {
                        props: {
                            class: 'input-resolve-kernel',
                            value: () => app.resolveKernel(),
                            placeholder: '^0.11',
                            style: {
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                width: '80px',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('catalog.setResolveKernel') } },
                    }),
                    element('Span', { props: { style: { fontSize: '12px' } }, children: [text('Part Name:')] }),
                    element('Input', {
                        props: {
                            class: 'input-resolve-part-name',
                            value: () => app.resolvePartName(),
                            placeholder: 'part name',
                            style: {
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                width: '120px',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('catalog.setResolvePartName') } },
                    }),
                    element('Span', { props: { style: { fontSize: '12px' } }, children: [text('Range:')] }),
                    element('Input', {
                        props: {
                            class: 'input-resolve-part-range',
                            value: () => app.resolvePartRange(),
                            placeholder: '^0.1.0 or *',
                            style: {
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                width: '100px',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('catalog.setResolvePartRange') } },
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-run-resolve',
                            style: {
                                padding: '5px 14px',
                                borderRadius: '4px',
                                background: 'var(--accent, #58a6ff)',
                                border: 'none',
                                color: 'var(--on-accent, #0d1117)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '12px',
                            },
                        },
                        intents: { activate: { action: command('catalog.runResolve') } },
                        children: [text(() => (app.resolveStatus() === 'resolving' ? 'Resolving...' : 'Resolve Range'))],
                    }),
                ],
            }),
            when(
                () => app.resolveStatus() === 'error',
                () => element('Text', {
                    props: { class: 'resolve-error-msg', style: { color: '#f85149', fontSize: '12px', display: 'block' } },
                    children: [text(() => app.resolveError() ?? 'Resolution failed')],
                }),
            ),
            when(
                () => app.resolveStatus() === 'success' && app.resolveResult() !== null,
                () => {
                    const r = app.resolveResult();
                    if (r === null) return element('EmptyNode');
                    return element('Stack', {
                        props: {
                            class: 'resolve-result-box',
                            style: {
                                padding: '10px 14px',
                                background: 'var(--surface, #21262d)',
                                borderRadius: '4px',
                                border: '1px solid var(--edge, #30363d)',
                                fontSize: '12px',
                            },
                        },
                        children: [
                            element('Row', {
                                props: { style: { marginBottom: '6px' } },
                                children: [
                                    element('Span', { props: { bold: true }, children: [text('Resolved Kernel: ')] }),
                                    element('Span', {
                                        props: { code: true, style: { fontFamily: 'monospace' } },
                                        children: [text(`${r.kernel.name}@${r.kernel.version} (${r.kernel.commit.slice(0, 10)})`)],
                                    }),
                                ],
                            }),
                            each(
                                () => r.parts,
                                (p) => p.name,
                                (p) => element('Row', {
                                    props: { style: { marginBottom: '4px' } },
                                    children: [
                                        element('Span', { props: { bold: true }, children: [text(`Resolved ${p().name}: `)] }),
                                        element('Span', {
                                            props: { code: true, style: { fontFamily: 'monospace' } },
                                            children: [text(`${p().version} (${p().commit.slice(0, 10)})`)],
                                        }),
                                    ],
                                }),
                            ),
                            when(
                                () => r.unsatisfied.length > 0,
                                () => element('Stack', {
                                    props: { style: { marginTop: '6px', color: '#f85149' } },
                                    children: [
                                        element('Span', { props: { bold: true }, children: [text('Unsatisfied Requirements:')] }),
                                        each(
                                            () => r.unsatisfied,
                                            (u) => u.name,
                                            (u) => element('Text', {
                                                children: [text(() => `• ${u().name}: wanted ${u().wanted} — ${u().reason}`)],
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

    const rightDetailsPane = element('ScrollView', {
        props: {
            orientation: 'vertical',
            class: 'catalog-part-details',
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
                () => app.selectedPart() !== null,
                () => {
                    const p = app.selectedPart();
                    if (p === null) return element('EmptyNode');
                    return element('Stack', {
                        children: [
                            element('Row', {
                                props: {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '12px',
                                    },
                                },
                                children: [
                                    element('Row', {
                                        props: { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                                        children: [
                                            element('Heading', {
                                                props: { level: 2, style: { margin: '0', fontSize: '22px' } },
                                                children: [text(p.name)],
                                            }),
                                            renderKindBadge(() => p.kind),
                                        ],
                                    }),
                                    element('Span', {
                                        props: { style: { fontSize: '13px', color: 'var(--ink-dim, #8b949e)' } },
                                        children: [text(`Published by: ${p.publisher}`)],
                                    }),
                                ],
                            }),
                            element('Text', {
                                props: {
                                    style: {
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                        marginBottom: '14px',
                                        color: 'var(--ink, #e6edf3)',
                                    },
                                },
                                children: [text(p.description ?? 'No description provided.')],
                            }),
                            element('Row', {
                                props: {
                                    style: {
                                        display: 'flex',
                                        gap: '16px',
                                        fontSize: '12px',
                                        color: 'var(--ink-dim, #8b949e)',
                                        marginBottom: '16px',
                                    },
                                },
                                children: [
                                    element('Span', {
                                        children: [text(`Repository: ${p.repository}`)],
                                    }),
                                    when(
                                        () => p.license !== undefined,
                                        () => element('Span', { children: [text(`License: ${p.license ?? ''}`)] }),
                                    ),
                                    when(
                                        () => p.homepage !== undefined,
                                        () => element('Span', { children: [text(`Homepage: ${p.homepage ?? ''}`)] }),
                                    ),
                                ],
                            }),
                            when(
                                () => p.keywords !== undefined && p.keywords.length > 0,
                                () => element('Row', {
                                    props: {
                                        style: {
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '6px',
                                            marginBottom: '16px',
                                        },
                                    },
                                    children: [
                                        each(
                                            () => p.keywords ?? [],
                                            (kw) => kw,
                                            (kw) => element('Badge', {
                                                props: {
                                                    style: {
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        background: 'var(--surface, #21262d)',
                                                        border: '1px solid var(--edge, #30363d)',
                                                        color: 'var(--ink-dim, #8b949e)',
                                                    },
                                                },
                                                children: [text(kw)],
                                            }),
                                        ),
                                    ],
                                }),
                            ),
                            element('Divider', { props: { orientation: 'horizontal', style: { marginBottom: '16px' } } }),
                            versionTable(),
                            versionProvenanceCard(),
                            element('Divider', { props: { orientation: 'horizontal', style: { marginBottom: '16px' } } }),
                            rangeResolverSection(),
                        ],
                    });
                },
                () => element('Stack', {
                    props: { style: { padding: '40px 20px', alignItems: 'center' } },
                    children: [
                        element('Heading', {
                            props: { level: 2, style: { color: 'var(--ink-dim, #8b949e)' } },
                            children: [text('Select a part from the catalog list to browse its versions and details.')],
                        }),
                    ],
                }),
            ),
        ],
    });

    return element('Stack', {
        props: {
            class: 'catalog-app-root',
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
                    leftPartsPane,
                    rightDetailsPane,
                ],
            }),
        ],
    });
}
