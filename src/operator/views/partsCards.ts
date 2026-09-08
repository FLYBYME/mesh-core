import {
    command,
    element,
    text,
    when,
    type Node as Described,
} from '@flybyme/mesh-web';

import type { CatalogFormSignals } from '../commands/parts.js';
import type { PartFindOutputItem } from '../../generated/api.js';
import { renderRefusedControl } from './common.js';

export function renderImportRepoCard(forms: CatalogFormSignals): Described {
    return element('Card', {
        props: {
            class: 'catalog-import-repo-card',
            style: {
                padding: '16px',
                background: 'var(--surface, #161b22)',
                borderRadius: '6px',
                border: '1px solid var(--edge, #30363d)',
                marginBottom: '16px',
            },
        },
        children: [
            element('Heading', {
                props: { level: 3, style: { fontSize: '14px', margin: '0 0 10px 0' } },
                children: [text('Import Repository (builder.import_repo)')],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '8px', marginBottom: '8px' } },
                children: [
                    element('Input', {
                        props: {
                            class: 'input-import-repo-url',
                            placeholder: 'Repository URL (e.g. https://github.com/FLYBYME/mesh-core)',
                            value: forms.importRepoUrl,
                            style: { flex: '1 1 auto', padding: '4px 8px', fontSize: '12px' },
                        },
                        intents: { change: { action: command('operator.setImportRepoUrl') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-import-repo-ref',
                            placeholder: 'Ref (HEAD, tag, SHA)',
                            value: forms.importRepoRef,
                            style: { width: '120px', padding: '4px 8px', fontSize: '12px' },
                        },
                        intents: { change: { action: command('operator.setImportRepoRef') } },
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-import-repo',
                            disabled: () => forms.importStatus() === 'importing',
                            style: { padding: '4px 12px', fontSize: '12px', cursor: 'pointer' },
                        },
                        intents: { activate: { action: command('operator.runImportRepo') } },
                        children: [text(() => (forms.importStatus() === 'importing' ? 'Importing…' : 'Import'))],
                    }),
                ],
            }),
            when(
                () => forms.importError() !== null,
                () => element('Text', {
                    props: { style: { color: 'var(--danger, #f85149)', fontSize: '12px' } },
                    children: [text(() => forms.importError() ?? '')],
                }),
            ),
        ],
    });
}

export function renderDeclarationCard(
    forms: CatalogFormSignals,
    part: () => PartFindOutputItem | null,
): Described {
    return element('Card', {
        props: {
            class: 'catalog-declaration-card',
            style: {
                padding: '16px',
                background: 'var(--surface, #161b22)',
                borderRadius: '6px',
                border: '1px solid var(--edge, #30363d)',
                marginBottom: '16px',
            },
        },
        children: [
            element('Row', {
                props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
                children: [
                    element('Heading', {
                        props: { level: 3, style: { fontSize: '14px', margin: '0' } },
                        children: [text('Part Declaration (catalog.declare)')],
                    }),
                    renderRefusedControl('Delete Part', 'internal #69'),
                ],
            }),
            element('Row', {
                props: { style: { display: 'flex', gap: '8px', marginBottom: '8px' } },
                children: [
                    element('Input', {
                        props: {
                            class: 'input-declaration-entry',
                            placeholder: 'Entry file (src/index.ts)',
                            value: forms.declarationEntry,
                            style: { flex: '1 1 auto', padding: '4px 8px', fontSize: '12px' },
                        },
                        intents: { change: { action: command('operator.setDeclarationEntry') } },
                    }),
                    element('Input', {
                        props: {
                            class: 'input-declaration-branch',
                            placeholder: 'Branch (HEAD)',
                            value: forms.declarationBranch,
                            style: { width: '100px', padding: '4px 8px', fontSize: '12px' },
                        },
                        intents: { change: { action: command('operator.setDeclarationBranch') } },
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-save-declaration',
                            disabled: () => forms.declarationStatus() === 'saving' || part() === null,
                            style: { padding: '4px 12px', fontSize: '12px', cursor: 'pointer' },
                        },
                        intents: { activate: { action: command('operator.runSaveDeclaration') } },
                        children: [text(() => (forms.declarationStatus() === 'saving' ? 'Saving…' : 'Save'))],
                    }),
                ],
            }),
            when(
                () => forms.declarationError() !== null,
                () => element('Text', {
                    props: { style: { color: 'var(--danger, #f85149)', fontSize: '12px' } },
                    children: [text(() => forms.declarationError() ?? '')],
                }),
            ),
        ],
    });
}

export function renderReleaseCards(
    forms: CatalogFormSignals,
    part: () => PartFindOutputItem | null,
): Described {
    return element('Row', {
        props: { style: { display: 'flex', gap: '16px', marginBottom: '16px' } },
        children: [
            element('Card', {
                props: {
                    class: 'catalog-release-part-card',
                    style: { flex: '1 1 50%', padding: '12px', background: 'var(--surface, #161b22)', borderRadius: '6px', border: '1px solid var(--edge, #30363d)' },
                },
                children: [
                    element('Heading', {
                        props: { level: 4, style: { fontSize: '13px', margin: '0 0 8px 0' } },
                        children: [text('Release Part (builder.release_part)')],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px' } },
                        children: [
                            element('Button', {
                                props: {
                                    class: 'btn-release-part',
                                    disabled: () => forms.partReleaseStatus() === 'releasing' || part() === null,
                                    style: { padding: '4px 10px', fontSize: '12px', cursor: 'pointer' },
                                },
                                intents: { activate: { action: command('operator.runReleasePart') } },
                                children: [text(() => (forms.partReleaseStatus() === 'releasing' ? 'Releasing…' : 'Release Part'))],
                            }),
                        ],
                    }),
                ],
            }),
            element('Card', {
                props: {
                    class: 'catalog-release-repo-card',
                    style: { flex: '1 1 50%', padding: '12px', background: 'var(--surface, #161b22)', borderRadius: '6px', border: '1px solid var(--edge, #30363d)' },
                },
                children: [
                    element('Heading', {
                        props: { level: 4, style: { fontSize: '13px', margin: '0 0 8px 0' } },
                        children: [text('Release Repo (builder.release_repo)')],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px' } },
                        children: [
                            element('Button', {
                                props: {
                                    class: 'btn-release-repo',
                                    disabled: () => forms.repoReleaseStatus() === 'releasing',
                                    style: { padding: '4px 10px', fontSize: '12px', cursor: 'pointer' },
                                },
                                intents: { activate: { action: command('operator.runReleaseRepo') } },
                                children: [text(() => (forms.repoReleaseStatus() === 'releasing' ? 'Releasing…' : 'Release Repo'))],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}
