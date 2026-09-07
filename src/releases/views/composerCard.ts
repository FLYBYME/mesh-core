import {
    command,
    each,
    element,
    text,
    when,
    type Json,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { CdnComposeInputPart, CdnComposeOutput } from '../../generated/api.js';
import { UI_SELECT } from '../../ui/contract.js';
import { renderForm } from '../../ui/views/schemaForm.js';
import { COMPOSE_FORM_SCHEMA, type ReleasesApi } from '../contract.js';

function partsToJson(parts: readonly CdnComposeInputPart[]): readonly Json[] {
    const list: Json[] = [];
    for (const p of parts) {
        list.push({
            id: p.id,
            version: p.version,
            kind: p.kind,
        });
    }
    return list;
}

function renderPartRow(item: () => CdnComposeInputPart & { index: number }): Described {
    return element('Grid', {
        props: {
            columns: '140px 140px 120px 40px',
            gap: 8,
            class: () => `part-row composer-part-row part-row-${item().index}`,
            style: { alignItems: 'center', padding: '2px 0' },
        },
        children: [
            element('Input', {
                props: {
                    class: () => `input-part-id input-part-id-${item().index}`,
                    type: 'text',
                    placeholder: 'e.g. chrome',
                    value: () => item().id,
                    style: {
                        padding: '4px 8px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        background: 'var(--surface, #21262d)',
                        border: '1px solid var(--edge, #30363d)',
                        color: 'var(--ink, #e6edf3)',
                    },
                },
                intents: {
                    change: {
                        action: command('releases.updatePartId', String(item().index)),
                    },
                },
            }),
            element('Input', {
                props: {
                    class: () => `input-part-version input-part-version-${item().index}`,
                    type: 'text',
                    placeholder: '^1.0.0',
                    value: () => item().version,
                    style: {
                        padding: '4px 8px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        background: 'var(--surface, #21262d)',
                        border: '1px solid var(--edge, #30363d)',
                        color: 'var(--ink, #e6edf3)',
                    },
                },
                intents: {
                    change: {
                        action: command('releases.updatePartVersion', String(item().index)),
                    },
                },
            }),
            element(UI_SELECT, {
                props: {
                    class: () => `select-part-kind select-part-kind-${item().index}`,
                    value: () => item().kind,
                    options: [
                        { value: 'application', label: 'application' },
                        { value: 'extension', label: 'extension' },
                    ],
                    style: {
                        padding: '4px 8px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        background: 'var(--surface, #21262d)',
                        border: '1px solid var(--edge, #30363d)',
                        color: 'var(--ink, #e6edf3)',
                    },
                },
                intents: {
                    change: {
                        action: command('releases.updatePartKind', String(item().index)),
                    },
                },
            }),
            element('Button', {
                props: {
                    class: () => `btn-remove-part btn-remove-part-${item().index}`,
                    type: 'button',
                    title: 'Remove part',
                    style: {
                        padding: '4px 8px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        background: 'transparent',
                        border: '1px solid var(--edge, #30363d)',
                        color: 'var(--error, #f85149)',
                        cursor: 'pointer',
                    },
                },
                intents: {
                    activate: {
                        action: command('releases.removeComposePart', String(item().index)),
                    },
                },
                children: [text('×')],
            }),
        ],
    });
}

function renderPartsGroup(app: ReleasesApi): Described {
    return element('Stack', {
        props: {
            class: 'compose-parts-group composer-parts-list',
            style: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' },
        },
        children: [
            element('Grid', {
                props: {
                    columns: '140px 140px 120px 40px',
                    gap: 8,
                    class: 'parts-table-header',
                    style: {
                        fontSize: '11px',
                        fontWeight: '600',
                        color: 'var(--ink-dim, #8b949e)',
                        padding: '4px 8px',
                        background: 'var(--surface, #21262d)',
                        borderRadius: '4px',
                    },
                },
                children: [
                    element('Span', { children: [text('Part ID')] }),
                    element('Span', { children: [text('Version Range')] }),
                    element('Span', { children: [text('Kind')] }),
                    element('Span', { children: [text('')] }),
                ],
            }),
            when(
                () => app.composeParts().length === 0,
                () => element('Text', {
                    props: {
                        class: 'empty-parts-message',
                        style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', padding: '8px' },
                    },
                    children: [text('No parts added. Click "+ Add Part" below.')],
                }),
            ),
            each(
                () => app.composeParts().map((p, idx) => ({ ...p, index: idx })),
                (item) => `${item.index}`,
                (item) => renderPartRow(item),
            ),
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'flex-start', marginTop: '4px' } },
                children: [
                    element('Button', {
                        props: {
                            class: 'btn-add-part',
                            type: 'button',
                            style: {
                                padding: '4px 10px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('releases.addComposePart') } },
                        children: [text('+ Add Part')],
                    }),
                ],
            }),
        ],
    });
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
            renderForm({
                schema: COMPOSE_FORM_SCHEMA,
                class: 'release-composer-form',
                values: () => ({
                    name: app.composeName(),
                    kernel: app.composeKernel(),
                    parts: partsToJson(app.composeParts()),
                }),
                onFieldChange: 'releases.setField',
                onSubmit: 'releases.commitCompose',
                submitLabel: () => (app.composeStatus() === 'composing' ? 'Composing...' : '✓ Compose Release'),
                disabled: () => app.composeStatus() === 'composing',
                overrides: {
                    fieldOrder: ['name', 'kernel', 'parts'],
                    fields: {
                        name: {
                            label: 'Release Label',
                            hint: 'Human label for this release',
                            placeholder: 'e.g. Release 0.2.0',
                        },
                        kernel: {
                            label: 'Kernel Range',
                            hint: 'Target kernel version range',
                            placeholder: '^major.minor',
                        },
                        parts: {
                            label: 'Parts & Version Requirements',
                            hint: 'Repeating group of parts: ID, version range requirement, and part kind',
                            renderControl: () => renderPartsGroup(app),
                        },
                    },
                    renderActions: () => element('Row', {
                        props: {
                            style: { display: 'flex', gap: '10px', marginTop: '14px', marginBottom: '14px' },
                        },
                        children: [
                            element('Button', {
                                props: {
                                    class: 'btn-dryrun-compose',
                                    type: 'button',
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
                                    disabled: () => app.composeStatus() === 'composing',
                                },
                                intents: { activate: { action: command('releases.dryRunCompose') } },
                                children: [text(() => (app.composeStatus() === 'composing' ? 'Inspecting...' : '⚡ Inspect Resolution (Dry Run)'))],
                            }),
                            element('Button', {
                                props: {
                                    class: 'ui-button ui-button-primary btn-commit-compose btn-submit',
                                    type: 'submit',
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
                                    disabled: () => app.composeStatus() === 'composing',
                                },
                                intents: { activate: { action: command('releases.commitCompose') } },
                                children: [text(() => (app.composeStatus() === 'composing' ? 'Composing...' : '✓ Compose Release'))],
                            }),
                        ],
                    }),
                },
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
