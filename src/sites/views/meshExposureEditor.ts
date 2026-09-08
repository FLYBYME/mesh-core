import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import { chromeApi } from '../../generated/api.js';
import type { SitesApi } from '../contract.js';

export interface KnownContract {
    readonly key: string;
    readonly domain: string;
    readonly defaultGate: 'public' | 'user' | 'admin' | 'operator';
}

export const BUILTIN_CONTRACTS: readonly KnownContract[] = Object.entries(chromeApi.calls).map(([key, def]) => {
    const domain = key.split('.')[0] || 'mesh';
    const callDef = def as { gate?: { level?: string } };
    const level = callDef.gate?.level;
    const defaultGate: 'public' | 'user' | 'admin' | 'operator' =
        (level === 'user' || level === 'admin' || level === 'operator') ? level : 'public';
    return { key, domain, defaultGate };
}).sort((a, b) => a.key.localeCompare(b.key));

export interface ContractRowData {
    readonly key: string;
    readonly domain: string;
    readonly isGranted: boolean;
    readonly isRequired: boolean;
    readonly isUnused: boolean;
    readonly gate: 'public' | 'user' | 'admin' | 'operator';
}

export function parseGrantedContracts(meshJson: string): Map<string, 'public' | 'user' | 'admin' | 'operator'> {
    const map = new Map<string, 'public' | 'user' | 'admin' | 'operator'>();
    try {
        const parsed = JSON.parse(meshJson || '[]');
        if (Array.isArray(parsed)) {
            for (const item of parsed) {
                if (typeof item === 'object' && item !== null && 'contracts' in item && Array.isArray(item.contracts)) {
                    for (const c of item.contracts) {
                        if (typeof c === 'object' && c !== null && 'key' in c && typeof c.key === 'string') {
                            const auth = ('auth' in c && (c.auth === 'user' || c.auth === 'admin' || c.auth === 'operator'))
                                ? c.auth
                                : 'public';
                            map.set(c.key, auth);
                        }
                    }
                }
            }
        }
    } catch {}
    return map;
}

export function getAllContractRows(app: SitesApi): readonly ContractRowData[] {
    const grantedMap = parseGrantedContracts(app.formMesh());
    const site = app.selectedSite();
    const release = app.activeRelease();
    const requiredKeys = new Set(release?.requires ?? []);
    const hasRelease = Boolean(site?.releaseHash);

    const keys = new Set<string>();
    for (const b of BUILTIN_CONTRACTS) keys.add(b.key);
    for (const g of grantedMap.keys()) keys.add(g);
    for (const r of requiredKeys) keys.add(r);

    return Array.from(keys).sort().map((key) => {
        const builtin = BUILTIN_CONTRACTS.find((b) => b.key === key);
        const domain = key.split('.')[0] || 'mesh';
        const defaultGate = builtin?.defaultGate ?? 'public';
        const isGranted = grantedMap.has(key);
        const isRequired = requiredKeys.has(key);
        const isUnused = isGranted && hasRelease && !isRequired;
        const gate = grantedMap.get(key) ?? defaultGate;
        return { key, domain, isGranted, isRequired, isUnused, gate };
    });
}

export function getFilteredContractRows(app: SitesApi): readonly ContractRowData[] {
    const all = getAllContractRows(app);
    const filter = app.meshFilter();
    const search = app.meshSearch().trim().toLowerCase();

    return all.filter((r) => {
        if (search && !r.key.toLowerCase().includes(search)) return false;
        if (filter === 'granted') return r.isGranted;
        if (filter === 'required') return r.isRequired;
        if (filter === 'unused') return r.isUnused;
        return true;
    });
}

function renderContractRow(item: () => ContractRowData, app: SitesApi): Described {
    return element('Row', {
        props: {
            class: () => `mesh-contract-row mesh-contract-${item().key.replace(/\./g, '-')}${item().isUnused ? ' is-unused' : ''}${item().isGranted ? ' is-granted' : ''}`,
            style: () => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '4px',
                marginBottom: '4px',
                background: item().isUnused
                    ? 'rgba(210, 153, 34, 0.08)'
                    : item().isGranted
                        ? 'rgba(56, 139, 253, 0.06)'
                        : 'transparent',
                border: item().isUnused
                    ? '1px solid rgba(210, 153, 34, 0.35)'
                    : item().isGranted
                        ? '1px solid rgba(56, 139, 253, 0.2)'
                        : '1px solid var(--edge, #30363d)',
                fontSize: '12px',
                gap: '8px',
            }),
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', minWidth: '0' } },
                children: [
                    element('Button', {
                        props: {
                            class: () => `mesh-grant-toggle mesh-grant-toggle-${item().key.replace(/\./g, '-')}`,
                            disabled: () => !app.writeSupported() || app.busy(),
                            style: () => ({
                                padding: '2px 8px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                cursor: !app.writeSupported() || app.busy() ? 'not-allowed' : 'pointer',
                                background: item().isGranted ? 'var(--accent, #1f6feb)' : 'var(--surface, #21262d)',
                                color: item().isGranted ? 'var(--on-accent, #ffffff)' : 'var(--ink-dim, #8b949e)',
                                border: '1px solid var(--edge, #30363d)',
                                fontWeight: '600',
                                flexShrink: '0',
                            }),
                        },
                        intents: { activate: { action: command('sites.toggleGrant', item().key) } },
                        children: [text(() => (item().isGranted ? '☑ Granted' : '☐ Grant'))],
                    }),
                    element('Text', {
                        props: {
                            class: 'mesh-contract-key',
                            style: () => ({
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                fontWeight: item().isGranted ? '600' : 'normal',
                                color: item().isGranted ? 'var(--ink, #e6edf3)' : 'var(--ink-dim, #8b949e)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }),
                        },
                        children: [text(() => item().key)],
                    }),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: '0' } },
                children: [
                    element('Badge', {
                        props: {
                            class: 'mesh-contract-gate',
                            style: () => ({
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: item().gate === 'public'
                                    ? 'rgba(56, 139, 253, 0.15)'
                                    : item().gate === 'user'
                                        ? 'rgba(163, 113, 247, 0.15)'
                                        : 'rgba(210, 153, 34, 0.15)',
                                color: item().gate === 'public'
                                    ? '#58a6ff'
                                    : item().gate === 'user'
                                        ? '#bc8cff'
                                        : '#d29922',
                                border: '1px solid var(--edge, #30363d)',
                                textTransform: 'uppercase',
                                fontWeight: '600',
                            }),
                        },
                        children: [text(() => item().gate)],
                    }),
                    when(
                        () => item().isUnused,
                        () => element('Badge', {
                            props: {
                                class: 'mesh-unused-grant',
                                title: 'This contract is granted to the site but is not required by the active release.',
                                style: {
                                    fontSize: '10px',
                                    padding: '1px 7px',
                                    borderRadius: '4px',
                                    background: 'rgba(210, 153, 34, 0.25)',
                                    color: '#d29922',
                                    border: '1px solid #d29922',
                                    fontWeight: '700',
                                    letterSpacing: '0.2px',
                                },
                            },
                            children: [text('⚠️ Unused grant')],
                        }),
                    ),
                    when(
                        () => item().isRequired && !item().isGranted,
                        () => element('Badge', {
                            props: {
                                class: 'mesh-missing-grant',
                                title: 'Required by the active release, but not currently granted in site.mesh.',
                                style: {
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(248, 81, 73, 0.15)',
                                    color: '#f85149',
                                    border: '1px solid #f85149',
                                    fontWeight: '600',
                                },
                            },
                            children: [text('Required by release')],
                        }),
                    ),
                    when(
                        () => item().isRequired && item().isGranted,
                        () => element('Badge', {
                            props: {
                                class: 'mesh-satisfied-grant',
                                style: {
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(63, 185, 80, 0.15)',
                                    color: '#3fb950',
                                    border: '1px solid #3fb950',
                                    fontWeight: '600',
                                },
                            },
                            children: [text('✓ Required')],
                        }),
                    ),
                ],
            }),
        ],
    });
}

export function renderMeshExposureEditor(app: SitesApi): Described {
    return element('Stack', {
        props: {
            class: 'mesh-exposure-editor',
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                background: 'var(--surface, #161b22)',
                border: '1px solid var(--edge, #30363d)',
                borderRadius: '6px',
                width: '100%',
                boxSizing: 'border-box',
            },
        },
        children: [
            // Status and summary banner
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' } },
                        children: [
                            element('Span', {
                                props: { class: 'mesh-summary-total', style: { color: 'var(--ink-dim, #8b949e)' } },
                                children: [text(() => `${String(getAllContractRows(app).length)} available`)],
                            }),
                            element('Span', { props: { style: { color: 'var(--edge, #30363d)' } }, children: [text('·')] }),
                            element('Span', {
                                props: { class: 'mesh-summary-granted', style: { color: 'var(--accent, #58a6ff)' } },
                                children: [text(() => `${String(getAllContractRows(app).filter((r) => r.isGranted).length)} granted`)],
                            }),
                            element('Span', { props: { style: { color: 'var(--edge, #30363d)' } }, children: [text('·')] }),
                            element('Span', {
                                props: { class: 'mesh-summary-required', style: { color: '#3fb950' } },
                                children: [text(() => `${String(getAllContractRows(app).filter((r) => r.isRequired).length)} required by release`)],
                            }),
                        ],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-toggle-raw-mesh',
                            type: 'button',
                            style: () => ({
                                padding: '2px 8px',
                                fontSize: '11px',
                                background: app.showRawMesh() ? 'rgba(56, 139, 253, 0.15)' : 'var(--chrome, #0d1117)',
                                border: '1px solid var(--edge, #30363d)',
                                borderRadius: '4px',
                                color: app.showRawMesh() ? 'var(--accent, #58a6ff)' : 'var(--ink-dim, #8b949e)',
                                cursor: 'pointer',
                            }),
                        },
                        intents: { activate: { action: command('sites.toggleRawMesh') } },
                        children: [text(() => (app.showRawMesh() ? 'Hide Raw JSON' : 'Show Raw JSON'))],
                    }),
                ],
            }),

            // Warning banner if unused grants are present
            when(
                () => getAllContractRows(app).some((r) => r.isUnused),
                () => element('Row', {
                    props: {
                        class: 'mesh-unused-warning-banner',
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            background: 'rgba(210, 153, 34, 0.15)',
                            border: '1px solid var(--warn, #d29922)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: 'var(--warn, #d29922)',
                        },
                    },
                    children: [
                        element('Span', {
                            props: { style: { fontWeight: '600' } },
                            children: [text(() => {
                                const unused = getAllContractRows(app).filter((r) => r.isUnused);
                                return `⚠️ ${String(unused.length)} unused grant(s): ${unused.map((u) => u.key).join(', ')}`;
                            })],
                        }),
                    ],
                }),
            ),

            // Search and filter toolbar
            element('Row', {
                props: {
                    class: 'mesh-exposure-toolbar',
                    style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' },
                },
                children: [
                    element('Input', {
                        props: {
                            class: 'mesh-exposure-search input-mesh-search',
                            type: 'text',
                            placeholder: 'Filter contracts by name...',
                            value: () => app.meshSearch(),
                            style: {
                                flex: '1 1 auto',
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid var(--edge, #30363d)',
                                background: 'var(--chrome, #0d1117)',
                                color: 'var(--ink, #e6edf3)',
                            },
                        },
                        intents: { change: { action: command('sites.setMeshSearch') } },
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '4px' } },
                        children: [
                            element('Button', {
                                props: {
                                    class: () => `btn-filter-all${app.meshFilter() === 'all' ? ' active' : ''}`,
                                    type: 'button',
                                    style: () => ({
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        borderRadius: '4px',
                                        background: app.meshFilter() === 'all' ? 'var(--accent, #1f6feb)' : 'var(--chrome, #0d1117)',
                                        color: app.meshFilter() === 'all' ? 'var(--on-accent, #ffffff)' : 'var(--ink-dim, #8b949e)',
                                        border: '1px solid var(--edge, #30363d)',
                                        cursor: 'pointer',
                                    }),
                                },
                                intents: { activate: { action: command('sites.setMeshFilter', 'all') } },
                                children: [text(() => `All (${String(getAllContractRows(app).length)})`)],
                            }),
                            element('Button', {
                                props: {
                                    class: () => `btn-filter-granted${app.meshFilter() === 'granted' ? ' active' : ''}`,
                                    type: 'button',
                                    style: () => ({
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        borderRadius: '4px',
                                        background: app.meshFilter() === 'granted' ? 'var(--accent, #1f6feb)' : 'var(--chrome, #0d1117)',
                                        color: app.meshFilter() === 'granted' ? 'var(--on-accent, #ffffff)' : 'var(--ink-dim, #8b949e)',
                                        border: '1px solid var(--edge, #30363d)',
                                        cursor: 'pointer',
                                    }),
                                },
                                intents: { activate: { action: command('sites.setMeshFilter', 'granted') } },
                                children: [text(() => `Granted (${String(getAllContractRows(app).filter((r) => r.isGranted).length)})`)],
                            }),
                            element('Button', {
                                props: {
                                    class: () => `btn-filter-required${app.meshFilter() === 'required' ? ' active' : ''}`,
                                    type: 'button',
                                    style: () => ({
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        borderRadius: '4px',
                                        background: app.meshFilter() === 'required' ? 'var(--accent, #1f6feb)' : 'var(--chrome, #0d1117)',
                                        color: app.meshFilter() === 'required' ? 'var(--on-accent, #ffffff)' : 'var(--ink-dim, #8b949e)',
                                        border: '1px solid var(--edge, #30363d)',
                                        cursor: 'pointer',
                                    }),
                                },
                                intents: { activate: { action: command('sites.setMeshFilter', 'required') } },
                                children: [text(() => `Required (${String(getAllContractRows(app).filter((r) => r.isRequired).length)})`)],
                            }),
                            element('Button', {
                                props: {
                                    class: () => `btn-filter-unused${app.meshFilter() === 'unused' ? ' active' : ''}`,
                                    type: 'button',
                                    style: () => {
                                        const count = getAllContractRows(app).filter((r) => r.isUnused).length;
                                        return {
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            borderRadius: '4px',
                                            background: app.meshFilter() === 'unused'
                                                ? 'var(--warn, #d29922)'
                                                : count > 0 ? 'rgba(210, 153, 34, 0.15)' : 'var(--chrome, #0d1117)',
                                            color: app.meshFilter() === 'unused'
                                                ? '#ffffff'
                                                : count > 0 ? '#d29922' : 'var(--ink-dim, #8b949e)',
                                            border: count > 0 ? '1px solid #d29922' : '1px solid var(--edge, #30363d)',
                                            fontWeight: count > 0 ? 'bold' : 'normal',
                                            cursor: 'pointer',
                                        };
                                    },
                                },
                                intents: { activate: { action: command('sites.setMeshFilter', 'unused') } },
                                children: [text(() => `Unused (${String(getAllContractRows(app).filter((r) => r.isUnused).length)})`)],
                            }),
                        ],
                    }),
                ],
            }),

            // List of contracts
            element('Stack', {
                props: {
                    class: 'mesh-exposure-list',
                    style: {
                        maxHeight: '280px',
                        overflowY: 'auto',
                        border: '1px solid var(--edge, #30363d)',
                        borderRadius: '4px',
                        padding: '6px',
                        background: 'var(--chrome, #0d1117)',
                    },
                },
                children: [
                    when(
                        () => getFilteredContractRows(app).length === 0,
                        () => element('Text', {
                            props: { style: { padding: '12px', fontSize: '12px', color: 'var(--ink-dim, #8b949e)', textAlign: 'center' } },
                            children: [text('No matching contracts found.')],
                        }),
                    ),
                    each(
                        () => getFilteredContractRows(app),
                        (item) => item.key,
                        (item) => renderContractRow(item, app),
                    ),
                ],
            }),

            // Raw JSON editor fallback (toggled on demand)
            when(
                () => app.showRawMesh(),
                () => element('Stack', {
                    props: { style: { marginTop: '8px' } },
                    children: [
                        element('Text', {
                            props: { style: { fontSize: '11px', color: 'var(--ink-dim, #8b949e)', marginBottom: '4px' } },
                            children: [text('Underlying site.mesh JSON payload:')],
                        }),
                        element('TextArea', {
                            props: {
                                class: 'input-mesh',
                                style: {
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    height: '90px',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--edge, #30363d)',
                                    background: 'var(--chrome, #0d1117)',
                                    color: 'var(--ink, #e6edf3)',
                                },
                                value: () => app.formMesh(),
                                disabled: () => !app.writeSupported() || app.busy(),
                            },
                            intents: { change: { action: command('sites.setField', 'mesh') } },
                        }),
                    ],
                }),
            ),

            // When raw JSON is hidden, keep a hidden input so .input-mesh is accessible in the DOM
            when(
                () => !app.showRawMesh(),
                () => element('Input', {
                    props: {
                        class: 'input-mesh',
                        type: 'hidden',
                        value: () => app.formMesh(),
                    },
                }),
            ),
        ],
    });
}
