import {
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type ViewDecl,
} from '@flybyme/mesh-web';

import {
    chromeApi,
    type BuilderImportRepoOutput,
    type BuilderReleasePartOutput,
    type BuilderReleaseRepoOutput,
    type CatalogDeclareOutput,
    type CatalogResolveOutput,
    type PartFindOutputItem,
    type PartVersionFindOutputItem,
} from '../generated/api.js';

import {
    CATALOG,
    NEEDS,
    type CatalogApi,
} from './contract.js';
import { renderCatalogView } from './views/browser.js';

export * from './contract.js';

export default class CatalogApp implements Application<typeof NEEDS, readonly [], typeof CATALOG, typeof chromeApi> {
    readonly needs = NEEDS;
    readonly provides = CATALOG;
    readonly api = chromeApi;

    readonly commands: readonly CommandDecl[] = [
        { id: 'catalog.selectPart', title: 'Catalog: Select Part' },
        { id: 'catalog.selectVersion', title: 'Catalog: Select Version' },
        { id: 'catalog.setSearch', title: 'Catalog: Search Parts' },
        { id: 'catalog.setKindFilter', title: 'Catalog: Filter Kind' },
        { id: 'catalog.setResolveKernel', title: 'Catalog: Set Resolver Kernel' },
        { id: 'catalog.setResolvePartName', title: 'Catalog: Set Resolver Part Name' },
        { id: 'catalog.setResolvePartRange', title: 'Catalog: Set Resolver Part Range' },
        { id: 'catalog.runResolve', title: 'Catalog: Resolve Requirements' },
        { id: 'catalog.setImportRepoUrl', title: 'Catalog: Set Import Repo URL' },
        { id: 'catalog.setImportRepoRef', title: 'Catalog: Set Import Repo Ref' },
        { id: 'catalog.setImportRepoSubdirectory', title: 'Catalog: Set Import Repo Subdirectory' },
        { id: 'catalog.runImportRepo', title: 'Catalog: Import Repository' },
        { id: 'catalog.setDeclarationEntry', title: 'Catalog: Set Declaration Entry' },
        { id: 'catalog.setDeclarationBranch', title: 'Catalog: Set Declaration Branch' },
        { id: 'catalog.setDeclarationKernel', title: 'Catalog: Set Declaration Kernel' },
        { id: 'catalog.setDeclarationRequires', title: 'Catalog: Set Declaration Requires' },
        { id: 'catalog.setDeclarationSubdirectory', title: 'Catalog: Set Declaration Subdirectory' },
        { id: 'catalog.runSaveDeclaration', title: 'Catalog: Save Part Declaration' },
        { id: 'catalog.setPartReleaseBump', title: 'Catalog: Set Part Release Bump' },
        { id: 'catalog.runReleasePart', title: 'Catalog: Release Part' },
        { id: 'catalog.setRepoReleaseBump', title: 'Catalog: Set Repo Release Bump' },
        { id: 'catalog.runReleaseRepo', title: 'Catalog: Release Repository' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, CatalogApi>[] = [
        {
            id: 'browser',
            title: 'Catalog Browser',
            render: renderCatalogView,
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly [], typeof chromeApi>): Promise<CatalogApi> {
        const parts = cx.models('part');
        const selectedPartName = cx.state.signal<string | null>(null);

        const versions = cx.models('partVersion', () => {
            const partName = selectedPartName();
            return partName !== null ? { query: { partName } } : { query: { partName: '' } };
        });
        const selectedVersionNumber = cx.state.signal<string | null>(null);

        const errorMessage = cx.state.computed<string | null>(() => {
            const err = parts.error();
            if (err === null) return null;
            const detail = 'detail' in err && typeof err.detail === 'string'
                ? err.detail
                : err.kind;
            return `Failed to load catalog parts (${err.kind}): ${detail}`;
        });

        const versionErrorMessage = cx.state.computed<string | null>(() => {
            const err = versions.error();
            if (err === null) return null;
            const detail = 'detail' in err && typeof err.detail === 'string'
                ? err.detail
                : err.kind;
            return `Failed to load versions (${err.kind}): ${detail}`;
        });

        const searchQuery = cx.state.signal<string>('');
        const kindFilter = cx.state.signal<'all' | 'kernel' | 'application' | 'extension'>('all');

        const resolveKernel = cx.state.signal<string>('^0.11');
        const resolvePartName = cx.state.signal<string>('chrome');
        const resolvePartRange = cx.state.signal<string>('^0.1.0');
        const resolveStatus = cx.state.signal<'idle' | 'resolving' | 'success' | 'error'>('idle');
        const resolveResult = cx.state.signal<CatalogResolveOutput | null>(null);
        const resolveError = cx.state.signal<string | null>(null);

        // Import repository signals
        const importRepoUrl = cx.state.signal<string>('');
        const importRepoRef = cx.state.signal<string>('');
        const importRepoSubdirectory = cx.state.signal<string>('');
        const importStatus = cx.state.signal<'idle' | 'importing' | 'success' | 'error'>('idle');
        const importResult = cx.state.signal<BuilderImportRepoOutput | null>(null);
        const importError = cx.state.signal<string | null>(null);

        // Declaration editor signals
        const declarationEntry = cx.state.signal<string>('src/index.ts');
        const declarationBranch = cx.state.signal<string>('HEAD');
        const declarationKernel = cx.state.signal<string>('^0.15');
        const declarationRequires = cx.state.signal<string>('');
        const declarationSubdirectory = cx.state.signal<string>('');
        const declarationStatus = cx.state.signal<'idle' | 'saving' | 'success' | 'error'>('idle');
        const declarationResult = cx.state.signal<CatalogDeclareOutput | null>(null);
        const declarationError = cx.state.signal<string | null>(null);

        // Part release signals
        const partReleaseBump = cx.state.signal<'patch' | 'minor' | 'major'>('patch');
        const partReleaseStatus = cx.state.signal<'idle' | 'releasing' | 'success' | 'error'>('idle');
        const partReleaseResult = cx.state.signal<BuilderReleasePartOutput | null>(null);
        const partReleaseError = cx.state.signal<string | null>(null);

        // Repo release signals
        const repoReleaseBump = cx.state.signal<'patch' | 'minor' | 'major'>('patch');
        const repoReleaseStatus = cx.state.signal<'idle' | 'releasing' | 'success' | 'error'>('idle');
        const repoReleaseResult = cx.state.signal<BuilderReleaseRepoOutput | null>(null);
        const repoReleaseError = cx.state.signal<string | null>(null);

        const selectedPart = cx.state.computed<PartFindOutputItem | null>(() => {
            const name = selectedPartName();
            if (name === null) return null;
            for (const p of parts.rows()) {
                if (p.name === name) return p;
            }
            return null;
        });

        const selectedVersion = cx.state.computed<PartVersionFindOutputItem | null>(() => {
            const ver = selectedVersionNumber();
            if (ver === null) return null;
            for (const v of versions.rows()) {
                if (v.version === ver) return v;
            }
            return null;
        });

        const filteredParts = cx.state.computed<readonly PartFindOutputItem[]>(() => {
            const q = searchQuery().toLowerCase().trim();
            const k = kindFilter();
            return parts.rows().filter((p) => {
                if (k !== 'all' && p.kind !== k) return false;
                if (q === '') return true;
                if (p.name.toLowerCase().includes(q)) return true;
                if (p.publisher.toLowerCase().includes(q)) return true;
                if (p.description !== undefined && p.description.toLowerCase().includes(q)) return true;
                if (p.keywords !== undefined && p.keywords.some((kw) => kw.toLowerCase().includes(q))) return true;
                return false;
            });
        });

        cx.state.effect(() => {
            const pRows = parts.rows();
            if (selectedPartName() === null && pRows.length > 0) {
                const first = pRows[0];
                if (first !== undefined) {
                    selectedPartName.set(first.name);
                    resolvePartName.set(first.name);
                }
            }
        });

        cx.state.effect(() => {
            const vRows = versions.rows();
            if (vRows.length > 0) {
                const first = vRows[0];
                if (first !== undefined) {
                    selectedVersionNumber.set(first.version);
                }
            } else {
                selectedVersionNumber.set(null);
            }
        });

        // Seed declaration editor and reset release state when selected part changes
        cx.state.effect(() => {
            const p = selectedPart();
            if (p !== null) {
                declarationEntry.set(p.declaration?.entry ?? 'src/index.ts');
                declarationBranch.set(p.declaration?.branch ?? 'HEAD');
                declarationKernel.set(p.declaration?.kernel ?? '^0.15');
                declarationRequires.set(p.declaration?.requires ? p.declaration.requires.join(', ') : '');
                declarationSubdirectory.set(p.declaration?.subdirectory ?? '');
                declarationStatus.set('idle');
                declarationResult.set(null);
                declarationError.set(null);
                partReleaseStatus.set('idle');
                partReleaseResult.set(null);
                partReleaseError.set(null);
            }
        });

        const selectPart = async (name: string): Promise<void> => {
            selectedPartName.set(name);
            resolvePartName.set(name);
        };

        const loadParts = async (): Promise<void> => {
            await parts.refetch();
        };

        const selectVersion = (version: string): void => {
            selectedVersionNumber.set(version);
        };

        const setSearch = (query: string): void => {
            searchQuery.set(query);
        };

        const setKindFilter = (kind: 'all' | 'kernel' | 'application' | 'extension'): void => {
            kindFilter.set(kind);
        };

        const runResolve = async (): Promise<void> => {
            resolveStatus.set('resolving');
            resolveError.set(null);
            resolveResult.set(null);

            const pName = resolvePartName().trim();
            const pRange = resolvePartRange().trim();
            const kRange = resolveKernel().trim();

            if (pName === '') {
                resolveStatus.set('error');
                resolveError.set('Part name cannot be empty.');
                return;
            }

            const res = await cx.mesh.call('catalog.resolve', {
                kernel: kRange === '' ? '^0.11' : kRange,
                parts: [{ name: pName, version: pRange === '' ? '*' : pRange }],
            });

            if (res.ok) {
                resolveResult.set(res.value);
                resolveStatus.set('success');
            } else {
                resolveStatus.set('error');
                const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                    ? res.error.detail
                    : res.error.kind;
                const msg = `Resolution failed (${res.error.kind}): ${detail}`;
                resolveError.set(msg);
                cx.notifications.error(msg);
            }
        };

        const setImportRepoUrl = (url: string): void => {
            importRepoUrl.set(url);
        };

        const setImportRepoRef = (ref: string): void => {
            importRepoRef.set(ref);
        };

        const setImportRepoSubdirectory = (sub: string): void => {
            importRepoSubdirectory.set(sub);
        };

        const runImportRepo = async (): Promise<void> => {
            if (importStatus() === 'importing') return;
            const repo = importRepoUrl().trim();
            if (repo === '') {
                importStatus.set('error');
                importError.set('Repository URL cannot be empty.');
                return;
            }

            importStatus.set('importing');
            importError.set(null);
            importResult.set(null);

            const refVal = importRepoRef().trim();
            const subVal = importRepoSubdirectory().trim();

            const res = await cx.mesh.call('builder.import_repo', {
                repository: repo,
                ...(refVal !== '' ? { ref: refVal } : {}),
                ...(subVal !== '' ? { subdirectory: subVal } : {}),
            });

            if (res.ok) {
                importResult.set(res.value);
                importStatus.set('success');
                if (res.value.parts.length > 0) {
                    const first = res.value.parts[0];
                    if (first !== undefined && selectedPartName() === null) {
                        selectedPartName.set(first.name);
                    }
                }
            } else {
                importStatus.set('error');
                const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                    ? res.error.detail
                    : res.error.kind;
                const msg = `Import failed (${res.error.kind}): ${detail}`;
                importError.set(msg);
                cx.notifications.error(msg);
            }
        };

        const setDeclarationEntry = (entry: string): void => {
            declarationEntry.set(entry);
        };

        const setDeclarationBranch = (branch: string): void => {
            declarationBranch.set(branch);
        };

        const setDeclarationKernel = (kernel: string): void => {
            declarationKernel.set(kernel);
        };

        const setDeclarationRequires = (requires: string): void => {
            declarationRequires.set(requires);
        };

        const setDeclarationSubdirectory = (sub: string): void => {
            declarationSubdirectory.set(sub);
        };

        const runSaveDeclaration = async (): Promise<void> => {
            if (declarationStatus() === 'saving') return;
            const p = selectedPart();
            if (p === null) {
                declarationStatus.set('error');
                declarationError.set('No part selected.');
                return;
            }

            const entry = declarationEntry().trim();
            if (entry === '') {
                declarationStatus.set('error');
                declarationError.set('Source entry cannot be empty.');
                return;
            }

            declarationStatus.set('saving');
            declarationError.set(null);
            declarationResult.set(null);

            const branch = declarationBranch().trim() || 'HEAD';
            const kernel = declarationKernel().trim();
            const rawReq = declarationRequires().trim();
            const requires = rawReq === '' ? [] : rawReq.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
            const sub = declarationSubdirectory().trim();

            const res = await cx.mesh.call('catalog.declare', {
                name: p.name,
                kind: p.kind,
                repository: p.repository,
                declaration: {
                    entry,
                    branch,
                    ...(kernel !== '' ? { kernel } : {}),
                    requires,
                    ...(sub !== '' ? { subdirectory: sub } : {}),
                },
                ...(p.description !== undefined && p.description !== '' ? { description: p.description } : {}),
                ...(p.homepage !== undefined && p.homepage !== '' ? { homepage: p.homepage } : {}),
                ...(p.license !== undefined && p.license !== '' ? { license: p.license } : {}),
                ...(p.keywords !== undefined && p.keywords.length > 0 ? { keywords: p.keywords } : {}),
            });

            if (res.ok) {
                declarationResult.set(res.value);
                declarationStatus.set('success');
            } else {
                declarationStatus.set('error');
                const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                    ? res.error.detail
                    : res.error.kind;
                const msg = `Failed to save declaration (${res.error.kind}): ${detail}`;
                declarationError.set(msg);
                cx.notifications.error(msg);
            }
        };

        const setPartReleaseBump = (bump: 'patch' | 'minor' | 'major'): void => {
            partReleaseBump.set(bump);
        };

        const runReleasePart = async (): Promise<void> => {
            if (partReleaseStatus() === 'releasing') return;
            const p = selectedPart();
            if (p === null) return;

            const bump = partReleaseBump();
            const ok = await cx.confirmation.ask({
                message: `Release part "${p.name}" with ${bump} bump? This will pull, mint the next version, publish, and build its artifact.`,
                confirmLabel: `Release ${p.name}`,
                destructive: true,
            });
            if (!ok) return;

            partReleaseStatus.set('releasing');
            partReleaseError.set(null);
            partReleaseResult.set(null);

            const res = await cx.mesh.call('builder.release_part', {
                part: p.name,
                bump,
            });

            if (res.ok) {
                partReleaseResult.set(res.value);
                partReleaseStatus.set('success');
            } else {
                partReleaseStatus.set('error');
                const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                    ? res.error.detail
                    : res.error.kind;
                const msg = `Release failed (${res.error.kind}): ${detail}`;
                partReleaseError.set(msg);
                cx.notifications.error(msg);
            }
        };

        const setRepoReleaseBump = (bump: 'patch' | 'minor' | 'major'): void => {
            repoReleaseBump.set(bump);
        };

        const runReleaseRepo = async (): Promise<void> => {
            if (repoReleaseStatus() === 'releasing') return;
            const p = selectedPart();
            const repo = p?.repository ?? importRepoUrl().trim();
            if (!repo) {
                repoReleaseStatus.set('error');
                const msg = 'No repository specified. Select a part or enter a repository URL.';
                repoReleaseError.set(msg);
                cx.notifications.error(msg);
                return;
            }

            const bump = repoReleaseBump();
            const ok = await cx.confirmation.ask({
                message: `Release all parts declared by repository "${repo}" with ${bump} bump? This will build kernels first, then all other parts.`,
                confirmLabel: 'Release All Parts',
                destructive: true,
            });
            if (!ok) return;

            repoReleaseStatus.set('releasing');
            repoReleaseError.set(null);
            repoReleaseResult.set(null);

            const res = await cx.mesh.call('builder.release_repo', {
                repository: repo,
                bump,
            });

            if (res.ok) {
                repoReleaseResult.set(res.value);
                repoReleaseStatus.set('success');
            } else {
                repoReleaseStatus.set('error');
                const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                    ? res.error.detail
                    : res.error.kind;
                const msg = `Repository release failed (${res.error.kind}): ${detail}`;
                repoReleaseError.set(msg);
                cx.notifications.error(msg);
            }
        };

        cx.commands.implement('catalog.selectPart', async (val?: Json) => {
            if (typeof val === 'string') {
                await selectPart(val);
            }
        });

        cx.commands.implement('catalog.selectVersion', (val?: Json) => {
            if (typeof val === 'string') {
                selectVersion(val);
            }
        });

        cx.commands.implement('catalog.setSearch', (val?: Json) => {
            if (typeof val === 'string') {
                setSearch(val);
            }
        });

        cx.commands.implement('catalog.setKindFilter', (val?: Json) => {
            if (val === 'all' || val === 'kernel' || val === 'application' || val === 'extension') {
                setKindFilter(val);
            }
        });

        cx.commands.implement('catalog.setResolveKernel', (val?: Json) => {
            if (typeof val === 'string') resolveKernel.set(val);
        });

        cx.commands.implement('catalog.setResolvePartName', (val?: Json) => {
            if (typeof val === 'string') resolvePartName.set(val);
        });

        cx.commands.implement('catalog.setResolvePartRange', (val?: Json) => {
            if (typeof val === 'string') resolvePartRange.set(val);
        });

        cx.commands.implement('catalog.runResolve', async () => {
            await runResolve();
        });

        cx.commands.implement('catalog.setImportRepoUrl', (val?: Json) => {
            if (typeof val === 'string') setImportRepoUrl(val);
        });

        cx.commands.implement('catalog.setImportRepoRef', (val?: Json) => {
            if (typeof val === 'string') setImportRepoRef(val);
        });

        cx.commands.implement('catalog.setImportRepoSubdirectory', (val?: Json) => {
            if (typeof val === 'string') setImportRepoSubdirectory(val);
        });

        cx.commands.implement('catalog.runImportRepo', async () => {
            await runImportRepo();
        });

        cx.commands.implement('catalog.setDeclarationEntry', (val?: Json) => {
            if (typeof val === 'string') setDeclarationEntry(val);
        });

        cx.commands.implement('catalog.setDeclarationBranch', (val?: Json) => {
            if (typeof val === 'string') setDeclarationBranch(val);
        });

        cx.commands.implement('catalog.setDeclarationKernel', (val?: Json) => {
            if (typeof val === 'string') setDeclarationKernel(val);
        });

        cx.commands.implement('catalog.setDeclarationRequires', (val?: Json) => {
            if (typeof val === 'string') setDeclarationRequires(val);
        });

        cx.commands.implement('catalog.setDeclarationSubdirectory', (val?: Json) => {
            if (typeof val === 'string') setDeclarationSubdirectory(val);
        });

        cx.commands.implement('catalog.runSaveDeclaration', async () => {
            await runSaveDeclaration();
        });

        cx.commands.implement('catalog.setPartReleaseBump', (val?: Json) => {
            if (val === 'patch' || val === 'minor' || val === 'major') setPartReleaseBump(val);
        });

        cx.commands.implement('catalog.runReleasePart', async () => {
            await runReleasePart();
        });

        cx.commands.implement('catalog.setRepoReleaseBump', (val?: Json) => {
            if (val === 'patch' || val === 'minor' || val === 'major') setRepoReleaseBump(val);
        });

        cx.commands.implement('catalog.runReleaseRepo', async () => {
            await runReleaseRepo();
        });

        if (parts.status() !== 'idle') {
            try {
                await parts.refetch();
            } catch {}
            if (selectedPartName() !== null && versions.status() !== 'idle') {
                try {
                    await versions.refetch();
                } catch {}
            }
        }

        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'browser' });
            }
        });

        return {
            parts: parts.rows,
            selectedPartName,
            selectedPart,
            versions: versions.rows,
            selectedVersionNumber,
            selectedVersion,
            status: parts.status,
            live: parts.live,
            errorMessage,
            versionStatus: versions.status,
            versionErrorMessage,
            searchQuery,
            kindFilter,
            filteredParts,
            resolveKernel,
            resolvePartName,
            resolvePartRange,
            resolveStatus,
            resolveResult,
            resolveError,
            importRepoUrl,
            importRepoRef,
            importRepoSubdirectory,
            importStatus,
            importResult,
            importError,
            declarationEntry,
            declarationBranch,
            declarationKernel,
            declarationRequires,
            declarationSubdirectory,
            declarationStatus,
            declarationResult,
            declarationError,
            partReleaseBump,
            partReleaseStatus,
            partReleaseResult,
            partReleaseError,
            repoReleaseBump,
            repoReleaseStatus,
            repoReleaseResult,
            repoReleaseError,
            loadParts,
            selectPart,
            selectVersion,
            setSearch,
            setKindFilter,
            runResolve,
            setImportRepoUrl,
            setImportRepoRef,
            setImportRepoSubdirectory,
            runImportRepo,
            setDeclarationEntry,
            setDeclarationBranch,
            setDeclarationKernel,
            setDeclarationRequires,
            setDeclarationSubdirectory,
            runSaveDeclaration,
            setPartReleaseBump,
            runReleasePart,
            setRepoReleaseBump,
            runReleaseRepo,
        };
    }
}

export { CatalogApp };

