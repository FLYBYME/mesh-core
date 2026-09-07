import {
    element,
    text,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { CatalogApi } from '../contract.js';
import { UI_DETAIL_SURFACE, UI_PROPERTY_GRID } from '../../ui/contract.js';

export function renderVersionProvenanceCard(app: CatalogApi): Described {
    return element(UI_DETAIL_SURFACE, {
        props: {
            class: 'version-provenance-card',
            selected: () => app.selectedVersion() !== null,
            placeholderTitle: 'No Version Selected',
            placeholderMessage: 'Select a version above to inspect its provenance and build details.',
            title: 'Version Provenance & Build Details',
            badge: () => {
                const v = app.selectedVersion();
                return v ? `${v.partName}@${v.version}` : '';
            },
        },
        children: [
            element(UI_PROPERTY_GRID, {
                props: {
                    columns: '180px 1fr',
                    gap: 8,
                },
                children: [
                    element('Span', { children: [text('Exact Commit:')] }),
                    element('Span', {
                        props: { code: true },
                        children: [text(() => app.selectedVersion()?.commit ?? '')],
                    }),

                    element('Span', { children: [text('Source Repository:')] }),
                    element('Span', { children: [text(() => app.selectedVersion()?.repository ?? '(inherited from part)')] }),

                    element('Span', { children: [text('Build Entry:')] }),
                    element('Span', {
                        children: [text(() => {
                            const v = app.selectedVersion();
                            if (!v) return '';
                            return `${v.subdirectory ? `[${v.subdirectory}] ` : ''}${v.entry}`;
                        })],
                    }),

                    element('Span', { children: [text('Artifact Digest:')] }),
                    element('Span', {
                        props: { code: true },
                        children: [text(() => app.selectedVersion()?.artifactDigest ?? 'Not yet built (declared)')],
                    }),

                    element('Span', { children: [text('Target Kernel:')] }),
                    element('Span', { children: [text(() => app.selectedVersion()?.kernel ?? 'Any')] }),

                    element('Span', { children: [text('Contract Requirements:')] }),
                    element('Span', {
                        children: [
                            text(() => {
                                const v = app.selectedVersion();
                                if (!v) return 'None (no mesh contracts declared)';
                                return v.requires && v.requires.length > 0
                                    ? v.requires.join(', ')
                                    : 'None (no mesh contracts declared)';
                            }),
                        ],
                    }),

                    element('Span', { children: [text('Capabilities (Needs):')] }),
                    element('Span', {
                        children: [
                            text(() => {
                                const v = app.selectedVersion();
                                if (!v) return 'None';
                                return v.capabilities.needs && v.capabilities.needs.length > 0
                                    ? v.capabilities.needs.join(', ')
                                    : 'None';
                            }),
                        ],
                    }),

                    element('Span', { children: [text('Capabilities (Provides):')] }),
                    element('Span', {
                        children: [
                            text(() => {
                                const v = app.selectedVersion();
                                if (!v) return 'None';
                                return v.capabilities.provides && v.capabilities.provides.length > 0
                                    ? v.capabilities.provides.join(', ')
                                    : 'None';
                            }),
                        ],
                    }),

                    element('Span', { children: [text('Required Parts:')] }),
                    element('Span', {
                        children: [
                            text(() => {
                                const v = app.selectedVersion();
                                if (!v) return 'None';
                                return v.requiredParts && v.requiredParts.length > 0
                                    ? v.requiredParts.map((rp) => `${rp.id} (${rp.version})`).join(', ')
                                    : 'None';
                            }),
                        ],
                    }),

                    element('Span', { children: [text('Changelog:')] }),
                    element('Span', {
                        props: { style: { whiteSpace: 'pre-wrap', color: 'var(--ink-dim)' } },
                        children: [text(() => app.selectedVersion()?.changelog ?? 'No changelog recorded with this release.')],
                    }),
                ],
            }),
        ],
    });
}
