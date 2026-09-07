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

    loadParts(): Promise<void>;
    selectPart(name: string): Promise<void>;
    selectVersion(version: string): void;
    setSearch(query: string): void;
    setKindFilter(kind: 'all' | 'kernel' | 'application' | 'extension'): void;
    runResolve(): Promise<void>;
}

export const CATALOG: ProviderToken<CatalogApi> = provider<CatalogApi>('catalog');

export const NEEDS = needs('models', 'mesh', 'state', 'commands', 'windows', 'log');
export const CONSUMES = consumes();
