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
    GroupFindOutputItem,
    NodeFindOutputItem,
    NodeStatusOutput,
} from '../generated/api.js';

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
 */
export interface FleetNode {
    readonly hostname: string;
    readonly services: readonly string[];
    readonly groups: readonly string[];
    /** Observed: is this machine on the mesh right now. */
    readonly connected: boolean;
    /** Observed: what its Supervisor says is running. */
    readonly running: readonly string[];
    /** Desired minus running — the reason to look at this row. */
    readonly missing: readonly string[];
    /** Running minus desired. */
    readonly extra: readonly string[];
}

export interface FleetApi {
    readonly nodes: ReadonlySignal<readonly NodeFindOutputItem[]>;
    readonly groups: ReadonlySignal<readonly GroupFindOutputItem[]>;
    readonly nodesStatus: ReadonlySignal<CollectionStatus>;
    readonly nodesError: () => string | null;

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

    select(hostname: string): Promise<void>;
    refresh(): Promise<void>;
    /** Add or remove one service on the selected machine, and reconcile it. */
    toggleService(service: string): Promise<void>;
    /** Add or remove the selected machine from a group, and reconcile it. */
    toggleGroup(group: string): Promise<void>;
    /** Make running match desired — for one machine, or for all of them. */
    reconcile(hostname?: string): Promise<void>;
}

export const FLEET: ProviderToken<FleetApi> = provider<FleetApi>('fleet');

export const NEEDS = needs('models', 'mesh', 'state', 'commands', 'windows', 'log', 'confirmation');
export const CONSUMES = consumes();
