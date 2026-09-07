import {
    command,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { BuilderReleasePartOutput } from '../../generated/api.js';
import { UI_SELECT } from '../../ui/contract.js';
import type { CatalogApi } from '../contract.js';

function renderReleasePartResult(res: BuilderReleasePartOutput): Described {
    return element('Stack', {
        props: {
            class: 'part-release-result-box',
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
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
                children: [
                    element('Span', {
                        props: { bold: true, style: { color: '#3fb950', fontSize: '13px' } },
                        children: [text(`Released ${res.part}@${res.version}${res.cached ? ' (cached)' : ''}`)],
                    }),
                    element('Span', {
                        props: { code: true, style: { fontFamily: 'monospace', color: 'var(--ink-dim, #8b949e)' } },
                        children: [text(`commit: ${res.commit.slice(0, 10)}`)],
                    }),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                children: [
                    element('Span', { props: { bold: true }, children: [text('Artifact Digest:')] }),
                    element('Span', {
                        props: { code: true, style: { fontFamily: 'monospace', color: '#58a6ff' } },
                        children: [text(res.artifactDigest ?? 'Not emitted')],
                    }),
                ],
            }),
        ],
    });
}

export function renderReleasePartCard(app: CatalogApi): Described {
    return element('Card', {
        props: {
            class: 'catalog-release-part-card',
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
                        children: [text('Release Part (builder.release_part)')],
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
                        children: [text('Mints Version & Builds')],
                    }),
                ],
            }),
            element('Text', {
                props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', display: 'block', marginBottom: '14px', lineHeight: '1.4' } },
                children: [
                    text('Pull the repository at this part\'s branch, mint the next version, publish, and build its artifact.'),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } },
                children: [
                    element('Span', { props: { style: { fontSize: '12px', fontWeight: '500' } }, children: [text('Version Bump:')] }),
                    element(UI_SELECT, {
                        props: {
                            class: 'select-part-release-bump',
                            value: () => app.partReleaseBump(),
                            options: [
                                { value: 'patch', label: 'patch' },
                                { value: 'minor', label: 'minor' },
                                { value: 'major', label: 'major' },
                            ],
                            style: {
                                padding: '6px 10px',
                                borderRadius: '4px',
                                background: 'var(--surface, #21262d)',
                                border: '1px solid var(--edge, #30363d)',
                                color: 'var(--ink, #e6edf3)',
                                fontSize: '12px',
                            },
                        },
                        intents: { change: { action: command('catalog.setPartReleaseBump') } },
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-release-part ui-button ui-button-primary',
                            type: 'button',
                            disabled: () => app.partReleaseStatus() === 'releasing',
                            style: () => ({
                                padding: '6px 16px',
                                borderRadius: '4px',
                                background: '#238636',
                                border: 'none',
                                color: '#ffffff',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: app.partReleaseStatus() === 'releasing' ? 'not-allowed' : 'pointer',
                                opacity: app.partReleaseStatus() === 'releasing' ? 0.7 : 1,
                            }),
                        },
                        intents: { activate: { action: command('catalog.runReleasePart') } },
                        children: [text(() => (app.partReleaseStatus() === 'releasing' ? 'Releasing...' : '🚀 Release Part'))],
                    }),
                ],
            }),
            when(
                () => app.partReleaseStatus() === 'error',
                () => element('Text', {
                    props: { class: 'part-release-error-msg', style: { color: '#f85149', fontSize: '12px', marginTop: '8px', display: 'block' } },
                    children: [text(() => app.partReleaseError() ?? 'Release failed')],
                }),
            ),
            when(
                () => app.partReleaseStatus() === 'success' && app.partReleaseResult() !== null,
                () => {
                    const res = app.partReleaseResult();
                    if (!res) return element('EmptyNode');
                    return renderReleasePartResult(res);
                },
            ),
        ],
    });
}
