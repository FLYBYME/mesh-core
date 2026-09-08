import {
    AUTH,
    consumes,
    needs,
    provider,
    type AuthApi,
    type ProviderToken,
    type ReadonlySignal,
} from '@flybyme/mesh-web';

import type {
    GroupFindOutputItem,
    PartFindOutputItem,
    PartVersionFindOutputItem,
    ReleaseFindOutputItem,
    SiteFindOutputItem,
} from '../generated/api.js';

export const NEEDS = needs(
    'state',
    'dom',
    'log',
    'commands',
    'windows',
    'notifications',
    'confirmation',
    'mesh',
    'models',
);

export const CONSUMES = consumes(AUTH);
export const EMPTY_CONSUMES = consumes();

export const OPERATOR_VIEWS = ['parts', 'releases', 'sites', 'fleet'] as const;
export type OperatorView = typeof OPERATOR_VIEWS[number];

export const OPERATOR_STATES = ['loading', 'empty', 'unauthenticated', 'refused', 'error'] as const;
export type OperatorState = typeof OPERATOR_STATES[number];

export const CONSUMED_ACTIONS = [
    'part.find',
    'part.get',
    'part.count',
    'partVersion.find',
    'partVersion.get',
    'partVersion.count',
    'catalog.resolve',
    'catalog.declare',
    'builder.import_repo',
    'builder.release_part',
    'builder.release_repo',
    'release.find',
    'release.get',
    'release.count',
    'site.find',
    'site.get',
    'site.count',
    'site.create',
    'cdn.compose',
    'cdn.deploy',
    'cdn.site_edit',
    'node.find',
    'node.get',
    'node.count',
    'node.status',
    'node.assign',
    'node.reconcile',
    'node.provision',
    'group.find',
    'group.get',
    'group.count',
    'group.create',
    'group.update',
] as const;

export interface FleetNode {
    readonly hostname: string;
    readonly services: readonly string[];
    readonly groups: readonly string[];
    readonly connected: boolean;
    readonly running: readonly string[];
    readonly provisioned: readonly string[];
    readonly missing: readonly string[];
    readonly extra: readonly string[];
}

export const CORE_SERVICES = ['api', 'broker', 'genesis', 'registry', 'supervisor'] as const;

export function isBranchRef(ref: string): boolean {
    const trimmed = ref.trim();
    if (trimmed === '' || trimmed === 'HEAD' || trimmed === 'main' || trimmed === 'master') return true;
    if (trimmed.startsWith('refs/heads/')) return true;
    if (/^[0-9a-f]{40}$/i.test(trimmed)) return false;
    if (/^v?\d+\.\d+\.\d+/.test(trimmed)) return false;
    return true;
}

export interface OperatorApi {
    // Session & Auth
    readonly auth?: AuthApi;
    readonly isSignedIn: ReadonlySignal<boolean>;

    // Shared Selection
    readonly selectedPartName: ReadonlySignal<string | null>;
    readonly selectedPart: () => PartFindOutputItem | null;
    readonly selectedVersionNumber: ReadonlySignal<string | null>;
    readonly selectedVersion: () => PartVersionFindOutputItem | null;
    readonly selectedReleaseHash: ReadonlySignal<string | null>;
    readonly selectedRelease: () => ReleaseFindOutputItem | null;
    readonly selectedHost: ReadonlySignal<string | null>;
    readonly selectedSite: () => SiteFindOutputItem | null;
    readonly selectedHostname: ReadonlySignal<string | null>;
    readonly selectedNode: () => FleetNode | null;
    readonly selectedGroupName: ReadonlySignal<string | null>;
    readonly selectedGroup: () => GroupFindOutputItem | null;

    // Collections
    readonly parts: () => readonly PartFindOutputItem[];
    readonly versions: () => readonly PartVersionFindOutputItem[];
    readonly releases: () => readonly ReleaseFindOutputItem[];
    readonly sites: () => readonly SiteFindOutputItem[];
    readonly nodes: () => readonly FleetNode[];
    readonly groups: () => readonly GroupFindOutputItem[];

    // Tri-State Status
    readonly live: () => boolean;
    readonly status: () => 'idle' | 'loading' | 'ready' | 'error';
    readonly error: () => string | null;

    // Actions & Handlers
    selectPart(name: string): Promise<void>;
    selectVersion(version: string): void;
    selectRelease(hash: string): void;
    selectSite(host: string): Promise<void>;
    selectNode(hostname: string): Promise<void>;
    selectGroup(name: string): void;
    refresh(): Promise<void>;

    // Catalog & Builder
    runResolve(): Promise<void>;
    runImportRepo(): Promise<void>;
    runSaveDeclaration(): Promise<void>;
    runReleasePart(): Promise<void>;
    runReleaseRepo(): Promise<void>;

    // Releases & Deploy
    runCompose(dryRun: boolean): Promise<void>;
    runDeploy(host: string, releaseHash: string): Promise<void>;

    // Sites
    saveSite(): Promise<void>;
    resetSite(): Promise<void>;
    createSite(input: { host: string; title?: string; description?: string }): Promise<void>;

    // Fleet
    reconcile(hostname?: string): Promise<void>;
    toggleService(service: string): Promise<void>;
    toggleGroup(group: string): Promise<void>;
    provision(input?: Record<string, unknown>): Promise<void>;
    createGroup(name: string, description?: string): Promise<void>;
    updateGroup(id: string, patch: { name?: string; description?: string; services?: readonly string[] }): Promise<void>;
}

export const OPERATOR: ProviderToken<OperatorApi> = provider<OperatorApi>('operator');
