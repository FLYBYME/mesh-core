import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';
import SitesApp, { SITES } from '../src/sites/index.js';
import UiExtension from '../src/ui/index.js';
import type { CdnDeployOutput, ReleaseFindOutputItem, SiteFindOutputItem } from '../src/generated/api.js';

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

const MOCK_RELEASES: ReleaseFindOutputItem[] = [
    {
        id: 'rel_1',
        hash: 'sha256:11111111111111111111111111111111',
        name: 'Release 0.1.0',
        tenantId: 'flybyme',
        kernel: { version: '0.11.4', digest: 'sha256:kernel1111' },
        parts: {},
        requires: ['identity.whoami', 'part.find'],
        composedAt: '2026-09-06T01:00:00.000Z',
        createdAt: '2026-09-06T01:00:00.000Z',
        updatedAt: '2026-09-06T01:00:00.000Z',
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

            if (url.includes('/api/releases') && method === 'GET') {
                return new Response(JSON.stringify(MOCK_RELEASES), {
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

    /**
     * The writes landed, so this test is inverted rather than deleted.
     *
     * It asserted a disabled form and a banner naming an open issue — correct when it was written,
     * because `site.create` and `cdn.site_edit` did not exist yet. They do now, and the separation
     * this console was designed around is enforced by the server instead: `cdn.site_edit` has no
     * `releaseHash` field at all, so editing a site cannot deploy one no matter what this screen
     * sends.
     *
     * A test that goes on demanding the disabled state would be demanding the feature stay
     * unfinished.
     */
    it('offers metadata editing, because the writes exist now', async () => {
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

        expect(sitesApi.writeSupported()).toBe(true);

        // No banner, because there is nothing left to apologise for.
        expect(document.querySelector('.sites-write-banner')).toBeNull();

        const titleInput = document.querySelector('.input-title');
        if (!(titleInput instanceof HTMLInputElement)) throw new Error('titleInput not found');
        expect(titleInput.disabled).toBe(false);

        const descInput = document.querySelector('.input-description');
        if (!(descInput instanceof HTMLInputElement)) throw new Error('descInput not found');
        expect(descInput.disabled).toBe(false);
    });

    /**
     * Parsed before the confirmation, not after.
     *
     * `theme` and `policy` are free-form records typed into a textarea and are the one place a
     * person can produce something the contract rejects. Asking somebody to approve a save that was
     * never going to happen is worse than refusing it up front, and the message has to name which
     * field is wrong.
     */
    it('refuses unparseable theme or policy before asking to confirm', async () => {
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
        sitesApi.formTheme.set('{ not json');

        await sitesApi.save();

        expect(sitesApi.lastError()).toContain('must be JSON');
        expect(sitesApi.lastAction()).toBeNull();
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

    it('raises notification and indicates busy state on deployment failure', async () => {
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
                return new Response(JSON.stringify({
                    error: { kind: 'bad_request', detail: 'Invalid release hash' },
                }), {
                    status: 400,
                    headers: { 'content-type': 'application/json' },
                });
            }
            return new Response('Not Found', { status: 404 });
        };

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

        const deployPromise = sitesApi.deploy('127.0.0.1', 'sha256:invalid');
        await new Promise((r) => setTimeout(r, 50));
        const confirmBtn = document.querySelector('.mesh-confirm-ok');
        if (confirmBtn instanceof HTMLButtonElement) {
            confirmBtn.click();
        }
        await deployPromise;

        expect(sitesApi.lastError()).toContain('Deployment failed');
        const notices = s.kernel.services.notifications();
        expect(notices.some((n) => n.level === 'error' && n.message.includes('Deployment failed'))).toBe(true);
    });

    it('renders interactive mesh exposure editor, displays discoverable contracts and gates, and visibly flags unused grants', async () => {
        // Configure site_1 with identity.whoami (required) and node.status (not required by rel_1)
        mutableSites[0] = {
            ...mutableSites[0]!,
            mesh: [
                {
                    package: 'identity',
                    version: '*',
                    contracts: [{ key: 'identity.whoami', auth: 'public' }],
                },
                {
                    package: 'node',
                    version: '*',
                    contracts: [{ key: 'node.status', auth: 'public' }],
                },
            ],
        };

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

        // Interactive exposure editor is present
        const editor = document.querySelector('.mesh-exposure-editor');
        expect(editor).not.toBeNull();

        // node.status is granted but not required by rel_1 => visibly flagged as unused grant
        const unusedBadges = document.querySelectorAll('.mesh-unused-grant');
        expect(unusedBadges.length).toBeGreaterThan(0);
        expect(unusedBadges[0]?.textContent).toContain('Unused grant');

        // Warning banner names unused grants
        const warningBanner = document.querySelector('.mesh-unused-warning-banner');
        expect(warningBanner).not.toBeNull();
        expect(warningBanner?.textContent).toContain('node.status');

        // identity.whoami is required and granted => satisfied
        const satisfied = document.querySelectorAll('.mesh-satisfied-grant');
        expect(satisfied.length).toBeGreaterThan(0);

        // part.find is required by rel_1 but not granted => missing grant
        const missing = document.querySelectorAll('.mesh-missing-grant');
        expect(missing.length).toBeGreaterThan(0);

        // Gate badges are displayed
        const gateBadges = document.querySelectorAll('.mesh-contract-gate');
        expect(gateBadges.length).toBeGreaterThan(0);
    });

    it('interactively toggles contract grants and filters contracts by status and search', async () => {
        mutableSites[0] = {
            ...mutableSites[0]!,
            mesh: [
                {
                    package: 'identity',
                    version: '*',
                    contracts: [{ key: 'identity.whoami', auth: 'public' }],
                },
                {
                    package: 'node',
                    version: '*',
                    contracts: [{ key: 'node.status', auth: 'public' }],
                },
            ],
        };

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

        // Toggle part.find to grant it
        sitesApi.toggleGrant('part.find');
        expect(sitesApi.isDirty()).toBe(true);
        expect(sitesApi.formMesh()).toContain('part.find');

        // Filter by unused
        sitesApi.meshFilter.set('unused');
        await new Promise((r) => setTimeout(r, 20));
        const rows = document.querySelectorAll('.mesh-contract-row');
        expect(rows.length).toBe(1);
        expect(rows[0]?.textContent).toContain('node.status');

        // Search by contract key substring
        sitesApi.meshFilter.set('all');
        sitesApi.meshSearch.set('builder');
        await new Promise((r) => setTimeout(r, 20));
        const builderRows = document.querySelectorAll('.mesh-contract-row');
        expect(builderRows.length).toBeGreaterThan(0);
        for (const row of Array.from(builderRows)) {
            expect(row.textContent?.toLowerCase()).toContain('builder');
        }

        // Toggle raw JSON view
        expect(document.querySelector('textarea.input-mesh')).toBeNull();
        sitesApi.showRawMesh.set(true);
        await new Promise((r) => setTimeout(r, 20));
        const textarea = document.querySelector('textarea.input-mesh');
        expect(textarea).not.toBeNull();
        if (textarea instanceof HTMLTextAreaElement) {
            expect(textarea.value).toContain('part.find');
        }
    });
});
