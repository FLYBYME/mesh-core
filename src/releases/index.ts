import {
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type ViewDecl,
} from '@flybyme/mesh-web';

import {
    chromeApi,
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

export default class ReleasesApp implements Application<typeof NEEDS, readonly [], typeof RELEASES, typeof chromeApi> {
    readonly needs = NEEDS;
    readonly provides = RELEASES;
    readonly api = chromeApi;

    readonly commands: readonly CommandDecl[] = [
        { id: 'releases.refresh', title: 'Releases: Refresh Data' },
        { id: 'releases.selectSite', title: 'Releases: Select Site' },
        { id: 'releases.selectRelease', title: 'Releases: Select Release' },
        { id: 'releases.setComposeKernel', title: 'Releases: Set Kernel Range' },
        { id: 'releases.setComposeName', title: 'Releases: Set Release Name' },
        { id: 'releases.setComposeParts', title: 'Releases: Set Parts Text' },
        { id: 'releases.dryRunCompose', title: 'Releases: Dry Run Compose' },
        { id: 'releases.commitCompose', title: 'Releases: Commit Compose' },
        { id: 'releases.deployRelease', title: 'Releases: Deploy Release' },
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
        const composePartsText = cx.state.signal<string>('');
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

            const edited = composeKernel() !== '' || composePartsText() !== '';
            if (edited && composeSeededFrom() === null) return;

            composeKernel.set(`^${release.kernel.version}`);
            composeName.set(release.name ?? '');
            composePartsText.set(
                Object.entries(release.parts)
                    .map(([id, part]) => `${id}: ^${part.version}`)
                    .join('\n'),
            );
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
            await Promise.all([sites.refetch(), releases.refetch()]);
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
        };

        const setComposeName = (name: string): void => {
            composeName.set(name);
        };

        const setComposePartsText = (textVal: string): void => {
            composePartsText.set(textVal);
        };

        const runCompose = async (dryRun: boolean): Promise<void> => {
            composeStatus.set('composing');
            composeError.set(null);
            composeResult.set(null);

            const parts = parsePartsInput(composePartsText());
            if (parts.length === 0) {
                composeStatus.set('error');
                composeError.set('No valid parts entered. Format: "id: range" — one per line.');
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
                composeError.set(`Composition failed (${res.error.kind}): ${detail}`);
            }
        };

        const runDeploy = async (host: string, releaseHash: string): Promise<void> => {
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
                deployError.set(`Deploy failed (${res.error.kind}): ${detail}`);
            }
        };

        cx.commands.implement('releases.refresh', async () => {
            await loadData();
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
            sitesError,
            releasesStatus: releases.status,
            releasesError,
            composeKernel,
            composeName,
            composePartsText,
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
            setComposePartsText,
            runCompose,
            runDeploy,
        };
    }
}

export { ReleasesApp };
