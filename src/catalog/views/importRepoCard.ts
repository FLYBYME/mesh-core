import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { BuilderImportRepoOutput } from '../../generated/api.js';
import type { CatalogApi } from '../contract.js';

function renderImportResult(res: BuilderImportRepoOutput): Described {
    return element('Stack', {
        props: {
            class: 'import-result-box',
            style: {
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(63, 185, 80, 0.08)',
                border: '1px solid #3fb950',
                borderRadius: '6px',
                fontSize: '12px',
            },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' } },
                children: [
                    element('Span', {
                        props: { bold: true, style: { color: '#3fb950' } },
                        children: [text(`Imported ${String(res.parts.length)} part(s) from ${res.repository}`)],
                    }),
                    element('Span', {
                        props: { code: true, style: { fontFamily: 'monospace', color: 'var(--ink-dim, #8b949e)' } },
                        children: [text(`commit: ${res.commit.slice(0, 10)}`)],
                    }),
                ],
            }),
            element('Stack', {
                props: { class: 'imported-parts-list', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                children: [
                    each(
                        () => res.parts,
                        (p) => p.name,
                        (p) => element('Row', {
                            props: {
                                class: () => `imported-part-item imported-part-${p().name}`,
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '4px 8px',
                                    background: 'var(--surface, #21262d)',
                                    borderRadius: '4px',
                                },
                            },
                            children: [
                                element('Row', {
                                    props: { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                                    children: [
                                        element('Span', { props: { bold: true }, children: [text(() => p().name)] }),
                                        element('Span', {
                                            props: { style: { fontSize: '11px', color: 'var(--ink-dim, #8b949e)' } },
                                            children: [text(() => `(${p().kind}: ${p().entry})`)],
                                        }),
                                    ],
                                }),
                                element('Badge', {
                                    props: {
                                        style: {
                                            fontSize: '10px',
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            background: p().existed ? 'var(--edge, #30363d)' : 'rgba(63, 185, 80, 0.2)',
                                            color: p().existed ? 'var(--ink-dim, #8b949e)' : '#3fb950',
                                        },
                                    },
                                    children: [text(() => (p().existed ? 'updated' : 'new'))],
                                }),
                            ],
                        }),
                    ),
                ],
            }),
        ],
    });
}

export function renderImportRepoCard(app: CatalogApi): Described {
    return element('Card', {
        props: {
            class: 'catalog-import-card',
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
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
                children: [
                    element('Heading', {
                        props: { level: 3, style: { margin: '0', fontSize: '15px' } },
                        children: [text('Import Repository (builder.import_repo)')],
                    }),
                    element('Badge', {
                        props: {
                            style: {
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(88, 166, 255, 0.15)',
                                color: 'var(--accent, #58a6ff)',
                                border: '1px solid rgba(88, 166, 255, 0.3)',
                            },
                        },
                        children: [text('Genesis Descriptor')],
                    }),
                ],
            }),
            element('Text', {
                props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', display: 'block', marginBottom: '14px', lineHeight: '1.4' } },
                children: [
                    text('Read a repository\'s mesh.json descriptor once into part rows. Leave the ref empty to use the repository\'s own default branch.'),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' } },
                children: [
                    element('Input', {
                        props: {
                            class: 'input-import-repo-url',
                            placeholder: 'Repository URL (e.g. https://github.com/org/repo)',
                            value: () => app.importRepoUrl(),
                            style: {
                                flex: '1 1 240px',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('catalog.setImportRepoUrl') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-import-repo-ref',
                            placeholder: 'Ref (optional, default: default branch)',
                            value: () => app.importRepoRef(),
                            style: {
                                flex: '0 0 160px',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('catalog.setImportRepoRef') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-import-repo-sub',
                            placeholder: 'Subdirectory (optional)',
                            value: () => app.importRepoSubdirectory(),
                            style: {
                                flex: '0 0 140px',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('catalog.setImportRepoSubdirectory') } },
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-import-repo ui-button ui-button-primary',
                            type: 'button',
                            disabled: () => app.importStatus() === 'importing',
                            style: () => ({
                                padding: '6px 16px',
                                borderRadius: '4px',
                                background: 'var(--accent, #58a6ff)',
                                border: 'none',
                                color: 'var(--on-accent, #0d1117)',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: app.importStatus() === 'importing' ? 'not-allowed' : 'pointer',
                                opacity: app.importStatus() === 'importing' ? 0.7 : 1,
                            }),
                        },
                        intents: { activate: { action: command('catalog.runImportRepo') } },
                        children: [text(() => (app.importStatus() === 'importing' ? 'Importing...' : 'Import Repository'))],
                    }),
                ],
            }),
            when(
                () => app.importStatus() === 'error',
                () => element('Text', {
                    props: { class: 'import-error-msg', style: { color: '#f85149', fontSize: '12px', marginTop: '8px', display: 'block' } },
                    children: [text(() => app.importError() ?? 'Import failed')],
                }),
            ),
            when(
                () => app.importStatus() === 'success' && app.importResult() !== null,
                () => {
                    const res = app.importResult();
                    if (!res) return element('EmptyNode');
                    return renderImportResult(res);
                },
            ),
        ],
    });
}
