import type { GroupFindOutputItem, NodeFindOutputItem, NodeStatusOutput } from '../generated/api.js';
import { CORE_SERVICES, type FleetNode } from './contract.js';

export function computeFleet(
    nodes: readonly NodeFindOutputItem[],
    nodeStatus: NodeStatusOutput | null,
): readonly FleetNode[] {
    const observed = new Map((nodeStatus?.nodes ?? []).map((n) => [n.hostname, n]));
    return nodes.map((row) => {
        const seen = observed.get(row.hostname);
        const srvs = row.services ?? [];
        const running = seen?.runningServices ?? [];
        const provisioned = seen?.provisionedServices
            ?? (nodeStatus?.hostname === row.hostname ? (nodeStatus?.provisionedServices ?? []) : []);
        return {
            hostname: row.hostname,
            services: srvs,
            groups: row.groups ?? [],
            connected: seen?.connected ?? false,
            running,
            provisioned,
            missing: srvs.filter((s) => !running.includes(s)),
            extra: running.filter((s) => !srvs.includes(s)),
        };
    });
}

export function computeKnownServices(
    nodes: readonly NodeFindOutputItem[],
    groups: readonly GroupFindOutputItem[],
    nodeStatus: NodeStatusOutput | null,
): readonly string[] {
    const all = new Set<string>();
    for (const n of nodes) for (const s of n.services ?? []) all.add(s);
    for (const g of groups) for (const s of g.services ?? []) all.add(s);
    for (const n of nodeStatus?.nodes ?? []) {
        for (const s of n.runningServices ?? []) all.add(s);
        for (const s of n.provisionedServices ?? []) all.add(s);
    }
    for (const s of nodeStatus?.provisionedServices ?? []) all.add(s);
    for (const core of CORE_SERVICES) all.delete(core);
    return [...all].sort();
}
