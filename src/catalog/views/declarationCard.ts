import {
    command,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { CatalogApi } from '../contract.js';

export function renderDeclarationCard(app: CatalogApi): Described {
    return element('Card', {
        props: {
            class: 'catalog-declaration-card',
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
                        children: [text('Part Declaration (catalog.declare)')],
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
                        children: [text('Build Intent')],
                    }),
                ],
            }),
            element('Text', {
                props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', display: 'block', marginBottom: '14px', lineHeight: '1.4' } },
                children: [
                    text('Configure how this part is built from source without publishing a new version. This replaces editing mesh.json by hand.'),
                ],
            }),
            element('Grid', {
                props: {
                    columns: '140px 1fr',
                    gap: 10,
                    style: { fontSize: '12px', alignItems: 'center', marginBottom: '14px' },
                },
                children: [
                    element('Span', { props: { bold: true }, children: [text('Source Entry:')] }),
                    element('Input', {
                        props: {
                            class: 'input-declaration-entry',
                            placeholder: 'e.g. src/index.ts',
                            value: () => app.declarationEntry(),
                            style: {
                                padding: '6px 10px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('catalog.setDeclarationEntry') } },
                    }),

                    element('Span', { props: { bold: true }, children: [text('Branch / Ref:')] }),
                    element('Input', {
                        props: {
                            class: 'input-declaration-branch',
                            placeholder: 'HEAD',
                            value: () => app.declarationBranch(),
                            style: {
                                padding: '6px 10px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('catalog.setDeclarationBranch') } },
                    }),

                    element('Span', { props: { bold: true }, children: [text('Kernel Range:')] }),
                    element('Input', {
                        props: {
                            class: 'input-declaration-kernel',
                            placeholder: '^0.15',
                            value: () => app.declarationKernel(),
                            style: {
                                padding: '6px 10px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('catalog.setDeclarationKernel') } },
                    }),

                    element('Span', { props: { bold: true }, children: [text('Requires:')] }),
                    element('Input', {
                        props: {
                            class: 'input-declaration-requires',
                            placeholder: 'part.find, cdn.deploy',
                            value: () => app.declarationRequires(),
                            style: {
                                padding: '6px 10px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('catalog.setDeclarationRequires') } },
                    }),

                    element('Span', { props: { bold: true }, children: [text('Subdirectory:')] }),
                    element('Input', {
                        props: {
                            class: 'input-declaration-sub',
                            placeholder: 'Optional subdirectory (for monorepos)',
                            value: () => app.declarationSubdirectory(),
                            style: {
                                padding: '6px 10px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('catalog.setDeclarationSubdirectory') } },
                    }),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
                children: [
                    element('Button', {
                        props: {
                            class: 'btn-save-declaration ui-button ui-button-primary',
                            type: 'button',
                            disabled: () => app.declarationStatus() === 'saving',
                            style: () => ({
                                padding: '6px 16px',
                                borderRadius: '4px',
                                background: 'var(--accent, #58a6ff)',
                                border: 'none',
                                color: 'var(--on-accent, #0d1117)',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: app.declarationStatus() === 'saving' ? 'not-allowed' : 'pointer',
                                opacity: app.declarationStatus() === 'saving' ? 0.7 : 1,
                            }),
                        },
                        intents: { activate: { action: command('catalog.runSaveDeclaration') } },
                        children: [text(() => (app.declarationStatus() === 'saving' ? 'Saving...' : 'Save Declaration'))],
                    }),
                ],
            }),
            when(
                () => app.declarationStatus() === 'error',
                () => element('Text', {
                    props: { class: 'declaration-error-msg', style: { color: '#f85149', fontSize: '12px', marginTop: '8px', display: 'block' } },
                    children: [text(() => app.declarationError() ?? 'Failed to save declaration')],
                }),
            ),
            when(
                () => app.declarationStatus() === 'success',
                () => element('Text', {
                    props: { class: 'declaration-success-msg', style: { color: '#3fb950', fontSize: '12px', marginTop: '8px', display: 'block' } },
                    children: [text(() => {
                        const res = app.declarationResult();
                        return res ? `Declaration saved for ${res.name} (${res.existed ? 'updated' : 'created'}).` : 'Declaration saved.';
                    })],
                }),
            ),
        ],
    });
}
