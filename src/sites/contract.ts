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

import type { ReleaseFindOutputItem, SiteFindOutputItem } from '../generated/api.js';
import type { JsonSchema } from '../ui/contract.js';

/**
 * The schema for editing site metadata.
 *
 * Explicitly excludes `releaseHash`: which release a hostname serves is `cdn.deploy`'s
 * business. Editing site configuration and deploying a release are two different acts.
 */
export const SITE_FORM_SCHEMA: JsonSchema = {
    type: 'object',
    properties: {
        title: {
            type: 'string',
            title: 'Site Title',
            description: 'Title displayed in the browser tab and page metadata.',
            default: '',
        },
        description: {
            type: 'string',
            title: 'Description',
            description: 'Meta description for search engine previews and social cards.',
            default: '',
        },
        indexable: {
            type: 'boolean',
            title: 'Search Indexing',
            description: 'Allow search engines to index this site.',
            default: true,
        },
        theme: {
            type: 'string',
            title: 'Theme Configuration (JSON)',
            description: 'JSON object defining CSS theme variables and tokens.',
        },
        policy: {
            type: 'string',
            title: 'Security Policy (JSON)',
            description: 'JSON object defining security and feature policies.',
        },
        mesh: {
            type: 'string',
            title: 'Mesh Exposure (JSON)',
            description: 'JSON array of mesh packages, contracts, and events exposed to the site.',
        },
    },
};

export interface SitesApi {
    readonly sites: ReadonlySignal<readonly SiteFindOutputItem[]>;
    readonly sitesStatus: ReadonlySignal<CollectionStatus>;
    readonly sitesError: () => string | null;
    readonly live: ReadonlySignal<boolean>;

    readonly selectedHost: Signal<string | null>;
    readonly selectedSite: () => SiteFindOutputItem | null;

    readonly releases: ReadonlySignal<readonly ReleaseFindOutputItem[]>;
    readonly activeRelease: () => ReleaseFindOutputItem | null;

    /** Editable form field signals */
    readonly formTitle: Signal<string>;
    readonly formDescription: Signal<string>;
    readonly formIndexable: Signal<boolean>;
    readonly formTheme: Signal<string>;
    readonly formPolicy: Signal<string>;
    readonly formMesh: Signal<string>;
    readonly deployReleaseInput: Signal<string>;

    readonly meshFilter: Signal<'all' | 'granted' | 'required' | 'unused'>;
    readonly meshSearch: Signal<string>;
    readonly showRawMesh: Signal<boolean>;

    /** Whether the form has unsaved modifications compared to selectedSite */
    readonly isDirty: () => boolean;

    /**
     * Whether write mutations (site.create, site.update) are supported by the server.
     * Currently false pending server exposure (FLYBYME/mesh-serve#5).
     */
    readonly writeSupported: Signal<boolean>;

    readonly busy: Signal<boolean>;
    readonly lastAction: Signal<string | null>;
    readonly lastError: Signal<string | null>;

    select(host: string): Promise<void>;
    refresh(): Promise<void>;
    setField(field: string, value?: Json): void;
    save(): Promise<void>;
    reset(): Promise<void>;
    deploy(host: string, releaseHash: string): Promise<void>;
    toggleGrant(contractKey: string): void;
    setGrantGate(contractKey: string, gate: 'public' | 'user' | 'admin' | 'operator'): void;
}

export const SITES: ProviderToken<SitesApi> = provider<SitesApi>('sites');

export const NEEDS = needs('models', 'mesh', 'state', 'commands', 'windows', 'log', 'confirmation', 'notifications');
export const CONSUMES = consumes();
