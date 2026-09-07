import {
    consumes,
    needs,
    provider,
    type CollectionStatus,
    type ProviderToken,
    type ReadonlySignal,
    type Signal,
} from '@flybyme/mesh-web';

import type {
    BuilderImportRepoOutput,
    BuilderReleasePartOutput,
    BuilderReleaseRepoOutput,
    CatalogDeclareOutput,
    CatalogResolveOutput,
    PartFindOutputItem,
    PartVersionFindOutputItem,
} from '../generated/api.js';

export interface CatalogApi {
    readonly parts: ReadonlySignal<readonly PartFindOutputItem[]>;
    readonly selectedPartName: Signal<string | null>;
    readonly selectedPart: () => PartFindOutputItem | null;
    readonly versions: ReadonlySignal<readonly PartVersionFindOutputItem[]>;
    readonly selectedVersionNumber: Signal<string | null>;
    readonly selectedVersion: () => PartVersionFindOutputItem | null;
    readonly status: ReadonlySignal<CollectionStatus>;
    readonly live: ReadonlySignal<boolean>;
    readonly errorMessage: () => string | null;
    readonly versionStatus: ReadonlySignal<CollectionStatus>;
    readonly versionErrorMessage: () => string | null;
    readonly searchQuery: Signal<string>;
    readonly kindFilter: Signal<'all' | 'kernel' | 'application' | 'extension'>;
    readonly filteredParts: () => readonly PartFindOutputItem[];
    readonly resolveKernel: Signal<string>;
    readonly resolvePartName: Signal<string>;
    readonly resolvePartRange: Signal<string>;
    readonly resolveStatus: Signal<'idle' | 'resolving' | 'success' | 'error'>;
    readonly resolveResult: Signal<CatalogResolveOutput | null>;
    readonly resolveError: Signal<string | null>;

    // Import repository
    readonly importRepoUrl: Signal<string>;
    readonly importRepoRef: Signal<string>;
    readonly importRepoSubdirectory: Signal<string>;
    readonly importStatus: Signal<'idle' | 'importing' | 'success' | 'error'>;
    readonly importResult: Signal<BuilderImportRepoOutput | null>;
    readonly importError: Signal<string | null>;

    // Declaration editor (per part)
    readonly declarationEntry: Signal<string>;
    readonly declarationBranch: Signal<string>;
    readonly declarationKernel: Signal<string>;
    readonly declarationRequires: Signal<string>;
    readonly declarationSubdirectory: Signal<string>;
    readonly declarationStatus: Signal<'idle' | 'saving' | 'success' | 'error'>;
    readonly declarationResult: Signal<CatalogDeclareOutput | null>;
    readonly declarationError: Signal<string | null>;

    // Release part
    readonly partReleaseBump: Signal<'patch' | 'minor' | 'major'>;
    readonly partReleaseStatus: Signal<'idle' | 'releasing' | 'success' | 'error'>;
    readonly partReleaseResult: Signal<BuilderReleasePartOutput | null>;
    readonly partReleaseError: Signal<string | null>;

    // Release repo
    readonly repoReleaseBump: Signal<'patch' | 'minor' | 'major'>;
    readonly repoReleaseStatus: Signal<'idle' | 'releasing' | 'success' | 'error'>;
    readonly repoReleaseResult: Signal<BuilderReleaseRepoOutput | null>;
    readonly repoReleaseError: Signal<string | null>;

    loadParts(): Promise<void>;
    selectPart(name: string): Promise<void>;
    selectVersion(version: string): void;
    setSearch(query: string): void;
    setKindFilter(kind: 'all' | 'kernel' | 'application' | 'extension'): void;
    runResolve(): Promise<void>;

    setImportRepoUrl(url: string): void;
    setImportRepoRef(ref: string): void;
    setImportRepoSubdirectory(sub: string): void;
    runImportRepo(): Promise<void>;

    setDeclarationEntry(entry: string): void;
    setDeclarationBranch(branch: string): void;
    setDeclarationKernel(kernel: string): void;
    setDeclarationRequires(requires: string): void;
    setDeclarationSubdirectory(sub: string): void;
    runSaveDeclaration(): Promise<void>;

    setPartReleaseBump(bump: 'patch' | 'minor' | 'major'): void;
    runReleasePart(): Promise<void>;

    setRepoReleaseBump(bump: 'patch' | 'minor' | 'major'): void;
    runReleaseRepo(): Promise<void>;
}

export const CATALOG: ProviderToken<CatalogApi> = provider<CatalogApi>('catalog');

export const NEEDS = needs('models', 'mesh', 'state', 'commands', 'windows', 'log', 'confirmation');
export const CONSUMES = consumes();
