import {
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type ViewDecl,
} from '@flybyme/mesh-web';

import {
    chromeApi,
    type CatalogResolveOutput,
    type PartFindOutputItem,
    type PartVersionFindOutputItem,
} from '../generated/api.js';

import {
    CATALOG,
    NEEDS,
    type CatalogApi,
} from './contract.js';
import { renderCatalogView } from './views/browser.js';

export * from './contract.js';

export default class CatalogApp implements Application<typeof NEEDS, readonly [], typeof CATALOG, typeof chromeApi> {
    readonly needs = NEEDS;
    readonly provides = CATALOG;
    readonly api = chromeApi;

    readonly commands: readonly CommandDecl[] = [
        { id: 'catalog.refresh', title: 'Catalog: Refresh Parts' },
        { id: 'catalog.selectPart', title: 'Catalog: Select Part' },
        { id: 'catalog.selectVersion', title: 'Catalog: Select Version' },
        { id: 'catalog.setSearch', title: 'Catalog: Search Parts' },
        { id: 'catalog.setKindFilter', title: 'Catalog: Filter Kind' },
        { id: 'catalog.setResolveKernel', title: 'Catalog: Set Resolver Kernel' },
        { id: 'catalog.setResolvePartName', title: 'Catalog: Set Resolver Part Name' },
        { id: 'catalog.setResolvePartRange', title: 'Catalog: Set Resolver Part Range' },
        { id: 'catalog.runResolve', title: 'Catalog: Resolve Requirements' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, CatalogApi>[] = [
        {
            id: 'browser',
            title: 'Catalog Browser',
            render: renderCatalogView,
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly [], typeof chromeApi>): Promise<CatalogApi> {
        const parts = cx.models('part');
        const selectedPartName = cx.state.signal<string | null>(null);

        const versions = cx.models('partVersion', () => {
            const partName = selectedPartName();
            return partName !== null ? { query: { partName } } : { query: { partName: '' } };
        });
        const selectedVersionNumber = cx.state.signal<string | null>(null);

        const errorMessage = cx.state.computed<string | null>(() => {
            const err = parts.error();
            if (err === null) return null;
            const detail = 'detail' in err && typeof err.detail === 'string'
                ? err.detail
                : err.kind;
            return `Failed to load catalog parts (${err.kind}): ${detail}`;
        });

        const versionErrorMessage = cx.state.computed<string | null>(() => {
            const err = versions.error();
            if (err === null) return null;
            const detail = 'detail' in err && typeof err.detail === 'string'
                ? err.detail
                : err.kind;
            return `Failed to load versions (${err.kind}): ${detail}`;
        });

        const searchQuery = cx.state.signal<string>('');
        const kindFilter = cx.state.signal<'all' | 'kernel' | 'application' | 'extension'>('all');

        const resolveKernel = cx.state.signal<string>('^0.11');
        const resolvePartName = cx.state.signal<string>('chrome');
        const resolvePartRange = cx.state.signal<string>('^0.1.0');
        const resolveStatus = cx.state.signal<'idle' | 'resolving' | 'success' | 'error'>('idle');
        const resolveResult = cx.state.signal<CatalogResolveOutput | null>(null);
        const resolveError = cx.state.signal<string | null>(null);

        const selectedPart = cx.state.computed<PartFindOutputItem | null>(() => {
            const name = selectedPartName();
            if (name === null) return null;
            for (const p of parts.rows()) {
                if (p.name === name) return p;
            }
            return null;
        });

        const selectedVersion = cx.state.computed<PartVersionFindOutputItem | null>(() => {
            const ver = selectedVersionNumber();
            if (ver === null) return null;
            for (const v of versions.rows()) {
                if (v.version === ver) return v;
            }
            return null;
        });

        const filteredParts = cx.state.computed<readonly PartFindOutputItem[]>(() => {
            const q = searchQuery().toLowerCase().trim();
            const k = kindFilter();
            return parts.rows().filter((p) => {
                if (k !== 'all' && p.kind !== k) return false;
                if (q === '') return true;
                if (p.name.toLowerCase().includes(q)) return true;
                if (p.publisher.toLowerCase().includes(q)) return true;
                if (p.description !== undefined && p.description.toLowerCase().includes(q)) return true;
                if (p.keywords !== undefined && p.keywords.some((kw) => kw.toLowerCase().includes(q))) return true;
                return false;
            });
        });

        cx.state.effect(() => {
            const pRows = parts.rows();
            if (selectedPartName() === null && pRows.length > 0) {
                const first = pRows[0];
                if (first !== undefined) {
                    selectedPartName.set(first.name);
                    resolvePartName.set(first.name);
                }
            }
        });

        cx.state.effect(() => {
            const vRows = versions.rows();
            if (vRows.length > 0) {
                const first = vRows[0];
                if (first !== undefined) {
                    selectedVersionNumber.set(first.version);
                }
            } else {
                selectedVersionNumber.set(null);
            }
        });

        const selectPart = async (name: string): Promise<void> => {
            selectedPartName.set(name);
            resolvePartName.set(name);
            await versions.refetch();
        };

        const loadParts = async (): Promise<void> => {
            await parts.refetch();
        };

        const selectVersion = (version: string): void => {
            selectedVersionNumber.set(version);
        };

        const setSearch = (query: string): void => {
            searchQuery.set(query);
        };

        const setKindFilter = (kind: 'all' | 'kernel' | 'application' | 'extension'): void => {
            kindFilter.set(kind);
        };

        const runResolve = async (): Promise<void> => {
            resolveStatus.set('resolving');
            resolveError.set(null);
            resolveResult.set(null);

            const pName = resolvePartName().trim();
            const pRange = resolvePartRange().trim();
            const kRange = resolveKernel().trim();

            if (pName === '') {
                resolveStatus.set('error');
                resolveError.set('Part name cannot be empty.');
                return;
            }

            const res = await cx.mesh.call('catalog.resolve', {
                kernel: kRange === '' ? '^0.11' : kRange,
                parts: [{ name: pName, version: pRange === '' ? '*' : pRange }],
            });

            if (res.ok) {
                resolveResult.set(res.value);
                resolveStatus.set('success');
            } else {
                resolveStatus.set('error');
                const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                    ? res.error.detail
                    : res.error.kind;
                resolveError.set(`Resolution failed (${res.error.kind}): ${detail}`);
            }
        };

        cx.commands.implement('catalog.refresh', async () => {
            await loadParts();
        });

        cx.commands.implement('catalog.selectPart', async (val?: Json) => {
            if (typeof val === 'string') {
                await selectPart(val);
            }
        });

        cx.commands.implement('catalog.selectVersion', (val?: Json) => {
            if (typeof val === 'string') {
                selectVersion(val);
            }
        });

        cx.commands.implement('catalog.setSearch', (val?: Json) => {
            if (typeof val === 'string') {
                setSearch(val);
            }
        });

        cx.commands.implement('catalog.setKindFilter', (val?: Json) => {
            if (val === 'all' || val === 'kernel' || val === 'application' || val === 'extension') {
                setKindFilter(val);
            }
        });

        cx.commands.implement('catalog.setResolveKernel', (val?: Json) => {
            if (typeof val === 'string') resolveKernel.set(val);
        });

        cx.commands.implement('catalog.setResolvePartName', (val?: Json) => {
            if (typeof val === 'string') resolvePartName.set(val);
        });

        cx.commands.implement('catalog.setResolvePartRange', (val?: Json) => {
            if (typeof val === 'string') resolvePartRange.set(val);
        });

        cx.commands.implement('catalog.runResolve', async () => {
            await runResolve();
        });

        await parts.refetch();
        if (selectedPartName() !== null) {
            await versions.refetch();
        }

        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'browser' });
            }
        });

        return {
            parts: parts.rows,
            selectedPartName,
            selectedPart,
            versions: versions.rows,
            selectedVersionNumber,
            selectedVersion,
            status: parts.status,
            errorMessage,
            versionStatus: versions.status,
            versionErrorMessage,
            searchQuery,
            kindFilter,
            filteredParts,
            resolveKernel,
            resolvePartName,
            resolvePartRange,
            resolveStatus,
            resolveResult,
            resolveError,
            loadParts,
            selectPart,
            selectVersion,
            setSearch,
            setKindFilter,
            runResolve,
        };
    }
}

export { CatalogApp };
