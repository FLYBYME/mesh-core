import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';
import ReleasesApp, { RELEASES } from '../src/releases/index.js';
import UiExtension from '../src/ui/index.js';
import type {
    CdnComposeOutput,
    CdnDeployOutput,
    ReleaseFindOutputItem,
    SiteFindOutputItem,
} from '../src/generated/api.js';

const MOCK_SITES: SiteFindOutputItem[] = [
    {
        id: 'site_1',
        host: '127.0.0.1',
        application: 'demo',
        tenantId: 'flybyme',
        api: 'http://127.0.0.1:5005',
        releaseHash: 'sha256:11111111111111111111111111111111',
        mesh: [],
        theme: {},
        policy: {},
        title: 'Local Dev Site',
        indexable: false,
        createdAt: '2026-09-06T00:00:00.000Z',
        updatedAt: '2026-09-06T00:00:00.000Z',
    },
    {
        id: 'site_2',
        host: 'demo.localhost',
        application: 'demo',
        tenantId: 'flybyme',
        api: 'http://127.0.0.1:5005',
        releaseHash: 'sha256:22222222222222222222222222222222',
        mesh: [],
        theme: {},
        policy: {},
        title: 'Demo Staging Site',
        indexable: true,
        createdAt: '2026-09-06T00:00:00.000Z',
        updatedAt: '2026-09-06T00:00:00.000Z',
    },
];

const MOCK_RELEASES: ReleaseFindOutputItem[] = [
    {
        id: 'rel_1',
        hash: 'sha256:11111111111111111111111111111111',
        name: 'Release 0.1.0',
        tenantId: 'flybyme',
        kernel: {
            version: '0.11.4',
            digest: 'sha256:kernel1111',
        },
        parts: {
            chrome: {
                version: '0.1.2',
                digest: 'sha256:chrome1111',
            },
        },
        requires: ['identity.whoami'],
        composedAt: '2026-09-06T01:00:00.000Z',
        createdAt: '2026-09-06T01:00:00.000Z',
        updatedAt: '2026-09-06T01:00:00.000Z',
    },
    {
        id: 'rel_2',
        hash: 'sha256:22222222222222222222222222222222',
        name: 'Release 0.2.0',
        tenantId: 'flybyme',
        kernel: {
            version: '0.11.4',
            digest: 'sha256:kernel2222',
        },
        parts: {
            chrome: {
                version: '0.1.2',
                digest: 'sha256:chrome2222',
            },
            notes: {
                version: '0.1.0',
                digest: 'sha256:notes2222',
            },
        },
        requires: ['identity.whoami', 'part.find'],
        composedAt: '2026-09-06T01:30:00.000Z',
        createdAt: '2026-09-06T01:30:00.000Z',
        updatedAt: '2026-09-06T01:30:00.000Z',
    },
];

const MOCK_DRYRUN_OUTPUT: CdnComposeOutput = {
    hash: 'sha256:33333333333333333333333333333333',
    kernel: {
        version: '0.11.4',
        digest: 'sha256:kernel3333',
    },
    parts: {
        chrome: {
            version: '0.1.2',
            digest: 'sha256:chrome3333',
        },
    },
    existed: false,
    problems: [],
};

const MOCK_DEPLOY_OUTPUT: CdnDeployOutput = {
    host: '127.0.0.1',
    release: 'sha256:22222222222222222222222222222222',
    changed: true,
    unusedGrants: [],
};

describe('ReleasesApp', () => {
    const originalFetch = globalThis.fetch;
    let site: { dispose(): void; assertSingleFramework(): void } | undefined;
    let shouldFail = false;
    let mutableSites: SiteFindOutputItem[] = [];
    let mutableReleases: ReleaseFindOutputItem[] = [];
    let composeResponseOverride: CdnComposeOutput | undefined;

    beforeEach(() => {
        shouldFail = false;
        mutableSites = [...MOCK_SITES];
        mutableReleases = [...MOCK_RELEASES];
        composeResponseOverride = undefined;

        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const url = String(input);
            const method = init?.method ?? 'GET';

            if (shouldFail) {
                return new Response(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Not authenticated' }), {
                    status: 401,
                    headers: { 'content-type': 'application/json' },
                });
            }

            if (url.includes('/api/sites') && method === 'GET') {
                return new Response(JSON.stringify(mutableSites), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }

            if (url.includes('/api/releases') && method === 'GET') {
                return new Response(JSON.stringify(mutableReleases), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }

            // cdn.compose (POST /api/releases)
            if (url.includes('/api/releases') && method === 'POST') {
                const bodyText = typeof init?.body === 'string' ? init.body : '{}';
                const body: unknown = JSON.parse(bodyText);
                const isPayload = (val: unknown): val is { dryRun?: boolean; name?: string } =>
                    typeof val === 'object' && val !== null;
                const payload = isPayload(body) ? body : {};

                if (!payload.dryRun) {
                    const newRel: ReleaseFindOutputItem = {
                        id: 'rel_3',
                        hash: 'sha256:33333333333333333333333333333333',
                        name: payload.name ?? 'Composed Release',
                        tenantId: 'flybyme',
                        kernel: { version: '0.11.4', digest: 'sha256:kernel3333' },
                        parts: { chrome: { version: '0.1.2', digest: 'sha256:chrome3333' } },
                        composedAt: '2026-09-06T02:00:00.000Z',
                        createdAt: '2026-09-06T02:00:00.000Z',
                        updatedAt: '2026-09-06T02:00:00.000Z',
                    };
                    mutableReleases.push(newRel);
                }

                return new Response(JSON.stringify(composeResponseOverride ?? MOCK_DRYRUN_OUTPUT), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }

            // cdn.deploy (POST /api/sites/:host/deploy)
            if (url.includes('/deploy') && method === 'POST') {
                const bodyText = typeof init?.body === 'string' ? init.body : '{}';
                const body: unknown = JSON.parse(bodyText);
                const isDeploy = (val: unknown): val is { host: string; release: string } =>
                    typeof val === 'object' && val !== null && 'host' in val && 'release' in val;
                if (isDeploy(body)) {
                    for (let i = 0; i < mutableSites.length; i++) {
                        const s = mutableSites[i];
                        if (s !== undefined && s.host === body.host) {
                            mutableSites[i] = { ...s, releaseHash: body.release };
                        }
                    }
                    return new Response(JSON.stringify({
                        host: body.host,
                        release: body.release,
                        changed: true,
                        unusedGrants: [],
                    }), {
                        status: 200,
                        headers: { 'content-type': 'application/json' },
                    });
                }
                return new Response(JSON.stringify(MOCK_DEPLOY_OUTPUT), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }

            return new Response('Not Found', { status: 404 });
        };
    });

    afterEach(() => {
        site?.dispose();
        site = undefined;
        cleanup();
        globalThis.fetch = originalFetch;
        document.body.innerHTML = '';
    });

    it('loads and lists scoped sites and releases with live status', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'releases', contribution: ReleasesApp },
            ],
        });
        site = s;
        s.assertSingleFramework();

        const releasesApi = s.kernel.provided(RELEASES);
        expect(releasesApi).toBeDefined();
        if (!releasesApi) throw new Error('ReleasesApi not found');

        expect(releasesApi.sitesStatus()).toBe('ready');
        expect(releasesApi.sites().length).toBe(2);
        expect(releasesApi.releasesStatus()).toBe('ready');
        expect(releasesApi.releases().length).toBe(2);

        // Verify sites in DOM
        const siteItems = document.querySelectorAll('.site-item');
        expect(siteItems.length).toBe(2);

        // Verify releases in DOM
        const releaseItems = document.querySelectorAll('.release-item');
        expect(releaseItems.length).toBe(2);
    });

    it('supports dry run compose to inspect resolution without writing', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'releases', contribution: ReleasesApp },
            ],
        });
        site = s;

        const releasesApi = s.kernel.provided(RELEASES);
        if (!releasesApi) throw new Error('ReleasesApi not found');

        const dryRunBtn = document.querySelector('.btn-dryrun-compose');
        if (dryRunBtn instanceof HTMLElement) {
            dryRunBtn.click();
        }

        await releasesApi.runCompose(true);

        expect(releasesApi.composeStatus()).toBe('success');
        expect(releasesApi.composeResult()?.hash).toBe('sha256:33333333333333333333333333333333');

        // Dry run did NOT add a release row to mutableReleases
        expect(releasesApi.releases().length).toBe(2);

        const resultBox = document.querySelector('.compose-result-box');
        expect(resultBox).not.toBeNull();
        expect(resultBox?.textContent).toContain('Composition valid');
    });

    it('commits a new release and updates the release list', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'releases', contribution: ReleasesApp },
            ],
        });
        site = s;

        const releasesApi = s.kernel.provided(RELEASES);
        if (!releasesApi) throw new Error('ReleasesApi not found');

        await releasesApi.runCompose(false);

        expect(releasesApi.composeStatus()).toBe('success');
        expect(releasesApi.releases().length).toBe(3);
        expect(releasesApi.selectedReleaseHash()).toBe('sha256:33333333333333333333333333333333');
    });

    it('deploys release to a site and supports rollback', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'releases', contribution: ReleasesApp },
            ],
        });
        site = s;

        const releasesApi = s.kernel.provided(RELEASES);
        if (!releasesApi) throw new Error('ReleasesApi not found');

        // Select site 127.0.0.1 (currently on rel_1: sha256:1111...)
        releasesApi.selectSite('127.0.0.1');
        // Select rel_2 (sha256:2222...)
        releasesApi.selectRelease('sha256:22222222222222222222222222222222');
        await Promise.resolve();

        const deployBtn = document.querySelector('.btn-deploy-release');
        expect(deployBtn).not.toBeNull();

        const deployPromise = releasesApi.runDeploy('127.0.0.1', 'sha256:22222222222222222222222222222222');
        await new Promise((r) => setTimeout(r, 50));
        const confirmBtn = document.querySelector('.mesh-confirm-ok');
        if (confirmBtn instanceof HTMLButtonElement) {
            confirmBtn.click();
        }
        await deployPromise;

        expect(releasesApi.deployStatus()).toBe('success');

        // Verify site 127.0.0.1 now has releaseHash = sha256:2222...
        const updatedSite = releasesApi.sites().find((st) => st.host === '127.0.0.1');
        expect(updatedSite?.releaseHash).toBe('sha256:22222222222222222222222222222222');

        // Now select the previous release (rel_1: sha256:1111...) to test ROLLBACK
        releasesApi.selectRelease('sha256:11111111111111111111111111111111');
        expect(releasesApi.selectedRelease()?.hash).toBe('sha256:11111111111111111111111111111111');

        // Roll back site 127.0.0.1 to rel_1
        const rollbackPromise = releasesApi.runDeploy('127.0.0.1', 'sha256:11111111111111111111111111111111');
        await new Promise((r) => setTimeout(r, 50));
        const confirmRollbackBtn = document.querySelector('.mesh-confirm-ok');
        if (confirmRollbackBtn instanceof HTMLButtonElement) {
            confirmRollbackBtn.click();
        }
        await rollbackPromise;
        expect(releasesApi.deployStatus()).toBe('success');

        const rolledBackSite = releasesApi.sites().find((st) => st.host === '127.0.0.1');
        expect(rolledBackSite?.releaseHash).toBe('sha256:11111111111111111111111111111111');
    });

    it('aborts deployment when confirmation dialog is rejected', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'releases', contribution: ReleasesApp },
            ],
        });
        site = s;

        const releasesApi = s.kernel.provided(RELEASES);
        if (!releasesApi) throw new Error('ReleasesApi not found');

        releasesApi.selectSite('127.0.0.1');
        releasesApi.selectRelease('sha256:22222222222222222222222222222222');

        const deployPromise = releasesApi.runDeploy('127.0.0.1', 'sha256:22222222222222222222222222222222');
        await new Promise((r) => setTimeout(r, 50));
        const cancelBtn = document.querySelector('.mesh-confirm-cancel');
        if (cancelBtn instanceof HTMLButtonElement) {
            cancelBtn.click();
        }
        const res = await deployPromise;

        expect(res).toBeUndefined();
        expect(releasesApi.deployStatus()).toBe('idle');

        // Verify site 127.0.0.1 retains its original releaseHash
        const siteItem = releasesApi.sites().find((st) => st.host === '127.0.0.1');
        expect(siteItem?.releaseHash).toBe('sha256:11111111111111111111111111111111');
    });

    it('handles call refusal visibly with error message and no throw', async () => {
        shouldFail = true;

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'releases', contribution: ReleasesApp },
            ],
        });
        site = s;

        const releasesApi = s.kernel.provided(RELEASES);
        if (!releasesApi) throw new Error('ReleasesApi not found');

        expect(releasesApi.sitesStatus()).toBe('error');
        expect(releasesApi.sitesError()).toContain('unauthorized');

        const errorCard = document.querySelector('.sites-error-card');
        expect(errorCard).not.toBeNull();
    });

    it('updates bound collections after mutations without caller re-fetching', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'releases', contribution: ReleasesApp },
            ],
        });
        site = s;

        const releasesApi = s.kernel.provided(RELEASES);
        if (!releasesApi) throw new Error('ReleasesApi not found');

        // Baseline: 2 releases, 2 sites
        expect(releasesApi.releases().length).toBe(2);
        expect(releasesApi.sites().find((st) => st.host === '127.0.0.1')?.releaseHash)
            .toBe('sha256:11111111111111111111111111111111');

        // Mutation 1: compose a new release (POST /api/releases)
        await releasesApi.runCompose(false);

        // Assert: bound releases collection reflects the new release without manual caller re-fetch
        expect(releasesApi.composeStatus()).toBe('success');
        expect(releasesApi.releases().length).toBe(3);
        expect(releasesApi.releases().some((r) => r.hash === 'sha256:33333333333333333333333333333333')).toBe(true);

        // Mutation 2: deploy the new release to site 127.0.0.1 (POST /sites/:host/deploy)
        const deployPromise = releasesApi.runDeploy('127.0.0.1', 'sha256:33333333333333333333333333333333');
        await new Promise((r) => setTimeout(r, 50));
        const confirmBtn = document.querySelector('.mesh-confirm-ok');
        if (confirmBtn instanceof HTMLButtonElement) {
            confirmBtn.click();
        }
        await deployPromise;

        // Assert: bound sites collection reflects the updated releaseHash without manual caller re-fetch
        expect(releasesApi.deployStatus()).toBe('success');
        expect(releasesApi.sites().find((st) => st.host === '127.0.0.1')?.releaseHash)
            .toBe('sha256:33333333333333333333333333333333');

        // Assert DOM reactivity reflects the bound collections
        const releaseButtons = document.querySelectorAll('.release-item');
        expect(releaseButtons.length).toBe(3);
    });

    it('renders composer form with schema controls and repeating parts', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'releases', contribution: ReleasesApp },
            ],
        });
        site = s;

        const releasesApi = s.kernel.provided(RELEASES);
        if (!releasesApi) throw new Error('ReleasesApi not found');

        const form = document.querySelector('.release-composer-form');
        expect(form).not.toBeNull();

        const nameInput = document.querySelector('.input-name');
        expect(nameInput).not.toBeNull();

        const kernelInput = document.querySelector('.input-kernel');
        expect(kernelInput).not.toBeNull();

        const partsList = document.querySelector('.composer-parts-list');
        expect(partsList).not.toBeNull();

        // Check initial parts list
        const initialRows = document.querySelectorAll('.composer-part-row');
        expect(initialRows.length).toBe(releasesApi.composeParts().length);

        // Add a part via button
        const addBtn = document.querySelector('.btn-add-part');
        expect(addBtn).not.toBeNull();
        if (addBtn instanceof HTMLButtonElement) {
            addBtn.click();
        }

        const countAfterAdd = releasesApi.composeParts().length;
        expect(countAfterAdd).toBe(initialRows.length + 1);

        // Remove a part via button
        const removeButtons = document.querySelectorAll('.btn-remove-part');
        const lastRemoveBtn = removeButtons[removeButtons.length - 1];
        if (lastRemoveBtn instanceof HTMLButtonElement) {
            lastRemoveBtn.click();
        }

        expect(releasesApi.composeParts().length).toBe(initialRows.length);
    });

    it('reports multiple compose problems simultaneously in the result box', async () => {
        composeResponseOverride = {
            hash: '',
            kernel: { version: '', digest: '' },
            parts: {},
            existed: false,
            problems: [
                { kind: 'kernel_unresolved', message: 'Kernel version ^0.15 could not be satisfied' },
                { kind: 'version_conflict', message: 'Part ui (^0.2.0) requires chrome (^0.3.0), but chrome is 0.2.4' },
                { kind: 'missing_dependency', message: 'Unsatisfied peer dependency: auth' },
            ],
        };

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'releases', contribution: ReleasesApp },
            ],
        });
        site = s;

        const releasesApi = s.kernel.provided(RELEASES);
        if (!releasesApi) throw new Error('ReleasesApi not found');

        await releasesApi.runCompose(true);

        expect(releasesApi.composeStatus()).toBe('success');
        expect(releasesApi.composeResult()?.problems.length).toBe(3);

        const resultBox = document.querySelector('.compose-result-box');
        expect(resultBox).not.toBeNull();

        const problemItems = document.querySelectorAll('.compose-problem-item');
        expect(problemItems.length).toBe(3);
        expect(problemItems[0]?.textContent).toContain('Kernel version ^0.15 could not be satisfied');
        expect(problemItems[1]?.textContent).toContain('Part ui (^0.2.0) requires chrome');
        expect(problemItems[2]?.textContent).toContain('Unsatisfied peer dependency: auth');
    });

    it('renders independent scroll regions for sites and releases in the left pane', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'releases', contribution: ReleasesApp },
            ],
        });
        site = s;

        const sidebar = document.querySelector('.releases-sidebar');
        expect(sidebar).not.toBeNull();

        const sitesScroll = document.querySelector('.releases-sidebar-sites');
        expect(sitesScroll).not.toBeNull();
        expect(sitesScroll?.getAttribute('data-mesh-scrollview')).toBeDefined();

        const releasesScroll = document.querySelector('.releases-sidebar-releases');
        expect(releasesScroll).not.toBeNull();
        expect(releasesScroll?.getAttribute('data-mesh-scrollview')).toBeDefined();

        // Sites are inside the sites scroll region
        const siteItems = sitesScroll?.querySelectorAll('.site-item');
        expect(siteItems?.length).toBe(MOCK_SITES.length);

        // Releases are inside the releases scroll region
        const releaseItems = releasesScroll?.querySelectorAll('.release-item');
        expect(releaseItems?.length).toBe(MOCK_RELEASES.length);
    });
});
