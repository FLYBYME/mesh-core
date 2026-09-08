import {
    AUTH,
    computed,
    type AuthApi,
    type Context,
    type Json,
    type ReadonlySignal,
    type Signal,
} from '@flybyme/mesh-web';

import {
    chromeApi,
    type GroupFindOutputItem,
    type NodeFindOutputItem,
    type NodeStatusOutput,
    type PartFindOutputItem,
    type PartVersionFindOutputItem,
    type ReleaseFindOutputItem,
    type SiteFindOutputItem,
} from '../generated/api.js';
import {
    CONSUMES,
    NEEDS,
    type FleetNode,
} from './contract.js';
import { computeFleet, computeKnownServices } from './fleetModel.js';
import { formatRoute, parseRoute } from '../nav/router.js';

export interface OperatorStateBundle {
    readonly cx: Context<typeof NEEDS, typeof CONSUMES, typeof chromeApi>;
    readonly auth?: AuthApi | undefined;
    readonly isSignedIn: ReadonlySignal<boolean>;
    readonly selectedPartName: Signal<string | null>;
    readonly selectedVersionNumber: Signal<string | null>;
    readonly selectedReleaseHash: Signal<string | null>;
    readonly selectedHost: Signal<string | null>;
    readonly selectedHostname: Signal<string | null>;
    readonly selectedGroupName: Signal<string | null>;
    readonly selectedNodeId: () => string | null;
    readonly activeView: Signal<'parts' | 'releases' | 'sites' | 'fleet'>;
    readonly nodeStatus: Signal<NodeStatusOutput | null>;
    readonly nodeStatusError: Signal<string | null>;
    readonly fleet: () => readonly FleetNode[];
    readonly knownServices: () => readonly string[];
    readonly parts: () => readonly PartFindOutputItem[];
    readonly versions: () => readonly PartVersionFindOutputItem[];
    readonly releases: () => readonly ReleaseFindOutputItem[];
    readonly sites: () => readonly SiteFindOutputItem[];
    readonly nodes: () => readonly NodeFindOutputItem[];
    readonly groups: () => readonly GroupFindOutputItem[];
    readonly selectedPart: () => PartFindOutputItem | null;
    readonly selectedVersion: () => PartVersionFindOutputItem | null;
    readonly selectedRelease: () => ReleaseFindOutputItem | null;
    readonly selectedSite: () => SiteFindOutputItem | null;
    readonly selectedNode: () => FleetNode | null;
    readonly selectedGroup: () => GroupFindOutputItem | null;
    readonly live: () => boolean;
    readonly status: () => 'idle' | 'loading' | 'ready' | 'error';
    readonly error: () => string | null;
    readonly errorMessage: () => string | null;
    readonly effectiveState: () => 'loading' | 'empty' | 'unauthenticated' | 'error' | 'ready';
    refresh(): Promise<void>;
    updateRoute(view: 'parts' | 'releases' | 'sites' | 'fleet', params?: Record<string, Json>): void;
}

export function createOperatorState(
    cx: Context<typeof NEEDS, typeof CONSUMES, typeof chromeApi>,
): OperatorStateBundle {
    let auth: AuthApi | undefined;
    try {
        auth = cx.use(AUTH);
    } catch {
        auth = undefined;
    }

    const isSignedIn = computed<boolean>(() => {
        if (auth !== undefined) return auth.session() !== null;
        return true;
    });
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

    const fleet = (): readonly FleetNode[] => computeFleet(nodes.rows(), nodeStatus());
    const knownServices = (): readonly string[] => computeKnownServices(nodes.rows(), groups.rows(), nodeStatus());

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

    const effectiveState = (): 'loading' | 'empty' | 'unauthenticated' | 'error' | 'ready' => {
        if (!isSignedIn()) return 'unauthenticated';
        const s = status();
        if (s === 'loading') return 'loading';
        if (s === 'error') return 'error';
        const v = activeView();
        if (v === 'parts' && parts.rows().length === 0) return 'empty';
        if (v === 'releases' && releases.rows().length === 0) return 'empty';
        if (v === 'sites' && sites.rows().length === 0) return 'empty';
        if (v === 'fleet' && nodes.rows().length === 0) return 'empty';
        return 'ready';
    };

    return {
        cx,
        auth,
        isSignedIn,
        selectedPartName,
        selectedVersionNumber,
        selectedReleaseHash,
        selectedHost,
        selectedHostname,
        selectedGroupName,
        selectedNodeId: () => selectedHostname(),
        activeView,
        nodeStatus,
        nodeStatusError,
        fleet,
        knownServices,
        parts: () => parts.rows(),
        versions: () => versions.rows(),
        releases: () => releases.rows(),
        sites: () => sites.rows(),
        nodes: () => nodes.rows(),
        groups: () => groups.rows(),
        selectedPart: () => parts.rows().find((p) => p.name === selectedPartName()) ?? null,
        selectedVersion: () => versions.rows().find((v) => v.version === selectedVersionNumber()) ?? null,
        selectedRelease: () => releases.rows().find((r) => r.hash === selectedReleaseHash()) ?? null,
        selectedSite: () => sites.rows().find((s) => s.host === selectedHost()) ?? null,
        selectedNode: () => fleet().find((n) => n.hostname === selectedHostname()) ?? null,
        selectedGroup: () => groups.rows().find((g) => g.name === selectedGroupName()) ?? null,
        live,
        status,
        error,
        errorMessage: () => error(),
        effectiveState,
        refresh,
        updateRoute,
    };
}
