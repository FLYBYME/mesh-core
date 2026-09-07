import {
    command,
    each,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { BuilderReleaseRepoOutput } from '../../generated/api.js';
import { UI_SELECT } from '../../ui/contract.js';
import type { CatalogApi } from '../contract.js';

function renderReleaseRepoResult(res: BuilderReleaseRepoOutput): Described {
    const hasReleased = res.released.length > 0;
    const hasFailed = res.failed.length > 0;

    return element('Stack', {
        props: {
            class: 'repo-release-result-box',
            style: {
                marginTop: '12px',
                padding: '12px',
                background: hasFailed ? 'rgba(210, 153, 34, 0.08)' : 'rgba(63, 185, 80, 0.08)',
                border: hasFailed ? '1px solid #d29922' : '1px solid #3fb950',
                borderRadius: '6px',
                fontSize: '12px',
            },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' } },
                children: [
                    element('Span', {
                        props: { bold: true, style: { color: hasFailed ? '#d29922' : '#3fb950', fontSize: '13px' } },
                        children: [text(`${String(res.released.length)} released, ${String(res.failed.length)} failed from ${res.repository}`)],
                    }),
                ],
            }),

            // Released list
            when(
                () => hasReleased,
                () => element('Stack', {
                    props: { class: 'repo-released-section', style: { marginBottom: hasFailed ? '12px' : '0' } },
                    children: [
                        element('Heading', {
                            props: { level: 4, style: { margin: '0 0 6px 0', fontSize: '12px', color: '#3fb950' } },
                            children: [text(`Released Parts (${String(res.released.length)}):`)],
                        }),
                        element('Stack', {
                            props: { class: 'repo-released-list', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                            children: [
                                each(
                                    () => res.released,
                                    (item) => item.part,
                                    (item) => element('Row', {
                                        props: {
                                            class: () => `repo-released-item repo-released-${item().part}`,
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
                                                    element('Span', { props: { bold: true }, children: [text(() => `${item().part}@${item().version}`)] }),
                                                    element('Span', {
                                                        props: { code: true, style: { fontFamily: 'monospace', fontSize: '11px', color: '#58a6ff' } },
                                                        children: [text(() => {
                                                            const d = item().artifactDigest;
                                                            return d ? `${d.slice(0, 16)}...` : '';
                                                        })],
                                                    }),
                                                ],
                                            }),
                                            element('Span', {
                                                props: { style: { fontSize: '11px', color: 'var(--ink-dim, #8b949e)' } },
                                                children: [text(() => `${item().commit.slice(0, 8)}${item().cached ? ' (cached)' : ''}`)],
                                            }),
                                        ],
                                    }),
                                ),
                            ],
                        }),
                    ],
                }),
            ),

            // Failed list
            when(
                () => hasFailed,
                () => element('Stack', {
                    props: { class: 'repo-failed-section' },
                    children: [
                        element('Heading', {
                            props: { level: 4, style: { margin: '0 0 6px 0', fontSize: '12px', color: '#f85149' } },
                            children: [text(`Failed Parts (${String(res.failed.length)}):`)],
                        }),
                        element('Stack', {
                            props: { class: 'repo-failed-list', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                            children: [
                                each(
                                    () => res.failed,
                                    (fail) => fail.part,
                                    (fail) => element('Row', {
                                        props: {
                                            class: () => `repo-failed-item repo-failed-${fail().part}`,
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '4px 8px',
                                                background: 'rgba(248, 81, 73, 0.1)',
                                                border: '1px solid rgba(248, 81, 73, 0.3)',
                                                borderRadius: '4px',
                                            },
                                        },
                                        children: [
                                            element('Span', {
                                                props: { bold: true, style: { color: '#f85149' } },
                                                children: [text(() => fail().part)],
                                            }),
                                            element('Span', {
                                                props: { style: { color: '#f85149', fontSize: '11px' } },
                                                children: [text(() => fail().reason)],
                                            }),
                                        ],
                                    }),
                                ),
                            ],
                        }),
                    ],
                }),
            ),
        ],
    });
}

export function renderReleaseRepoCard(app: CatalogApi): Described {
    const targetRepo = (): string => {
        const p = app.selectedPart();
        return p?.repository ?? app.importRepoUrl() ?? '';
    };

    return element('Card', {
        props: {
            class: 'catalog-release-repo-card',
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
                        children: [text('Release Repository (builder.release_repo)')],
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
                        children: [text('Kernels First Order')],
                    }),
                ],
            }),
            element('Text', {
                props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)', display: 'block', marginBottom: '14px', lineHeight: '1.4' } },
                children: [
                    text('Release every part declared from this repository together in dependency order (kernels first). Both successes and failures are reported.'),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } },
                children: [
                    element('Span', {
                        props: { style: { fontSize: '12px', color: 'var(--ink-dim, #8b949e)' } },
                        children: [text(() => `Target: ${targetRepo() || '(no repository selected)'}`)],
                    }),
                    element('Span', { props: { style: { fontSize: '12px', fontWeight: '500' } }, children: [text('Bump:')] }),
                    element(UI_SELECT, {
                        props: {
                            class: 'select-repo-release-bump',
                            value: () => app.repoReleaseBump(),
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
                        intents: { change: { action: command('catalog.setRepoReleaseBump') } },
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-release-repo ui-button ui-button-primary',
                            type: 'button',
                            disabled: () => app.repoReleaseStatus() === 'releasing' || !targetRepo(),
                            style: () => ({
                                padding: '6px 16px',
                                borderRadius: '4px',
                                background: '#1f6feb',
                                border: 'none',
                                color: '#ffffff',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: (app.repoReleaseStatus() === 'releasing' || !targetRepo()) ? 'not-allowed' : 'pointer',
                                opacity: (app.repoReleaseStatus() === 'releasing' || !targetRepo()) ? 0.7 : 1,
                            }),
                        },
                        intents: { activate: { action: command('catalog.runReleaseRepo') } },
                        children: [text(() => (app.repoReleaseStatus() === 'releasing' ? 'Releasing...' : '📦 Release All Parts'))],
                    }),
                ],
            }),
            when(
                () => app.repoReleaseStatus() === 'error',
                () => element('Text', {
                    props: { class: 'repo-release-error-msg', style: { color: '#f85149', fontSize: '12px', marginTop: '8px', display: 'block' } },
                    children: [text(() => app.repoReleaseError() ?? 'Repository release failed')],
                }),
            ),
            when(
                () => app.repoReleaseStatus() === 'success' && app.repoReleaseResult() !== null,
                () => {
                    const res = app.repoReleaseResult();
                    if (!res) return element('EmptyNode');
                    return renderReleaseRepoResult(res);
                },
            ),
        ],
    });
}
