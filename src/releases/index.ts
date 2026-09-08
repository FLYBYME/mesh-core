import {
    computed,
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type ViewDecl,
} from '@flybyme/mesh-web';

import {
    chromeApi,
    type CdnComposeInputPart,
    type CdnComposeOutput,
    type CdnDeployOutput,
    type ReleaseFindOutputItem,
    type SiteFindOutputItem,
} from '../generated/api.js';

import {
    NEEDS,
    RELEASES,
    type ReleasesApi,
} from './contract.js';
import { parsePartsInput } from './parse.js';
import { renderReleasesView } from './views/console.js';

export * from './contract.js';
export * from './parse.js';

function isRecord(val: unknown): val is Record<string, unknown> {
    return typeof val === 'object' && val !== null;
}

function isKind(val: unknown): val is 'application' | 'extension' {
    return val === 'application' || val === 'extension';
}

function toComposePart(item: unknown): CdnComposeInputPart | undefined {
    if (!isRecord(item)) return undefined;
    const id = typeof item.id === 'string' ? item.id : '';
    const version = typeof item.version === 'string' ? item.version : '';
    const kind = isKind(item.kind) ? item.kind : 'application';
    return { id, version, kind };
}

function parsePartsArray(val: unknown): readonly CdnComposeInputPart[] {
    if (!Array.isArray(val)) return [];
    const parts: CdnComposeInputPart[] = [];
    for (const item of val) {
        const p = toComposePart(item);
        if (p) parts.push(p);
    }
    return parts;
}

function extractPartPatch(patch: unknown): Partial<CdnComposeInputPart> {
    if (!isRecord(patch)) return {};
    const res: { id?: string; version?: string; kind?: 'application' | 'extension' } = {};
    if (typeof patch.id === 'string') res.id = patch.id;
    if (typeof patch.version === 'string') res.version = patch.version;
    if (isKind(patch.kind)) res.kind = patch.kind;
    return res;
}

export default class ReleasesApp implements Application<typeof NEEDS, readonly [], typeof RELEASES, typeof chromeApi> {
    readonly needs = NEEDS;
    readonly provides = RELEASES;
    readonly api = chromeApi;

    readonly commands: readonly CommandDecl[] = [
        { id: 'releases.selectSite', title: 'Releases: Select Site' },
        { id: 'releases.selectRelease', title: 'Releases: Select Release' },
        { id: 'releases.setComposeKernel', title: 'Releases: Set Kernel Range' },
        { id: 'releases.setComposeName', title: 'Releases: Set Release Name' },
        { id: 'releases.setComposeParts', title: 'Releases: Set Parts Text' },
        { id: 'releases.addComposePart', title: 'Releases: Add Part' },
        { id: 'releases.removeComposePart', title: 'Releases: Remove Part' },
        { id: 'releases.updateComposePart', title: 'Releases: Update Part' },
        { id: 'releases.updatePartId', title: 'Releases: Update Part ID' },
        { id: 'releases.updatePartVersion', title: 'Releases: Update Part Version' },
        { id: 'releases.updatePartKind', title: 'Releases: Update Part Kind' },
        { id: 'releases.setField', title: 'Releases: Set Field' },
        { id: 'releases.dryRunCompose', title: 'Releases: Dry Run Compose' },
        { id: 'releases.commitCompose', title: 'Releases: Commit Compose' },
        { id: 'releases.deployRelease', title: 'Releases: Deploy Release' },
        { id: 'releases.setComposeRolling', title: 'Releases: Set Rolling' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, ReleasesApi>[] = [
        {
            id: 'console',
            title: 'Releases & Deploy Console',
            render: renderReleasesView,
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly [], typeof chromeApi>): Promise<ReleasesApi> {
        const sites = cx.models('site');
        const selectedHost = cx.state.signal<string | null>(null);
        const releases = cx.models('release');
        const selectedReleaseHash = cx.state.signal<string | null>(null);

        const sitesError = cx.state.computed<string | null>(() => {
            const err = sites.error();
            if (err === null) return null;
            const detail = 'detail' in err && typeof err.detail === 'string'
                ? err.detail
                : err.kind;
            return `Failed to load sites (${err.kind}): ${detail}`;
        });

        const releasesError = cx.state.computed<string | null>(() => {
            const err = releases.error();
            if (err === null) return null;
            const detail = 'detail' in err && typeof err.detail === 'string'
                ? err.detail
                : err.kind;
            return `Failed to load releases (${err.kind}): ${detail}`;
        });

        /**
         * The compose form starts empty and is **seeded from a real release**, never from constants.
         *
         * It used to default to `^0.11` and `chrome: ^0.1.2 / catalog: ^0.1.0 / releases: ^0.1.0`.
         * Those were correct on the day they were typed and wrong within a week — by the time the
         * platform reached kernel 0.13 and chrome 0.2.1, the console's own suggestion would have
         * composed a release that F5 is being written to refuse.
         *
         * A hardcoded version in a console is the same class of thing as a hardcoded path in an
         * artifact: it is a fact about one moment, recorded where nothing will ever update it.
         */
        const composeKernel = cx.state.signal<string>('');
        const composeName = cx.state.signal<string>('');
        const composeParts = cx.state.signal<readonly CdnComposeInputPart[]>([]);
        const composePartsText = cx.state.signal<string>('');
        const composeRolling = cx.state.signal<boolean>(false);
        /** Cleared when the user edits, so seeding never overwrites something typed. */
        const composeSeededFrom = cx.state.signal<string | null>(null);
        const composeStatus = cx.state.signal<'idle' | 'composing' | 'success' | 'error'>('idle');
        const composeResult = cx.state.signal<CdnComposeOutput | null>(null);
        const composeError = cx.state.signal<string | null>(null);

        const deployStatus = cx.state.signal<'idle' | 'deploying' | 'success' | 'error'>('idle');
        const deployResult = cx.state.signal<CdnDeployOutput | null>(null);
        const deployError = cx.state.signal<string | null>(null);

        const selectedSite = cx.state.computed<SiteFindOutputItem | null>(() => {
            const h = selectedHost();
            if (h === null) return null;
            for (const s of sites.rows()) {
                if (s.host === h) return s;
            }
            return null;
        });

        const selectedRelease = cx.state.computed<ReleaseFindOutputItem | null>(() => {
            const hash = selectedReleaseHash();
            if (hash === null) return null;
            for (const r of releases.rows()) {
                if (r.hash === hash) return r;
            }
            return null;
        });

        cx.state.effect(() => {
            const sRows = sites.rows();
            if (selectedHost() === null && sRows.length > 0) {
                const first = sRows[0];
                if (first !== undefined) {
                    selectedHost.set(first.host);
                }
            }
        });

        /**
         * Seed the compose form from whichever release is selected.
         *
         * A range rather than the exact version — `^0.13.0` from kernel `0.13.0` — because composing
         * is usually *the same shape, moved forward*, and an exact pin is the thing the caller would
         * have to delete first. `checkComposition` resolves the range against the catalog, so the
         * suggestion is only ever a starting point.
         *
         * Reseeds when the selection changes and stops the moment the text is edited, tracked by
         * which release the current text came from. An effect that overwrites what somebody just
         * typed is worse than no defaults at all.
         */
        cx.state.effect(() => {
            const release = selectedRelease();
            if (release === null) return;
            if (composeSeededFrom() === release.hash) return;

            const edited = composeKernel() !== '' || composeParts().length > 0;
            if (edited && composeSeededFrom() === null) return;

            if (release.source) {
                composeKernel.set(release.source.kernel);
                composeParts.set(release.source.parts);
                composePartsText.set(release.source.parts.map((p) => `${p.id}: ${p.version}`).join('\n'));
            } else {
                composeKernel.set(`^${release.kernel.version}`);
                const seededParts: readonly CdnComposeInputPart[] = Object.entries(release.parts).map(([id, part]) => ({
                    id,
                    version: `^${part.version}`,
                    kind: (id === 'chrome' || id === 'theme' || id === 'auth' || id === 'ui') ? 'extension' : 'application',
                }));
                composeParts.set(seededParts);
                composePartsText.set(seededParts.map((p) => `${p.id}: ${p.version}`).join('\n'));
            }
            composeName.set(release.name ?? '');
            composeRolling.set(release.rolling ?? false);
            composeSeededFrom.set(release.hash);
        });

        cx.state.effect(() => {
            const rRows = releases.rows();
            if (selectedReleaseHash() === null && rRows.length > 0) {
                const first = rRows[0];
                if (first !== undefined) {
                    selectedReleaseHash.set(first.hash);
                }
            }
        });

        const loadData = async (): Promise<void> => {
            const promises: Promise<unknown>[] = [];
            if (sites.status() !== 'idle') {
                promises.push(sites.refetch());
            }
            if (releases.status() !== 'idle') {
                promises.push(releases.refetch());
            }
            try {
                await Promise.all(promises);
            } catch {}
        };

        const selectSite = (host: string): void => {
            selectedHost.set(host);
            deployResult.set(null);
            deployError.set(null);
        };

        const selectRelease = (hash: string): void => {
            selectedReleaseHash.set(hash);
            deployResult.set(null);
            deployError.set(null);
        };

        const setComposeKernel = (kernel: string): void => {
            composeKernel.set(kernel);
            composeSeededFrom.set(null);
        };

        const setComposeName = (name: string): void => {
            composeName.set(name);
            composeSeededFrom.set(null);
        };

        const setComposeParts = (val: readonly CdnComposeInputPart[] | string): void => {
            if (typeof val === 'string') {
                const parsed = parsePartsInput(val);
                composeParts.set(parsed);
                composePartsText.set(val);
            } else if (Array.isArray(val)) {
                composeParts.set(val);
                composePartsText.set(val.map((p) => `${p.id}: ${p.version}`).join('\n'));
            }
            composeSeededFrom.set(null);
        };

        const setComposePartsText = (textVal: string): void => {
            setComposeParts(textVal);
        };

        const setField = (fieldVal?: Json, val?: Json): void => {
            const field = String(fieldVal ?? '');
            if (field === 'name') {
                composeName.set(typeof val === 'string' ? val : String(val ?? ''));
                composeSeededFrom.set(null);
            } else if (field === 'kernel') {
                composeKernel.set(typeof val === 'string' ? val : String(val ?? ''));
                composeSeededFrom.set(null);
            } else if (field === 'parts') {
                if (Array.isArray(val)) {
                    const parsed = parsePartsArray(val);
                    composeParts.set(parsed);
                    composePartsText.set(parsed.map((p) => `${p.id}: ${p.version}`).join('\n'));
                    composeSeededFrom.set(null);
                }
            } else if (field === 'rolling') {
                composeRolling.set(val === true || val === 'true');
                composeSeededFrom.set(null);
            }
        };

        const setComposeRolling = (rolling: boolean): void => {
            composeRolling.set(rolling);
            composeSeededFrom.set(null);
        };

        const addComposePart = (part?: Partial<CdnComposeInputPart>): void => {
            const curr = [...composeParts()];
            curr.push({
                id: part?.id ?? '',
                version: part?.version ?? '^0.1.0',
                kind: part?.kind ?? 'application',
            });
            composeParts.set(curr);
            composePartsText.set(curr.map((p) => `${p.id}: ${p.version}`).join('\n'));
            composeSeededFrom.set(null);
        };

        const removeComposePart = (indexVal?: Json): void => {
            const idx = typeof indexVal === 'number' ? indexVal : parseInt(String(indexVal ?? '-1'), 10);
            const curr = [...composeParts()];
            if (idx >= 0 && idx < curr.length) {
                curr.splice(idx, 1);
                composeParts.set(curr);
                composePartsText.set(curr.map((p) => `${p.id}: ${p.version}`).join('\n'));
                composeSeededFrom.set(null);
            }
        };

        const updateComposePart = (indexVal?: Json, patchVal?: Json): void => {
            const idx = typeof indexVal === 'number' ? indexVal : parseInt(String(indexVal ?? '-1'), 10);
            const curr = [...composeParts()];
            const target = curr[idx];
            if (idx >= 0 && idx < curr.length && target !== undefined && isRecord(patchVal)) {
                const patch = extractPartPatch(patchVal);
                curr[idx] = {
                    id: patch.id ?? target.id,
                    version: patch.version ?? target.version,
                    kind: patch.kind ?? target.kind,
                };
                composeParts.set(curr);
                composePartsText.set(curr.map((p) => `${p.id}: ${p.version}`).join('\n'));
                composeSeededFrom.set(null);
            }
        };

        const updatePartId = (indexVal?: Json, idVal?: Json): void => {
            const idx = typeof indexVal === 'number' ? indexVal : parseInt(String(indexVal ?? '-1'), 10);
            const id = typeof idVal === 'string' ? idVal : String(idVal ?? '');
            const curr = [...composeParts()];
            if (idx >= 0 && idx < curr.length && curr[idx] !== undefined) {
                const existing = curr[idx];
                const kind = (id === 'chrome' || id === 'theme' || id === 'auth' || id === 'ui') ? 'extension' : existing.kind;
                curr[idx] = { ...existing, id, kind };
                composeParts.set(curr);
                composePartsText.set(curr.map((p) => `${p.id}: ${p.version}`).join('\n'));
                composeSeededFrom.set(null);
            }
        };

        const updatePartVersion = (indexVal?: Json, versionVal?: Json): void => {
            const idx = typeof indexVal === 'number' ? indexVal : parseInt(String(indexVal ?? '-1'), 10);
            const version = typeof versionVal === 'string' ? versionVal : String(versionVal ?? '');
            const curr = [...composeParts()];
            if (idx >= 0 && idx < curr.length && curr[idx] !== undefined) {
                curr[idx] = { ...curr[idx], version };
                composeParts.set(curr);
                composePartsText.set(curr.map((p) => `${p.id}: ${p.version}`).join('\n'));
                composeSeededFrom.set(null);
            }
        };

        const updatePartKind = (indexVal?: Json, kindVal?: Json): void => {
            const idx = typeof indexVal === 'number' ? indexVal : parseInt(String(indexVal ?? '-1'), 10);
            const kind = kindVal === 'extension' ? 'extension' : 'application';
            const curr = [...composeParts()];
            if (idx >= 0 && idx < curr.length && curr[idx] !== undefined) {
                curr[idx] = { ...curr[idx], kind };
                composeParts.set(curr);
                composePartsText.set(curr.map((p) => `${p.id}: ${p.version}`).join('\n'));
                composeSeededFrom.set(null);
            }
        };

        const runCompose = async (dryRun: boolean): Promise<void> => {
            composeStatus.set('composing');
            composeError.set(null);
            composeResult.set(null);

            const parts = composeParts().filter((p) => p.id.trim() !== '' && p.version.trim() !== '');
            if (parts.length === 0) {
                composeStatus.set('error');
                composeError.set('No valid parts entered. Add at least one part with an ID and version range.');
                return;
            }

            const kernel = composeKernel().trim();
            if (kernel === '') {
                // Refused rather than defaulted. The old code substituted `^0.11` for an empty
                // field, so a release could be composed against a kernel nobody chose and nothing
                // in the result said which one it was.
                composeStatus.set('error');
                composeError.set('A kernel range is required. Select a release to seed one, or type it.');
                return;
            }

            const trimmedName = composeName().trim();
            const res = await cx.mesh.call('cdn.compose', {
                kernel,
                parts,
                dryRun,
                rolling: composeRolling(),
                ...(trimmedName !== '' ? { name: trimmedName } : {}),
            });

            if (res.ok) {
                composeResult.set(res.value);
                composeStatus.set('success');
                if (!dryRun) {
                    await releases.refetch();
                    selectedReleaseHash.set(res.value.hash);
                }
            } else {
                composeStatus.set('error');
                const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                    ? res.error.detail
                    : res.error.kind;
                const msg = `Composition failed (${res.error.kind}): ${detail}`;
                composeError.set(msg);
                cx.notifications.error(msg);
            }
        };

        const runDeploy = async (host: string, releaseHash: string): Promise<void> => {
            if (!host || !releaseHash) return;

            const ok = await cx.confirmation.ask({
                message: `Deploy release "${releaseHash}" to "${host}"? This will switch live traffic.`,
                confirmLabel: 'Deploy release',
                destructive: true,
            });
            if (!ok) return;

            deployStatus.set('deploying');
            deployError.set(null);
            deployResult.set(null);

            const res = await cx.mesh.call('cdn.deploy', { host, release: releaseHash });
            if (res.ok) {
                deployResult.set(res.value);
                deployStatus.set('success');
                await sites.refetch();
            } else {
                deployStatus.set('error');
                const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                    ? res.error.detail
                    : res.error.kind;
                const msg = `Deploy failed (${res.error.kind}): ${detail}`;
                deployError.set(msg);
                cx.notifications.error(msg);
            }
        };

        cx.commands.implement('releases.setComposeRolling', (val?: Json) => {
            if (typeof val === 'boolean') {
                setComposeRolling(val);
            } else if (typeof val === 'string') {
                setComposeRolling(val === 'true');
            } else {
                setComposeRolling(!composeRolling());
            }
        });


        cx.commands.implement('releases.selectSite', (val?: Json) => {
            if (typeof val === 'string') selectSite(val);
        });

        cx.commands.implement('releases.selectRelease', (val?: Json) => {
            if (typeof val === 'string') selectRelease(val);
        });

        cx.commands.implement('releases.setComposeKernel', (val?: Json) => {
            if (typeof val === 'string') setComposeKernel(val);
        });

        cx.commands.implement('releases.setComposeName', (val?: Json) => {
            if (typeof val === 'string') setComposeName(val);
        });

        cx.commands.implement('releases.setComposeParts', (val?: Json) => {
            if (typeof val === 'string') setComposePartsText(val);
            else if (Array.isArray(val)) setComposeParts(parsePartsArray(val));
        });

        cx.commands.implement('releases.addComposePart', () => {
            addComposePart();
        });

        cx.commands.implement('releases.removeComposePart', (indexVal?: Json) => {
            removeComposePart(indexVal);
        });

        cx.commands.implement('releases.updateComposePart', (indexVal?: Json, patchVal?: Json) => {
            updateComposePart(indexVal, patchVal);
        });

        cx.commands.implement('releases.updatePartId', (indexVal?: Json, idVal?: Json) => {
            updatePartId(indexVal, idVal);
        });

        cx.commands.implement('releases.updatePartVersion', (indexVal?: Json, versionVal?: Json) => {
            updatePartVersion(indexVal, versionVal);
        });

        cx.commands.implement('releases.updatePartKind', (indexVal?: Json, kindVal?: Json) => {
            updatePartKind(indexVal, kindVal);
        });

        cx.commands.implement('releases.setField', (fieldVal?: Json, val?: Json) => {
            setField(fieldVal, val);
        });

        cx.commands.implement('releases.dryRunCompose', async () => {
            await runCompose(true);
        });

        cx.commands.implement('releases.commitCompose', async () => {
            await runCompose(false);
        });

        cx.commands.implement('releases.deployRelease', async (hostVal?: Json, releaseVal?: Json) => {
            const h = typeof hostVal === 'string' && hostVal !== '' ? hostVal : selectedHost();
            const r = typeof releaseVal === 'string' && releaseVal !== '' ? releaseVal : selectedReleaseHash();
            if (h !== null && r !== null) {
                await runDeploy(h, r);
            }
        });

        await loadData();

        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'console' });
            }
        });

        return {
            sites: sites.rows,
            selectedHost,
            selectedSite,
            releases: releases.rows,
            selectedReleaseHash,
            selectedRelease,
            sitesStatus: sites.status,
            sitesLive: sites.live,
            sitesError,
            releasesStatus: releases.status,
            releasesLive: releases.live,
            releasesError,
            live: computed(() => sites.live() && releases.live()),
            composeKernel,
            composeName,
            composeParts,
            composePartsText,
            composeRolling,
            composeStatus,
            composeResult,
            composeError,
            deployStatus,
            deployResult,
            deployError,
            loadData,
            selectSite,
            selectRelease,
            setComposeKernel,
            setComposeName,
            setComposeParts,
            setComposePartsText,
            setComposeRolling,
            addComposePart,
            removeComposePart,
            updateComposePart,
            setField,
            runCompose,
            runDeploy,
        };
    }
}

export { ReleasesApp };
