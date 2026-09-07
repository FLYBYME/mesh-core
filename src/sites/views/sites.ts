import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
    type ViewContext,
} from '@flybyme/mesh-web';

import {
    UI_DETAIL_SURFACE,
    UI_ENTITY_ITEM,
    UI_ENTITY_LIST,
} from '../../ui/contract.js';
import { renderForm } from '../../ui/views/schemaForm.js';
import { SITE_FORM_SCHEMA, type SitesApi } from '../contract.js';
import type { SiteFindOutputItem } from '../../generated/api.js';

const row = (children: readonly Described[], gap = '8px'): Described =>
    element('Row', {
        props: { style: { display: 'flex', alignItems: 'center', gap, flexWrap: 'wrap' } },
        children: [...children],
    });

function renderSiteItem(site: () => SiteFindOutputItem, app: SitesApi): Described {
    return element(UI_ENTITY_ITEM, {
        props: {
            class: () => `site-item site-item-${site().host.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
            selected: () => app.selectedHost() === site().host,
        },
        intents: { activate: { action: command('sites.select', site().host) } },
        children: [
            row([
                element('Text', {
                    props: { style: { fontWeight: '600' } },
                    children: [text(() => site().host)],
                }),
                element('Text', {
                    props: {
                        style: () => ({
                            fontSize: '11px',
                            color: site().indexable ?? true ? 'var(--accent)' : 'var(--ink-dim)',
                        }),
                    },
                    children: [text(() => (site().indexable ?? true ? '● indexable' : '○ noindex'))],
                }),
            ]),
            element('Text', {
                props: { style: { fontSize: '11px', color: 'var(--ink-dim)' } },
                children: [
                    text(() => {
                        const s = site();
                        const rel = s.releaseHash ? `${s.releaseHash.slice(0, 19)}…` : 'no release';
                        return `${s.application} · ${rel} · ${s.tenantId}`;
                    }),
                ],
            }),
        ],
    });
}

function renderSiteDetail(app: SitesApi): Described {
    const site = (): SiteFindOutputItem | null => app.selectedSite();
    const str = (pick: (s: SiteFindOutputItem) => string | undefined): (() => string) =>
        () => { const s = site(); return s === null ? '' : (pick(s) ?? ''); };

    return element(UI_DETAIL_SURFACE, {
        props: {
            class: 'sites-detail',
            selected: () => site() !== null,
            placeholderTitle: 'Select a site',
            placeholderMessage: 'Select a site from the list to view its configuration, metadata, and deployment.',
            title: str((s) => s.host),
            badge: str((s) => s.application),
        },
        children: [
            when(
                () => site() !== null,
                () => element('Stack', {
                    props: { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
                    children: [
                        // Write notice when write mutations are internal
                        when(
                            () => !app.writeSupported(),
                            () => element('Stack', {
                                props: {
                                    class: 'sites-write-banner',
                                    style: {
                                        padding: '12px 14px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--edge)',
                                        background: 'var(--surface-subtle)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                    },
                                },
                                children: [
                                    row([
                                        element('Span', {
                                            props: {
                                                class: 'sites-write-badge',
                                                style: {
                                                    fontSize: '11px',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontWeight: '600',
                                                    background: 'var(--warn, #d29922)',
                                                    color: '#000',
                                                },
                                            },
                                            children: [text('Writes Internal')],
                                        }),
                                        element('Text', {
                                            props: { style: { fontWeight: '600', fontSize: '13px' } },
                                            children: [text('Site metadata editing is disabled pending server exposure')],
                                        }),
                                    ]),
                                    element('Text', {
                                        props: { style: { fontSize: '12px', color: 'var(--ink-dim)', lineHeight: '1.4' } },
                                        children: [
                                            text('site.contract.ts keeps update internal to separate metadata from deployment. The split issue is tracked at FLYBYME/mesh-serve#5. Form fields and save are visibly disabled. Release deployment via cdn.deploy remains active below.'),
                                        ],
                                    }),
                                ],
                            }),
                        ),

                        // Form for metadata
                        element('Stack', {
                            props: { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                            children: [
                                element('Heading', {
                                    props: { level: 3, style: { fontSize: '14px', margin: '0' } },
                                    children: [text('Site Metadata & Configuration')],
                                }),
                                element('Text', {
                                    props: { style: { fontSize: '12px', color: 'var(--ink-dim)' } },
                                    children: [
                                        text('Configurable site properties: theme, policy, title, description, indexable, and mesh exposure. releaseHash is excluded from site editing.'),
                                    ],
                                }),
                                renderForm({
                                    schema: SITE_FORM_SCHEMA,
                                    class: 'site-editor-form',
                                    values: () => ({
                                        title: app.formTitle(),
                                        description: app.formDescription(),
                                        indexable: app.formIndexable(),
                                        theme: app.formTheme(),
                                        policy: app.formPolicy(),
                                        mesh: app.formMesh(),
                                    }),
                                    onFieldChange: 'sites.setField',
                                    onSubmit: 'sites.save',
                                    submitLabel: 'Save Site Changes',
                                    disabled: () => !app.writeSupported() || app.busy(),
                                    overrides: {
                                        fields: {
                                            title: {
                                                label: 'Site Title',
                                                hint: 'Title displayed in the browser tab and page metadata.',
                                                placeholder: 'e.g. Documentation Hub',
                                            },
                                            description: {
                                                label: 'Description',
                                                hint: 'Meta description for search engine previews and social cards.',
                                                placeholder: 'e.g. Documentation and guides for the platform.',
                                            },
                                            indexable: {
                                                label: 'Search Engine Indexing',
                                                hint: 'Allow search engines to index this site.',
                                            },
                                            theme: {
                                                label: 'Theme Tokens (JSON)',
                                                hint: 'Key-value map of CSS custom properties and theme tokens.',
                                                placeholder: '{"accent": "#0066cc"}',
                                            },
                                            policy: {
                                                label: 'Security Policy (JSON)',
                                                hint: 'Feature and permission policy rules.',
                                                placeholder: '{}',
                                            },
                                            mesh: {
                                                label: 'Mesh Exposure (JSON)',
                                                hint: 'List of exposed package contracts and events.',
                                                placeholder: '[]',
                                            },
                                        },
                                        renderActions: (defaultActions: () => Described): Described => element('Stack', {
                                            props: { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' } },
                                            children: [
                                                element('Row', {
                                                    props: { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                                                    children: [
                                                        defaultActions(),
                                                        when(
                                                            () => app.isDirty(),
                                                            () => element('Button', {
                                                                props: {
                                                                    class: 'btn-reset-form',
                                                                    style: { padding: '6px 14px', fontSize: '13px' },
                                                                    disabled: () => app.busy(),
                                                                },
                                                                intents: { activate: { action: command('sites.reset') } },
                                                                children: [text('Reset Changes')],
                                                            }),
                                                        ),
                                                    ],
                                                }),
                                            ],
                                        }),
                                    },
                                }),
                            ],
                        }),

                        // Active Release & Deployment Section (the write that does exist)
                        element('Stack', {
                            props: {
                                class: 'sites-deploy-section',
                                style: {
                                    padding: '14px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--edge)',
                                    background: 'var(--surface)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                },
                            },
                            children: [
                                element('Heading', {
                                    props: { level: 3, style: { fontSize: '14px', margin: '0' } },
                                    children: [text('Active Release & Deployment')],
                                }),
                                element('Text', {
                                    props: { style: { fontSize: '12px', color: 'var(--ink-dim)' } },
                                    children: [
                                        text('Which release a hostname serves is deployed independently via cdn.deploy. Editing site metadata and deploying a release are two different acts.'),
                                    ],
                                }),
                                row([
                                    element('Span', {
                                        props: { style: { fontSize: '12px', fontWeight: '600' } },
                                        children: [text('Current Release:')],
                                    }),
                                    element('Span', {
                                        props: {
                                            class: 'site-release-badge',
                                            style: {
                                                fontFamily: 'monospace',
                                                fontSize: '12px',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                background: 'var(--chrome)',
                                                border: '1px solid var(--edge)',
                                            },
                                        },
                                        children: [text(() => app.selectedSite()?.releaseHash ?? 'No release deployed')],
                                    }),
                                ]),
                                element('Row', {
                                    props: { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                                    children: [
                                        element('Input', {
                                            props: {
                                                class: 'input-deploy-release-hash',
                                                type: 'text',
                                                placeholder: 'sha256:release_hash_to_deploy...',
                                                style: {
                                                    flex: '1 1 auto',
                                                    padding: '6px 10px',
                                                    fontSize: '12px',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--edge)',
                                                    background: 'var(--surface-subtle)',
                                                    color: 'var(--ink)',
                                                },
                                                value: () => app.deployReleaseInput(),
                                                disabled: () => app.busy(),
                                            },
                                            intents: { change: { action: command('sites.setDeployReleaseInput') } },
                                        }),
                                        element('Button', {
                                            props: {
                                                class: 'btn-deploy-release',
                                                style: {
                                                    padding: '6px 14px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                },
                                                disabled: () => app.busy(),
                                            },
                                            intents: { activate: { action: command('sites.deploySelected') } },
                                            children: [text('Deploy Release')],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
            ),
        ],
    });
}

export function renderSitesView(vx: ViewContext<Record<string, never>, SitesApi>): Described {
    const app = vx.app;

    return element('Stack', {
        props: {
            class: 'sites-view',
            style: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%' },
        },
        children: [
            element('Row', {
                props: {
                    class: 'sites-toolbar',
                    style: {
                        display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto',
                        padding: '8px 12px', borderBottom: '1px solid var(--edge)',
                        background: 'var(--chrome)',
                    },
                },
                children: [
                    element('Heading', {
                        props: { level: 2, style: { fontSize: '14px', margin: '0', flex: '1 1 auto' } },
                        children: [text(() => `Sites — ${String(app.sites().length)} site(s)`)],
                    }),
                    element('Span', {
                        props: {
                            class: 'sites-live-indicator live-indicator',
                            style: () => ({
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                background: app.live() ? 'rgba(56, 139, 253, 0.15)' : 'var(--surface)',
                                color: app.live() ? 'var(--accent)' : 'var(--ink-dim)',
                                border: '1px solid var(--edge)',
                            }),
                        },
                        children: [text(() => (app.live() ? '● live' : '○ not following'))],
                    }),
                ],
            }),

            when(
                () => app.lastAction() !== null || app.lastError() !== null || app.sitesError() !== null,
                () => element('Text', {
                    props: {
                        class: 'sites-message',
                        style: () => ({
                            flex: '0 0 auto', padding: '6px 12px', fontSize: '12px',
                            borderBottom: '1px solid var(--edge)',
                            color: (app.lastError() !== null || app.sitesError() !== null) ? 'var(--error)' : 'var(--ink-dim)',
                        }),
                    },
                    children: [text(() => app.sitesError() ?? app.lastError() ?? app.lastAction() ?? '')],
                }),
            ),

            element('Row', {
                props: {
                    style: { display: 'flex', flex: '1 1 auto', minHeight: '0', overflow: 'hidden' },
                },
                children: [
                    element(UI_ENTITY_LIST, {
                        props: {
                            class: 'sites-list',
                            status: () => app.sitesStatus(),
                            loadingMessage: 'Reading sites...',
                            errorMessage: () => app.sitesError() ?? 'Unknown error',
                            emptyMessage: 'No sites registered.',
                            idleMessage: 'Sign in to view registered sites.',
                            count: () => app.sites().length,
                        },
                        children: [
                            each(() => app.sites(), (s: SiteFindOutputItem) => s.host,
                                (s: () => SiteFindOutputItem) => renderSiteItem(s, app)),
                        ],
                    }),
                    element('Stack', {
                        props: {
                            style: {
                                display: 'flex', flexDirection: 'column', flex: '1 1 auto',
                                minWidth: '0', overflowY: 'auto', padding: '16px',
                            },
                        },
                        children: [renderSiteDetail(app)],
                    }),
                ],
            }),
        ],
    });
}
