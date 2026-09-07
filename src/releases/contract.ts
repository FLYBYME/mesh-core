import {
    consumes,
    needs,
    provider,
    type CollectionStatus,
    type Json,
    type ProviderToken,
    type ReadonlySignal,
    type Signal,
} from '@flybyme/mesh-web';

import type {
    CdnComposeInputPart,
    CdnComposeOutput,
    CdnDeployOutput,
    ReleaseFindOutputItem,
    SiteFindOutputItem,
} from '../generated/api.js';
import type { JsonSchema } from '../ui/contract.js';

/**
 * The input schema for cdn.compose, reflecting the descriptor served by GET /api/_describe.
 */
export const COMPOSE_FORM_SCHEMA: JsonSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            title: 'Release Label',
            description: 'A label for people. Never an identity.',
        },
        kernel: {
            type: 'string',
            title: 'Kernel Range',
            description: 'A range, e.g. ^0.15',
        },
        parts: {
            type: 'array',
            title: 'Parts & Version Requirements',
            description: 'Included parts and version requirements for this release.',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', title: 'Part ID' },
                    version: { type: 'string', title: 'Version Range' },
                    kind: {
                        type: 'string',
                        enum: ['application', 'extension'],
                        title: 'Kind',
                    },
                },
                required: ['id', 'version', 'kind'],
            },
        },
        rolling: {
            type: 'boolean',
            title: 'Rolling Release',
            description: 'Automatically re-compose when an included part publishes a new version',
        },
    },
    required: ['kernel', 'parts'],
};

export interface ReleasesApi {
    readonly sites: ReadonlySignal<readonly SiteFindOutputItem[]>;
    readonly selectedHost: Signal<string | null>;
    readonly selectedSite: () => SiteFindOutputItem | null;
    readonly releases: ReadonlySignal<readonly ReleaseFindOutputItem[]>;
    readonly selectedReleaseHash: Signal<string | null>;
    readonly selectedRelease: () => ReleaseFindOutputItem | null;
    readonly sitesStatus: ReadonlySignal<CollectionStatus>;
    readonly sitesLive: ReadonlySignal<boolean>;
    readonly sitesError: () => string | null;
    readonly releasesStatus: ReadonlySignal<CollectionStatus>;
    readonly releasesLive: ReadonlySignal<boolean>;
    readonly releasesError: () => string | null;
    readonly live: ReadonlySignal<boolean>;

    readonly composeKernel: Signal<string>;
    readonly composeName: Signal<string>;
    readonly composeParts: Signal<readonly CdnComposeInputPart[]>;
    readonly composePartsText: Signal<string>;
    readonly composeRolling: Signal<boolean>;
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
    setComposeParts(parts: readonly CdnComposeInputPart[] | string): void;
    setComposePartsText(text: string): void;
    setComposeRolling(rolling: boolean): void;
    addComposePart(part?: Partial<CdnComposeInputPart>): void;
    removeComposePart(index: number): void;
    updateComposePart(index: number, patch: Partial<CdnComposeInputPart>): void;
    setField(field: string, value?: Json): void;
    runCompose(dryRun: boolean): Promise<void>;
    runDeploy(host: string, releaseHash: string): Promise<void>;
}

export const RELEASES: ProviderToken<ReleasesApi> = provider<ReleasesApi>('releases');

export const NEEDS = needs('models', 'mesh', 'state', 'commands', 'windows', 'log', 'confirmation');
export const CONSUMES = consumes();
