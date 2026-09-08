import {
    computed,
    type Context,
    type Json,
    type Signal,
} from '@flybyme/mesh-web';

import { chromeApi, type NodeStatusOutput } from '../generated/api.js';
import {
    CONSUMES,
    CORE_SERVICES,
    NEEDS,
    type FleetNode,
} from './contract.js';
import { formatRoute, parseRoute } from '../nav/router.js';

export interface OperatorStateBundle {
    readonly cx: Context<typeof NEEDS, typeof CONSUMES, typeof chromeApi>;
    readonly selectedPartName: Signal<string | null>;
    readonly selectedVersionNumber: Signal<string | null>;
    readonly selectedReleaseHash: Signal<string | null>;
    readonly selectedHost: Signal<string | null>;
    readonly selectedHostname: Signal<string | null>;
    readonly selectedGroupName: Signal<string | null>;
    readonly activeView: Signal<'parts' | 'releases' | 'sites' | 'fleet'>;
    readonly nodeStatus: Signal<NodeStatusOutput | null>;
    readonly nodeStatusError: Signal<string | null>;
    readonly fleet: () => readonly FleetNode[];
    readonly knownServices: () => readonly string[];
    readonly live: () => boolean;
    readonly status: () => 'idle' | 'loading' | 'ready' | 'error';
    readonly error: () => string | null;
    refresh(): Promise<void>;
    updateRoute(view: 'parts' | 'releases' | 'sites' | 'fleet', params?: Record<string, Json>): void;
}

export function createOperatorState(
    cx: Context<typeof NEEDS, typeof CONSUMES, typeof chromeApi>,
): OperatorStateBundle {
    const parts = cx.models('part');
    const selectedPartName = cx.state.signal<string | null>(null);

    const versions = cx.models('partVersion', () => {
        const partName = selectedPartName();
        return partName !== null ? { query: { partName } } : { query: { partName: '' } };
    });
    const selectedVersionNumber = cx.state.signal<string | null>(null);

    const releases = cx.models('release');
    const selectedReleaseHash = cx.state.signal<string | null>(null);

    const sites = cx.models('site');
    const selectedHost = cx.state.signal<string | null>(null);

    const nodes = cx.models('node');
    const selectedHostname = cx.state.signal<string | null>(null);

    const groups = cx.models('group');
    const selectedGroupName = cx.state.signal<string | null>(null);

    const activeView = cx.state.signal<'parts' | 'releases' | 'sites' | 'fleet'>('parts');
    const nodeStatus = cx.state.signal<NodeStatusOutput | null>(null);
    const nodeStatusError = cx.state.signal<string | null>(null);

    const status = computed<'idle' | 'loading' | 'ready' | 'error'>(() => {
        const all = [parts.status(), versions.status(), releases.status(), sites.status(), nodes.status(), groups.status()];
        if (all.some((s) => s === 'error')) return 'error';
        if (all.some((s) => s === 'loading')) return 'loading';
        if (all.every((s) => s === 'ready')) return 'ready';
        return 'idle';
    });

    const live = computed<boolean>(() =>
        parts.live() && releases.live() && sites.live() && nodes.live() && groups.live(),
    );

    const error = computed<string | null>(() => {
        for (const m of [parts, versions, releases, sites, nodes, groups]) {
            const err = m.error();
            if (err !== null) {
                const detail = 'detail' in err && typeof err.detail === 'string' ? err.detail : err.kind;
                return `Error loading data (${err.kind}): ${detail}`;
            }
        }
        return nodeStatusError();
    });

    const fleet = (): readonly FleetNode[] => {
        const observed = new Map((nodeStatus()?.nodes ?? []).map((n) => [n.hostname, n]));
        return nodes.rows().map((row) => {
            const seen = observed.get(row.hostname);
            const srvs = row.services ?? [];
            const running = seen?.runningServices ?? [];
            const provisioned = seen?.provisionedServices
                ?? (nodeStatus()?.hostname === row.hostname ? (nodeStatus()?.provisionedServices ?? []) : []);
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
    };

    const knownServices = (): readonly string[] => {
        const all = new Set<string>();
        for (const n of nodes.rows()) for (const s of n.services ?? []) all.add(s);
        for (const g of groups.rows()) for (const s of g.services ?? []) all.add(s);
        for (const n of nodeStatus()?.nodes ?? []) {
            for (const s of n.runningServices ?? []) all.add(s);
            for (const s of n.provisionedServices ?? []) all.add(s);
        }
        for (const s of nodeStatus()?.provisionedServices ?? []) all.add(s);
        for (const core of CORE_SERVICES) all.delete(core);
        return [...all].sort();
    };

    const refresh = async (): Promise<void> => {
        const promises: Promise<unknown>[] = [];
        for (const m of [parts, versions, releases, sites, nodes, groups]) {
            if (m.status() !== 'idle') promises.push(m.refetch());
        }
        promises.push(cx.mesh.call('node.status', {}).then((res) => {
            if (res.ok) {
                nodeStatus.set(res.value);
                nodeStatusError.set(null);
            } else {
                const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                    ? res.error.detail : res.error.kind;
                nodeStatusError.set(`Node status error (${res.error.kind}): ${detail}`);
            }
        }));
        try {
            await Promise.all(promises);
        } catch {}
    };

    const updateRoute = (view: 'parts' | 'releases' | 'sites' | 'fleet', params?: Record<string, Json>): void => {
        activeView.set(view);
        if (typeof window !== 'undefined') {
            const formatted = formatRoute({ owner: 'operator', view, params: params ?? {} });
            if (window.location.hash !== formatted) {
                window.history.pushState(null, '', formatted);
            }
        }
    };

    // Auto-select initial rows if nothing selected and no route param
    cx.state.effect(() => {
        const pRows = parts.rows();
        if (selectedPartName() === null && pRows.length > 0) {
            selectedPartName.set(pRows[0]?.name ?? null);
        }
    });

    cx.state.effect(() => {
        const vRows = versions.rows();
        if (vRows.length > 0) {
            selectedVersionNumber.set(vRows[0]?.version ?? null);
        } else {
            selectedVersionNumber.set(null);
        }
    });

    cx.state.effect(() => {
        const sRows = sites.rows();
        if (selectedHost() === null && sRows.length > 0) {
            selectedHost.set(sRows[0]?.host ?? null);
        }
    });

    cx.state.effect(() => {
        const rRows = releases.rows();
        if (selectedReleaseHash() === null && rRows.length > 0) {
            selectedReleaseHash.set(rRows[0]?.hash ?? null);
        }
    });

    cx.state.effect(() => {
        const nRows = nodes.rows();
        if (selectedHostname() === null && nRows.length > 0) {
            selectedHostname.set(nRows[0]?.hostname ?? null);
        }
    });

    // Sync from URL hash
    const syncFromHash = () => {
        if (typeof window === 'undefined') return;
        const parsed = parseRoute(window.location.hash);
        if (!parsed) return;

        const view = (parsed.view.split('/').pop() ?? parsed.view) as 'parts' | 'releases' | 'sites' | 'fleet';
        if (view === 'parts' || view === 'releases' || view === 'sites' || view === 'fleet') {
            activeView.set(view);
        }

        const params = parsed.params;
        if (!params) return;

        if (typeof params.name === 'string') selectedPartName.set(params.name);
        if (typeof params.hash === 'string') selectedReleaseHash.set(params.hash);
        if (typeof params.host === 'string') selectedHost.set(params.host);
        if (typeof params.hostname === 'string') selectedHostname.set(params.hostname);
        if (typeof params.group === 'string') selectedGroupName.set(params.group);
    };

    if (typeof window !== 'undefined') {
        syncFromHash();
        const onHash = () => { syncFromHash(); };
        window.addEventListener('popstate', onHash);
        window.addEventListener('hashchange', onHash);
        cx.onDispose(() => {
            window.removeEventListener('popstate', onHash);
            window.removeEventListener('hashchange', onHash);
        });
    }

    return {
        cx,
        selectedPartName,
        selectedVersionNumber,
        selectedReleaseHash,
        selectedHost,
        selectedHostname,
        selectedGroupName,
        activeView,
        nodeStatus,
        nodeStatusError,
        fleet,
        knownServices,
        live,
        status,
        error,
        refresh,
        updateRoute,
    };
}
