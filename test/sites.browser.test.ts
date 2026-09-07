import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';
import SitesApp, { SITES } from '../src/sites/index.js';
import UiExtension from '../src/ui/index.js';
import type { CdnDeployOutput, SiteFindOutputItem } from '../src/generated/api.js';

const MOCK_SITES: SiteFindOutputItem[] = [
    {
        id: 'site_1',
        host: '127.0.0.1',
        application: 'demo',
        tenantId: 'flybyme',
        api: 'http://127.0.0.1:5005',
        releaseHash: 'sha256:11111111111111111111111111111111',
        mesh: [],
        theme: { accent: '#0066cc' },
        policy: {},
        title: 'Local Dev Site',
        description: 'Local development environment',
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
        description: 'Demo staging environment',
        indexable: true,
        createdAt: '2026-09-06T00:00:00.000Z',
        updatedAt: '2026-09-06T00:00:00.000Z',
    },
];

describe('SitesApp', () => {
    const originalFetch = globalThis.fetch;
    let site: { dispose(): void; assertSingleFramework(): void } | undefined;
    let mutableSites: SiteFindOutputItem[] = [];

    beforeEach(() => {
        mutableSites = [...MOCK_SITES];

        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const url = String(input);
            const method = init?.method ?? 'GET';

            if (url.includes('/api/sites') && method === 'GET') {
                return new Response(JSON.stringify(mutableSites), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }

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
                    const output: CdnDeployOutput = {
                        host: body.host,
                        release: body.release,
                        changed: true,
                        unusedGrants: [],
                    };
                    return new Response(JSON.stringify(output), {
                        status: 200,
                        headers: { 'content-type': 'application/json' },
                    });
                }
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

    it('boots SitesApp, opens window, and lists sites', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'sites', contribution: SitesApp },
            ],
        });
        site = s;
        s.assertSingleFramework();

        const sitesApi = s.kernel.provided(SITES);
        expect(sitesApi).toBeDefined();
        if (!sitesApi) throw new Error('SitesApi not found');

        expect(sitesApi.sitesStatus()).toBe('ready');
        expect(sitesApi.sites().length).toBe(2);

        // Verify sites in DOM
        const items = document.querySelectorAll('.site-item');
        expect(items.length).toBe(2);
        expect(items[0]?.textContent).toContain('127.0.0.1');
        expect(items[1]?.textContent).toContain('demo.localhost');
    });

    it('selects a site, populates form, excludes releaseHash from form fields', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'sites', contribution: SitesApp },
            ],
        });
        site = s;

        const sitesApi = s.kernel.provided(SITES);
        if (!sitesApi) throw new Error('SitesApi not found');

        // Initially no site selected
        expect(sitesApi.selectedSite()).toBeNull();

        // Select the first site
        await sitesApi.select('127.0.0.1');
        expect(sitesApi.selectedHost()).toBe('127.0.0.1');
        expect(sitesApi.selectedSite()?.title).toBe('Local Dev Site');

        // Form fields in DOM
        const titleInput = document.querySelector('.input-title');
        if (!(titleInput instanceof HTMLInputElement)) throw new Error('titleInput not found');
        expect(titleInput.value).toBe('Local Dev Site');

        const descInput = document.querySelector('.input-description');
        if (!(descInput instanceof HTMLInputElement)) throw new Error('descInput not found');
        expect(descInput.value).toBe('Local development environment');

        const indexableInput = document.querySelector('.input-indexable');
        if (!(indexableInput instanceof HTMLInputElement)) throw new Error('indexableInput not found');
        expect(indexableInput.checked).toBe(false);

        // releaseHash is NOT a form field in the metadata form
        const releaseFormField = document.querySelector('.input-releaseHash');
        expect(releaseFormField).toBeNull();

        // releaseHash is displayed in deployment section
        const releaseBadge = document.querySelector('.site-release-badge');
        expect(releaseBadge?.textContent).toContain('sha256:11111111111111111111111111111111');
    });

    it('shows visibly disabled metadata editing with server pending issue notice', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'sites', contribution: SitesApp },
            ],
        });
        site = s;

        const sitesApi = s.kernel.provided(SITES);
        if (!sitesApi) throw new Error('SitesApi not found');

        await sitesApi.select('127.0.0.1');

        // Verify write banner
        const banner = document.querySelector('.sites-write-banner');
        expect(banner).not.toBeNull();
        expect(banner?.textContent).toContain('FLYBYME/mesh-serve#5');
        expect(banner?.textContent).toContain('Writes Internal');

        // Verify form inputs are visibly disabled
        const titleInput = document.querySelector('.input-title');
        if (!(titleInput instanceof HTMLInputElement)) throw new Error('titleInput not found');
        expect(titleInput.disabled).toBe(true);

        const descInput = document.querySelector('.input-description');
        if (!(descInput instanceof HTMLInputElement)) throw new Error('descInput not found');
        expect(descInput.disabled).toBe(true);

        // Attempting to save sets error explaining pending exposure
        await sitesApi.save();
        expect(sitesApi.lastError()).toContain('FLYBYME/mesh-serve#5');
    });

    it('tracks dirty state and supports form reset', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'sites', contribution: SitesApp },
            ],
        });
        site = s;

        const sitesApi = s.kernel.provided(SITES);
        if (!sitesApi) throw new Error('SitesApi not found');

        await sitesApi.select('127.0.0.1');
        expect(sitesApi.isDirty()).toBe(false);

        // Mutate title
        sitesApi.setField('title', 'Brand New Title');
        expect(sitesApi.isDirty()).toBe(true);
        expect(sitesApi.formTitle()).toBe('Brand New Title');

        // Reset changes (confirms destructive action)
        const resetPromise = sitesApi.reset();
        await new Promise((r) => setTimeout(r, 50));
        const confirmBtn = document.querySelector('.mesh-confirm-ok');
        if (confirmBtn instanceof HTMLButtonElement) {
            confirmBtn.click();
        }
        await resetPromise;
        expect(sitesApi.isDirty()).toBe(false);
        expect(sitesApi.formTitle()).toBe('Local Dev Site');
    });

    it('executes release deployment with confirmation dialog', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'sites', contribution: SitesApp },
            ],
        });
        site = s;

        const sitesApi = s.kernel.provided(SITES);
        if (!sitesApi) throw new Error('SitesApi not found');

        await sitesApi.select('127.0.0.1');

        // Deploy release starts confirmation
        const deployPromise = sitesApi.deploy('127.0.0.1', 'sha256:99999999999999999999999999999999');

        // Confirmation modal appears in DOM
        await new Promise((r) => setTimeout(r, 50));
        const confirmBtn = document.querySelector('.mesh-confirm-ok');
        if (confirmBtn instanceof HTMLButtonElement) {
            confirmBtn.click();
        }

        await deployPromise;

        expect(sitesApi.lastAction()).toContain('Successfully deployed sha256:99999999999999999999999999999999 to 127.0.0.1');

        // Verified site releaseHash updated
        expect(sitesApi.selectedSite()?.releaseHash).toBe('sha256:99999999999999999999999999999999');
    });
});
