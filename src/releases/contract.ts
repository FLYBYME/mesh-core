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
    CdnComposeOutput,
    CdnDeployOutput,
    ReleaseFindOutputItem,
    SiteFindOutputItem,
} from '../generated/api.js';

export interface ReleasesApi {
    readonly sites: ReadonlySignal<readonly SiteFindOutputItem[]>;
    readonly selectedHost: Signal<string | null>;
    readonly selectedSite: () => SiteFindOutputItem | null;
    readonly releases: ReadonlySignal<readonly ReleaseFindOutputItem[]>;
    readonly selectedReleaseHash: Signal<string | null>;
    readonly selectedRelease: () => ReleaseFindOutputItem | null;
    readonly sitesStatus: ReadonlySignal<CollectionStatus>;
    readonly sitesError: () => string | null;
    readonly releasesStatus: ReadonlySignal<CollectionStatus>;
    readonly releasesError: () => string | null;

    readonly composeKernel: Signal<string>;
    readonly composeName: Signal<string>;
    readonly composePartsText: Signal<string>;
    readonly composeStatus: Signal<'idle' | 'composing' | 'success' | 'error'>;
    readonly composeResult: Signal<CdnComposeOutput | null>;
    readonly composeError: Signal<string | null>;

    readonly deployStatus: Signal<'idle' | 'deploying' | 'success' | 'error'>;
    readonly deployResult: Signal<CdnDeployOutput | null>;
    readonly deployError: Signal<string | null>;

    loadData(): Promise<void>;
    selectSite(host: string): void;
    selectRelease(hash: string): void;
    setComposeKernel(kernel: string): void;
    setComposeName(name: string): void;
    setComposePartsText(text: string): void;
    runCompose(dryRun: boolean): Promise<void>;
    runDeploy(host: string, releaseHash: string): Promise<void>;
}

export const RELEASES: ProviderToken<ReleasesApi> = provider<ReleasesApi>('releases');

export const NEEDS = needs('models', 'mesh', 'state', 'commands', 'windows', 'log');
export const CONSUMES = consumes();
