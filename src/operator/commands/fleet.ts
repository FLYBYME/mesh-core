import type { NodeProvisionInput, NodeProvisionOutput } from '../../generated/api.js';
import { isBranchRef } from '../contract.js';
import type { OperatorStateBundle } from '../state.js';

export interface FleetFormSignals {
    readonly busy: (val?: boolean) => boolean;
    readonly lastAction: (val?: string | null) => string | null;
    readonly provisionHostname: (val?: string) => string;
    readonly provisionName: (val?: string) => string;
    readonly provisionRepository: (val?: string) => string;
    readonly provisionRef: (val?: string) => string;
    readonly provisionPath: (val?: string) => string;
    readonly provisionDependsOn: (val?: string) => string;
    readonly provisionMountKey: (val?: string) => string;
    readonly provisionStatus: (val?: 'idle' | 'provisioning' | 'success' | 'error') => 'idle' | 'provisioning' | 'success' | 'error';
    readonly provisionResult: (val?: NodeProvisionOutput | null) => NodeProvisionOutput | null;
    readonly provisionError: (val?: string | null) => string | null;
    readonly provisionFieldErrors: (val?: Record<string, string>) => Record<string, string>;
    readonly newGroupName: (val?: string) => string;
    readonly newGroupDescription: (val?: string) => string;
    readonly newGroupServices: (val?: string) => string;
    readonly editGroupDescription: (val?: string) => string;
    readonly editGroupServices: (val?: string) => string;
}

export function selectFleetNode(state: OperatorStateBundle, hostname: string): void {
    state.selectedHostname.set(hostname);
    state.updateRoute('fleet', { hostname });
}

export function selectFleetGroup(state: OperatorStateBundle, groupName: string): void {
    state.selectedGroupName.set(groupName);
    state.updateRoute('fleet', { group: groupName });
}

export async function toggleNodeService(
    state: OperatorStateBundle,
    forms: FleetFormSignals,
    service: string,
): Promise<void> {
    const host = state.selectedHostname();
    if (!host) return;
    const node = state.fleet().find((n) => n.hostname === host);
    if (!node) return;

    const has = node.services.includes(service);
    if (has) {
        const ok = await state.cx.confirmation.ask({
            message: `Stop "${service}" on ${node.hostname}?`,
            confirmLabel: 'Stop it',
            destructive: true,
        });
        if (!ok) return;
    }

    const next = has ? node.services.filter((s) => s !== service) : [...node.services, service];
    forms.busy(true);
    forms.lastAction(null);
    try {
        const res = await state.cx.mesh.call('node.assign', {
            hostname: node.hostname,
            services: [...next],
            groups: [...node.groups],
        });
        if (res.ok) {
            const { started = [], stopped = [], applied } = res.value;
            forms.lastAction(applied
                ? `${has ? 'Stopped' : 'Started'} ${service}: started ${started.length}, stopped ${stopped.length}.`
                : `Saved. ${node.hostname} is offline, will take effect when it reconnects.`);
        } else {
            const msg = `Toggle service failed: ${res.error.kind}`;
            forms.lastAction(msg);
            state.cx.notifications.error(msg);
        }
    } finally {
        forms.busy(false);
        await state.refresh();
    }
}

export async function toggleNodeGroup(
    state: OperatorStateBundle,
    forms: FleetFormSignals,
    group: string,
): Promise<void> {
    const host = state.selectedHostname();
    if (!host) return;
    const node = state.fleet().find((n) => n.hostname === host);
    if (!node) return;

    const has = node.groups.includes(group);
    const next = has ? node.groups.filter((g) => g !== group) : [...node.groups, group];

    forms.busy(true);
    forms.lastAction(null);
    try {
        const res = await state.cx.mesh.call('node.assign', {
            hostname: node.hostname,
            services: [...node.services],
            groups: [...next],
        });
        if (res.ok) {
            forms.lastAction(`${has ? 'Left' : 'Joined'} group "${group}".`);
        } else {
            const msg = `Group assign failed: ${res.error.kind}`;
            forms.lastAction(msg);
            state.cx.notifications.error(msg);
        }
    } finally {
        forms.busy(false);
        await state.refresh();
    }
}

export async function reconcileFleet(
    state: OperatorStateBundle,
    forms: FleetFormSignals,
    hostname?: string,
): Promise<void> {
    if (hostname === undefined) {
        const ok = await state.cx.confirmation.ask({
            message: 'Reconcile every machine in the fleet? Each one will start and stop services to match what it has been assigned.',
            confirmLabel: 'Reconcile all',
        });
        if (!ok) return;
    }

    forms.busy(true);
    forms.lastAction(null);
    try {
        const res = await state.cx.mesh.call('node.reconcile', hostname === undefined ? {} : { hostname });
        if (res.ok) {
            const rows = res.value.reconciled;
            const applied = rows.filter((r) => r.applied);
            forms.lastAction(`Reconciled ${applied.length} of ${rows.length} machine(s).`);
        } else {
            const msg = `Reconcile failed: ${res.error.kind}`;
            forms.lastAction(msg);
            state.cx.notifications.error(msg);
        }
    } finally {
        forms.busy(false);
        await state.refresh();
    }
}

export async function provisionNode(
    state: OperatorStateBundle,
    forms: FleetFormSignals,
    override?: Partial<NodeProvisionInput>,
): Promise<void> {
    const host = override?.hostname ?? forms.provisionHostname().trim();
    const name = override?.name ?? forms.provisionName().trim();
    const repository = override?.repository ?? forms.provisionRepository().trim();
    const ref = override?.ref ?? forms.provisionRef().trim();
    const path = override?.path ?? (forms.provisionPath().trim() || undefined);
    const mountKey = override?.mountKey ?? (forms.provisionMountKey().trim() || undefined);
    const rawDeps = override?.dependsOn
        ?? forms.provisionDependsOn().split(',').map((s) => s.trim()).filter(Boolean);

    const errors: Record<string, string> = {};
    if (!host) errors.hostname = 'Target machine is required.';
    if (!name) errors.name = 'Service name is required.';
    if (!repository) errors.repository = 'Repository URL is required.';
    if (!ref) {
        errors.ref = 'Ref (commit SHA or tag) is required.';
    } else if (isBranchRef(ref)) {
        errors.ref = `node.provision requires a pinned commit SHA or tag, not a branch: "${ref}". A node that follows a branch changes behaviour when somebody else pushes.`;
    }

    if (Object.keys(errors).length > 0) {
        forms.provisionFieldErrors(errors);
        forms.provisionStatus('error');
        const first = errors.ref ?? errors.repository ?? errors.name ?? errors.hostname;
        forms.provisionError(first ?? 'Please complete all required fields.');
        return;
    }

    const ok = await state.cx.confirmation.ask({
        message: `Provision repository "${repository}" onto machine "${host}"? This runs npm install on the machine.`,
        confirmLabel: 'Provision',
        destructive: true,
    });
    if (!ok) return;

    forms.busy(true);
    forms.provisionStatus('provisioning');
    forms.provisionError(null);
    forms.provisionResult(null);
    forms.provisionFieldErrors({});
    forms.lastAction(`Provisioning "${name}" onto ${host}...`);

    try {
        const res = await state.cx.mesh.call('node.provision', {
            hostname: host,
            name,
            repository,
            ref,
            ...(path ? { path } : {}),
            ...(rawDeps.length > 0 ? { dependsOn: rawDeps } : {}),
            ...(mountKey ? { mountKey } : {}),
        });

        if (res.ok) {
            forms.provisionStatus('success');
            forms.provisionResult(res.value);
            forms.lastAction(res.value.noop
                ? `Service "${name}" was already provisioned at ref "${ref}" on ${host} (no-op).`
                : `Provisioned "${name}" onto ${host} at ref "${ref}".`);
        } else {
            forms.provisionStatus('error');
            const err = res.error;
            const detail = 'detail' in err && typeof err.detail === 'string' ? err.detail : '';
            const msg = detail.toLowerCase().includes('allowlist')
                ? `This repository is not permitted: "${repository}" is not in the allowlist (MESH_PROVISION_ALLOWED_REPOSITORIES).`
                : `Provisioning failed (${err.kind}): ${detail || err.kind}`;
            forms.provisionError(msg);
            forms.lastAction(msg);
            state.cx.notifications.error(msg);
        }
    } finally {
        forms.busy(false);
        await state.refresh();
    }
}

export async function createFleetGroup(
    state: OperatorStateBundle,
    forms: FleetFormSignals,
    name?: string,
    description?: string,
    services?: readonly string[],
): Promise<void> {
    const trimmed = (name ?? forms.newGroupName()).trim();
    if (!trimmed) {
        forms.lastAction('Group name cannot be empty.');
        state.cx.notifications.error('Group name cannot be empty.');
        return;
    }
    const desc = description ?? (forms.newGroupDescription().trim() || undefined);
    const srvs = services ?? (forms.newGroupServices().trim() !== ''
        ? forms.newGroupServices().split(',').map((s) => s.trim()).filter(Boolean) : undefined);
    forms.busy(true);
    try {
        const res = await state.cx.mesh.call('group.create', {
            name: trimmed,
            ...(desc ? { description: desc } : {}),
            ...(srvs && srvs.length > 0 ? { services: [...srvs] } : {}),
        });
        if (res.ok) {
            forms.lastAction(`Created group "${trimmed}".`);
            await state.refresh();
            selectFleetGroup(state, trimmed);
        } else {
            const detail = 'detail' in res.error && typeof res.error.detail === 'string' ? res.error.detail : res.error.kind;
            const msg = `Could not create group (${res.error.kind}): ${detail}`;
            forms.lastAction(msg);
            state.cx.notifications.error(msg);
        }
    } finally {
        forms.busy(false);
    }
}

export async function updateFleetGroup(
    state: OperatorStateBundle,
    forms: FleetFormSignals,
    id: string,
    patch?: { name?: string; description?: string; services?: readonly string[] },
): Promise<void> {
    forms.busy(true);
    try {
        const desc = patch?.description ?? (forms.editGroupDescription().trim() || undefined);
        const srvs = patch?.services ?? (forms.editGroupServices().trim() !== ''
            ? forms.editGroupServices().split(',').map((s) => s.trim()).filter(Boolean) : undefined);
        const res = await state.cx.mesh.call('group.update', {
            id,
            ...(patch?.name ? { name: patch.name } : {}),
            ...(desc !== undefined ? { description: desc } : {}),
            ...(srvs ? { services: [...srvs] } : {}),
        });
        if (res.ok) {
            forms.lastAction(`Updated group "${res.value.name}".`);
            await state.refresh();
        } else {
            const detail = 'detail' in res.error && typeof res.error.detail === 'string' ? res.error.detail : res.error.kind;
            const msg = `Could not update group (${res.error.kind}): ${detail}`;
            forms.lastAction(msg);
            state.cx.notifications.error(msg);
        }
    } finally {
        forms.busy(false);
    }
}
