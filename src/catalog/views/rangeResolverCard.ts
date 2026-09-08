import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { CatalogResolveOutput } from '../../generated/api.js';
import type { CatalogApi } from '../contract.js';

function renderResolveResultBox(r: CatalogResolveOutput): Described {
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
}

export function renderRangeResolverCard(app: CatalogApi): Described {
    return element('Card', {
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
                            disabled: () => app.resolveStatus() === 'resolving',
                            style: () => ({
                                padding: '5px 14px',
                                borderRadius: '4px',
                                background: 'var(--accent, #58a6ff)',
                                border: 'none',
                                color: 'var(--on-accent, #0d1117)',
                                fontWeight: '600',
                                cursor: app.resolveStatus() === 'resolving' ? 'not-allowed' : 'pointer',
                                opacity: app.resolveStatus() === 'resolving' ? 0.7 : 1,
                                fontSize: '12px',
                            }),
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
                    return renderResolveResultBox(r);
                },
            ),
        ],
    });
}
