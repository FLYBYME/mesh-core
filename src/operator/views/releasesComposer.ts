import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { CdnComposeOutput } from '../../generated/api.js';
import type { ReleasesFormSignals } from '../commands/releases.js';
import type { OperatorStateBundle } from '../state.js';
import { renderPartsGroup } from './releasesComposerParts.js';

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
                marginTop: '12px',
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
                                props: { class: 'compose-problem-item', style: { color: '#f85149', marginBottom: '4px' } },
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

export function renderReleasesComposer(_state: OperatorStateBundle, forms: ReleasesFormSignals): Described {
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
            element('Stack', {
                props: { class: 'release-composer-form', style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                children: [
                    element('Stack', {
                        children: [
                            element('Text', { props: { style: { fontSize: '12px', fontWeight: '500', marginBottom: '4px' } }, children: [text('Release Label')] }),
                            element('Input', {
                                props: {
                                    class: 'input-name',
                                    placeholder: 'e.g. Release 0.2.0',
                                    value: forms.composeName,
                                    style: { padding: '6px 10px', fontSize: '12px', borderRadius: '4px', background: 'var(--surface, #21262d)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)' },
                                },
                                intents: { change: { action: command('operator.setComposeName') } },
                            }),
                        ],
                    }),
                    element('Stack', {
                        children: [
                            element('Text', { props: { style: { fontSize: '12px', fontWeight: '500', marginBottom: '4px' } }, children: [text('Kernel Range')] }),
                            element('Input', {
                                props: {
                                    class: 'input-kernel',
                                    placeholder: '^major.minor',
                                    value: forms.composeKernel,
                                    style: { padding: '6px 10px', fontSize: '12px', borderRadius: '4px', background: 'var(--surface, #21262d)', border: '1px solid var(--edge, #30363d)', color: 'var(--ink, #e6edf3)' },
                                },
                                intents: { change: { action: command('operator.setComposeKernel') } },
                            }),
                        ],
                    }),
                    element('Stack', {
                        children: [
                            element('Text', { props: { style: { fontSize: '12px', fontWeight: '500', marginBottom: '4px' } }, children: [text('Parts & Version Requirements')] }),
                            renderPartsGroup(forms),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' } },
                        children: [
                            element('Input', {
                                props: {
                                    type: 'checkbox',
                                    class: 'input-rolling input-compose-rolling',
                                    checked: forms.composeRolling,
                                },
                                intents: { change: { action: command('operator.setComposeRolling') } },
                            }),
                            element('Span', {
                                props: { style: { fontSize: '12px', color: 'var(--ink, #e6edf3)' } },
                                children: [text('Track version ranges and automatically re-compose on new part versions')],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '10px', marginTop: '10px' } },
                        children: [
                            element('Button', {
                                props: {
                                    class: 'btn-dryrun-compose',
                                    disabled: () => forms.composeStatus() === 'composing',
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
                                intents: { activate: { action: command('operator.runDryRunCompose') } },
                                children: [text(() => (forms.composeStatus() === 'composing' ? 'Inspecting…' : '⚡ Inspect Resolution (Dry Run)'))],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-commit-compose btn-submit',
                                    disabled: () => forms.composeStatus() === 'composing',
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
                                intents: { activate: { action: command('operator.runCommitCompose') } },
                                children: [text(() => (forms.composeStatus() === 'composing' ? 'Composing…' : '✓ Compose Release'))],
                            }),
                        ],
                    }),
                ],
            }),
            when(
                () => forms.composeStatus() === 'error',
                () => element('Card', {
                    props: {
                        class: 'compose-error-card',
                        style: {
                            marginTop: '12px',
                            padding: '10px 12px',
                            background: 'rgba(248, 81, 73, 0.1)',
                            border: '1px solid #f85149',
                            color: '#f85149',
                            borderRadius: '4px',
                            fontSize: '12px',
                        },
                    },
                    children: [text(() => forms.composeError() ?? 'Composition error')],
                }),
            ),
            when(
                () => forms.composeStatus() === 'success' && forms.composeResult() !== null,
                () => {
                    const res = forms.composeResult();
                    if (res === null) return element('EmptyNode');
                    return renderComposeResultBox(res);
                },
            ),
        ],
    });
}
