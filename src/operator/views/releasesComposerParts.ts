import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { CdnComposeInputPart } from '../../generated/api.js';
import { UI_SELECT } from '../../ui/contract.js';
import type { ReleasesFormSignals } from '../commands/releases.js';

function renderPartRow(item: () => CdnComposeInputPart & { index: number }): Described {
    return element('Grid', {
        props: {
            columns: '140px 140px 120px 40px',
            gap: 8,
            class: () => `part-row composer-part-row part-row-${String(item().index)}`,
            style: { alignItems: 'center', padding: '2px 0' },
        },
        children: [
            element('Input', {
                props: {
                    class: () => `input-part-id input-part-id-${String(item().index)}`,
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
                        action: command('operator.updateComposePartId', String(item().index)),
                    },
                },
            }),
            element('Input', {
                props: {
                    class: () => `input-part-version input-part-version-${String(item().index)}`,
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
                        action: command('operator.updateComposePartVersion', String(item().index)),
                    },
                },
            }),
            element(UI_SELECT, {
                props: {
                    class: () => `select-part-kind select-part-kind-${String(item().index)}`,
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
                        action: command('operator.updateComposePartKind', String(item().index)),
                    },
                },
            }),
            element('Button', {
                props: {
                    class: () => `btn-remove-part btn-remove-part-${String(item().index)}`,
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
                        action: command('operator.removeComposePart', String(item().index)),
                    },
                },
                children: [text('×')],
            }),
        ],
    });
}

export function renderPartsGroup(forms: ReleasesFormSignals): Described {
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
                () => forms.composeParts().length === 0,
                () => element('Text', {
                    props: {
                        class: 'empty-parts-message',
                        style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', padding: '8px' },
                    },
                    children: [text('No parts added. Click "+ Add Part" below.')],
                }),
            ),
            each(
                () => forms.composeParts().map((p, idx) => ({ ...p, index: idx })),
                (item) => `${String(item.index)}`,
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
                        intents: { activate: { action: command('operator.addComposePart') } },
                        children: [text('+ Add Part')],
                    }),
                ],
            }),
        ],
    });
}
