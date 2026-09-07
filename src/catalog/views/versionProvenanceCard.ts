import {
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { CatalogApi } from '../contract.js';

export function renderVersionProvenanceCard(app: CatalogApi): Described {
    return when(
        () => app.selectedVersion() !== null,
        () => {
            const v = app.selectedVersion();
            if (v === null) return element('EmptyNode');
            return element('Card', {
                props: {
                    class: 'version-provenance-card',
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
                        props: { level: 3, style: { margin: '0 0 12px 0', fontSize: '15px' } },
                        children: [
                            text(() => `Version Provenance & Build Details: ${v.partName}@${v.version}`),
                        ],
                    }),
                    element('Grid', {
                        props: {
                            columns: '180px 1fr',
                            gap: 8,
                            style: { fontSize: '13px', alignItems: 'baseline' },
                        },
                        children: [
                            element('Span', { props: { bold: true }, children: [text('Exact Commit:')] }),
                            element('Span', {
                                props: { code: true, style: { fontFamily: 'monospace', color: '#58a6ff' } },
                                children: [text(v.commit)],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Source Repository:')] }),
                            element('Span', { children: [text(v.repository ?? '(inherited from part)')] }),

                            element('Span', { props: { bold: true }, children: [text('Build Entry:')] }),
                            element('Span', {
                                children: [text(`${v.subdirectory ? `[${v.subdirectory}] ` : ''}${v.entry}`)],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Artifact Digest:')] }),
                            element('Span', {
                                props: { code: true, style: { fontFamily: 'monospace' } },
                                children: [text(v.artifactDigest ?? 'Not yet built (declared)')],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Target Kernel:')] }),
                            element('Span', { children: [text(v.kernel ?? 'Any')] }),

                            element('Span', { props: { bold: true }, children: [text('Contract Requirements:')] }),
                            element('Span', {
                                children: [
                                    text(v.requires && v.requires.length > 0
                                        ? v.requires.join(', ')
                                        : 'None (no mesh contracts declared)'),
                                ],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Capabilities (Needs):')] }),
                            element('Span', {
                                children: [
                                    text(v.capabilities.needs && v.capabilities.needs.length > 0
                                        ? v.capabilities.needs.join(', ')
                                        : 'None'),
                                ],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Capabilities (Provides):')] }),
                            element('Span', {
                                children: [
                                    text(v.capabilities.provides && v.capabilities.provides.length > 0
                                        ? v.capabilities.provides.join(', ')
                                        : 'None'),
                                ],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Required Parts:')] }),
                            element('Span', {
                                children: [
                                    text(v.requiredParts && v.requiredParts.length > 0
                                        ? v.requiredParts.map((rp) => `${rp.id} (${rp.version})`).join(', ')
                                        : 'None'),
                                ],
                            }),

                            element('Span', { props: { bold: true }, children: [text('Changelog:')] }),
                            element('Span', {
                                props: { style: { whiteSpace: 'pre-wrap', color: 'var(--ink-dim, #8b949e)' } },
                                children: [text(v.changelog ?? 'No changelog recorded with this release.')],
                            }),
                        ],
                    }),
                ],
            });
        },
    );
}
