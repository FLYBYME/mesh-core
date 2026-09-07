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
    GroupFindOutputItem,
    NodeFindOutputItem,
    NodeProvisionInput,
    NodeProvisionOutput,
    NodeStatusOutput,
} from '../generated/api.js';
import type { JsonSchema } from '../ui/contract.js';

/**
 * A machine as the console shows it: **desired beside observed**, never merged.
 *
 * The row holds only desired state — `services` and `groups`. Everything else here is read live
 * from the Registry and the Supervisor at the moment it is asked for, which is why `connected` and
 * `running` are separate fields rather than a column on the node.
 *
 * The gap between `desired` and `running` is the whole point of the screen. There is no `healthy`
 * flag anywhere in this system, deliberately — health is *what it should be running* against *what
 * it is running*, and a screen that showed a green dot instead would be hiding the only fact worth
 * looking at.
 *
 * `provisioned` tracks what code is present on the machine (the switches that exist).
 * `running` tracks what processes are active (switches flipped on).
 */
export interface FleetNode {
    readonly hostname: string;
    readonly services: readonly string[];
    readonly groups: readonly string[];
    /** Observed: is this machine on the mesh right now. */
    readonly connected: boolean;
    /** Observed: what its Supervisor says is running (active services). */
    readonly running: readonly string[];
    /** Observed: what its Supervisor says is provisioned (code on machine, can run). */
    readonly provisioned: readonly string[];
    /** Desired minus running — the reason to look at this row. */
    readonly missing: readonly string[];
    /** Running minus desired. */
    readonly extra: readonly string[];
}

/**
 * Pinned ref validator: branches (main, master, refs/heads/…) are strictly refused.
 * A node that follows a branch changes behaviour when somebody else pushes.
 */
export function isBranchRef(ref: string): boolean {
    const trimmed = ref.trim();
    if (!trimmed) return false;
    return /^(main|master|trunk|dev|development|head)$/i.test(trimmed) || trimmed.startsWith('refs/heads/');
}

/**
 * The input schema for node.provision, reflecting the descriptor served by GET /api/_describe.
 */
export const PROVISION_FORM_SCHEMA: JsonSchema = {
    type: 'object',
    properties: {
        hostname: {
            type: 'string',
            title: 'Target Machine',
            description: 'The machine to provision this service onto.',
        },
        name: {
            type: 'string',
            title: 'Service Name',
            description: 'Name of the service entry in the Supervisor manifest.',
        },
        repository: {
            type: 'string',
            title: 'Repository URL',
            description: 'Git repository URL to clone or pull.',
        },
        ref: {
            type: 'string',
            title: 'Ref (Commit SHA or Tag)',
            description: 'Pinned commit SHA or tag. Branch names (main, master, refs/heads/…) are strictly refused.',
        },
        path: {
            type: 'string',
            title: 'Entry Path',
            description: 'Optional path to compiled service entry module relative to repository root.',
        },
        dependsOn: {
            type: 'string',
            title: 'Dependencies',
            description: 'Optional dependencies that must be running before this service starts (comma-separated).',
        },
        mountKey: {
            type: 'string',
            title: 'Mount Key',
            description: 'Optional mountKey alias for running isolated instances.',
        },
    },
    required: ['hostname', 'name', 'repository', 'ref'],
};

export interface FleetApi {
    readonly nodes: ReadonlySignal<readonly NodeFindOutputItem[]>;
    readonly groups: ReadonlySignal<readonly GroupFindOutputItem[]>;
    readonly nodesStatus: ReadonlySignal<CollectionStatus>;
    readonly nodesError: () => string | null;
    readonly live: ReadonlySignal<boolean>;

    /** Desired joined to observed. The list the screen actually draws. */
    readonly fleet: () => readonly FleetNode[];

    readonly selectedHostname: Signal<string | null>;
    readonly selected: () => FleetNode | null;

    /** The live report for the selected machine: peers, services, the lot. */
    readonly status: Signal<NodeStatusOutput | null>;
    readonly statusError: Signal<string | null>;

    /** Every service name any node or group mentions — what there is to assign. */
    readonly knownServices: () => readonly string[];

    readonly busy: Signal<boolean>;
    readonly lastAction: Signal<string | null>;

    // Provisioning state
    readonly provisionHostname: Signal<string>;
    readonly provisionName: Signal<string>;
    readonly provisionRepository: Signal<string>;
    readonly provisionRef: Signal<string>;
    readonly provisionPath: Signal<string>;
    readonly provisionDependsOn: Signal<string>;
    readonly provisionMountKey: Signal<string>;
    readonly provisionStatus: Signal<'idle' | 'provisioning' | 'success' | 'error'>;
    readonly provisionResult: Signal<NodeProvisionOutput | null>;
    readonly provisionError: Signal<string | null>;
    readonly provisionFieldErrors: Signal<Record<string, string>>;

    select(hostname: string): Promise<void>;
    refresh(): Promise<void>;
    /** Add or remove one service on the selected machine, and reconcile it. */
    toggleService(service: string): Promise<void>;
    /** Add or remove the selected machine from a group, and reconcile it. */
    toggleGroup(group: string): Promise<void>;
    /** Make running match desired — for one machine, or for all of them. */
    reconcile(hostname?: string): Promise<void>;

    /** Set a field value in the provisioning form. */
    setProvisionField(field: string, value?: Json): void;
    /** Provision a service onto a node (clones/pulls repo at pinned ref, runs npm install, registers manifest). */
    provision(override?: Partial<NodeProvisionInput>): Promise<void>;
}

export const FLEET: ProviderToken<FleetApi> = provider<FleetApi>('fleet');

/**
 * Services every node runs and no assignment can switch — `bin/node.mjs` registers them directly
 * and the Supervisor never owns them.
 *
 * Stated here rather than imported: mesh-core does not depend on mesh-serve's source, and a
 * generated client carries contracts, not constants. It is a small duplication with a real cost if
 * it drifts, so it is written down in both places with the same reason attached.
 */
export const CORE_SERVICES: readonly string[] = ['api', 'identity', 'fleet', 'supervisor'];

export const NEEDS = needs('models', 'mesh', 'state', 'commands', 'windows', 'log', 'confirmation', 'notifications');
export const CONSUMES = consumes();
