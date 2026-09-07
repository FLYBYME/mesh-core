import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { CdnComposeOutput } from '../../generated/api.js';
import type { ReleasesApi } from '../contract.js';

function renderComposerInputs(app: ReleasesApi): Described[] {
    return [
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
                        // A shape, not a version. A placeholder naming a real kernel is a
                        // hardcoded version wearing a disguise, and goes stale the same way.
                        placeholder: '^major.minor',
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
                        placeholder: 'part-id: ^major.minor.patch\nanother-part: ^major.minor.patch',
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
    ];
}

function renderComposeResultBox(res: CdnComposeOutput): Described {
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
}

export function renderComposerCard(app: ReleasesApi): Described {
    return element('Card', {
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
            ...renderComposerInputs(app),
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
                    return renderComposeResultBox(res);
                },
            ),
        ],
    });
}
