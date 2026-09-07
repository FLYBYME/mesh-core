import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';
import { defineApi } from '@flybyme/mesh-web';
import CatalogApp, { CATALOG } from '../src/catalog/index.js';
import AuthExtension, { AUTH } from '../src/auth/index.js';
import UiExtension from '../src/ui/index.js';
import {
    chromeApi,
    type CatalogResolveOutput,
    type PartFindOutputItem,
    type PartVersionFindOutputItem,
} from '../src/generated/api.js';

const MOCK_PARTS: readonly PartFindOutputItem[] = [
    {
        id: 'part_chrome',
        name: 'chrome',
        kind: 'extension',
        repository: 'https://github.com/FLYBYME/mesh-core',
        publisher: 'flybyme',
        description: 'The desktop shell: window list, mode switch, and window host.',
        keywords: ['chrome', 'shell', 'core'],
        license: 'UNLICENSED',
        createdAt: '2026-09-06T00:00:00.000Z',
        updatedAt: '2026-09-06T00:00:00.000Z',
    },
    {
        id: 'part_notes',
        name: 'notes',
        kind: 'application',
        repository: 'https://github.com/FLYBYME/mesh-demos',
        publisher: 'flybyme',
        description: 'Write, edit, and organize notes.',
        keywords: ['notes', 'text', 'writing'],
        license: 'MIT',
        homepage: 'https://notes.flybyme.dev',
        createdAt: '2026-09-05T00:00:00.000Z',
        updatedAt: '2026-09-05T00:00:00.000Z',
    },
];

const MOCK_CHROME_VERSIONS: readonly PartVersionFindOutputItem[] = [
    {
        id: 'pv_chrome_012',
        partName: 'chrome',
        version: '0.1.2',
        commit: 'bf66b6b19229aad29d114a2e090e676cbc6d363e',
        repository: 'https://github.com/FLYBYME/mesh-core',
        entry: 'src/chrome/index.ts',
        kernel: '^0.11',
        requires: [],
        requiredParts: [],
        capabilities: {
            needs: ['chrome', 'log', 'commands'],
            provides: ['page_chrome'],
        },
        state: 'built',
        artifactDigest: 'sha256:4b5ddc79dc06bd3a707479c1fba2b25d881fb5b6',
        changelog: 'Fill available width in tiled mode',
        publishedAt: '2026-09-06T01:31:01.000Z',
        createdAt: '2026-09-06T01:31:01.000Z',
        updatedAt: '2026-09-06T01:31:01.000Z',
    },
    {
        id: 'pv_chrome_011',
        partName: 'chrome',
        version: '0.1.1',
        commit: '4b5ddc79dc06bd3a707479c1fba2b25d881fb5b6',
        repository: 'https://github.com/FLYBYME/mesh-core',
        entry: 'src/chrome/index.ts',
        kernel: '^0.11',
        requires: [],
        requiredParts: [],
        capabilities: {
            needs: ['chrome', 'log', 'commands'],
            provides: ['page_chrome'],
        },
        state: 'built',
        artifactDigest: 'sha256:3f4e59f8482f61b46e479c1fba2b25d881fb5b6',
        changelog: 'Add inline height: 100% to outer Stack',
        publishedAt: '2026-09-06T01:30:08.000Z',
        createdAt: '2026-09-06T01:30:08.000Z',
        updatedAt: '2026-09-06T01:30:08.000Z',
    },
];

const MOCK_RESOLVE_OUTPUT: CatalogResolveOutput = {
    kernel: {
        name: 'mesh-web',
        version: '0.11.4',
        commit: '1f407f96dbe6a5eb734e329d12f024f58245497f',
    },
    parts: [
        {
            name: 'chrome',
            version: '0.1.2',
            commit: 'bf66b6b19229aad29d114a2e090e676cbc6d363e',
        },
    ],
    unsatisfied: [],
};

describe('CatalogApp', () => {
    const originalFetch = globalThis.fetch;
    let site: { dispose(): void; assertSingleFramework(): void } | undefined;
    let shouldFail = false;

    beforeEach(() => {
        shouldFail = false;
        globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
            const url = String(input);

            if (shouldFail) {
                return new Response(JSON.stringify({ error: 'SERVER_ERROR', message: 'Internal Server Error' }), {
                    status: 500,
                    headers: { 'content-type': 'application/json' },
                });
            }

            if (url.includes('/api/parts') && !url.includes('/count')) {
                return new Response(JSON.stringify(MOCK_PARTS), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }

            if (url.includes('/api/part-versions')) {
                return new Response(JSON.stringify(MOCK_CHROME_VERSIONS), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }

            if (url.includes('/api/catalog/resolve')) {
                return new Response(JSON.stringify(MOCK_RESOLVE_OUTPUT), {
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

    it('loads and renders catalog parts, their kinds, and details', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'catalog', contribution: CatalogApp },
            ],
        });
        site = s;
        s.assertSingleFramework();

        const catalogApi = s.kernel.provided(CATALOG);
        expect(catalogApi).toBeDefined();
        if (!catalogApi) throw new Error('CatalogApi not found');

        expect(catalogApi.status()).toBe('ready');
        expect(catalogApi.parts().length).toBe(2);

        // Verify parts list in DOM
        const partItems = document.querySelectorAll('.part-item');
        expect(partItems.length).toBe(2);

        // Default selected part is chrome
        expect(catalogApi.selectedPartName()).toBe('chrome');
        const heading = document.querySelector('h2');
        expect(heading?.textContent).toBe('chrome');

        // Verify kind badge
        const badge = document.querySelector('.part-kind-badge');
        expect(badge?.textContent).toBe('extension');
    });

    it('displays versions in a Grid and shows provenance information', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'catalog', contribution: CatalogApp },
            ],
        });
        site = s;

        const catalogApi = s.kernel.provided(CATALOG);
        if (!catalogApi) throw new Error('CatalogApi not found');

        expect(catalogApi.versions().length).toBe(2);

        // Verify version grid header and rows exist
        const gridHeader = document.querySelector('.version-grid-header');
        expect(gridHeader).not.toBeNull();

        const versionRows = document.querySelectorAll('.version-row');
        expect(versionRows.length).toBe(2);

        // Verify version provenance card
        const provCard = document.querySelector('.version-provenance-card');
        expect(provCard).not.toBeNull();
        expect(provCard?.textContent).toContain('bf66b6b19229aad29d114a2e090e676cbc6d363e');
        expect(provCard?.textContent).toContain('Fill available width in tiled mode');
    });

    it('filters parts by search query and kind buttons', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'catalog', contribution: CatalogApp },
            ],
        });
        site = s;

        const catalogApi = s.kernel.provided(CATALOG);
        if (!catalogApi) throw new Error('CatalogApi not found');

        // Filter to applications only
        const appFilterBtn = document.querySelector('.btn-filter-application');
        if (appFilterBtn instanceof HTMLElement) {
            appFilterBtn.click();
        }

        expect(catalogApi.kindFilter()).toBe('application');
        expect(catalogApi.filteredParts().length).toBe(1);
        expect(catalogApi.filteredParts()[0]?.name).toBe('notes');

        // Filter back to all
        const allFilterBtn = document.querySelector('.btn-filter-all');
        if (allFilterBtn instanceof HTMLElement) {
            allFilterBtn.click();
        }
        expect(catalogApi.filteredParts().length).toBe(2);

        // Search text
        catalogApi.setSearch('notes');
        expect(catalogApi.filteredParts().length).toBe(1);
        expect(catalogApi.filteredParts()[0]?.name).toBe('notes');
    });

    it('executes catalog.resolve to inspect what requirements resolve to', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'catalog', contribution: CatalogApp },
            ],
        });
        site = s;

        const catalogApi = s.kernel.provided(CATALOG);
        if (!catalogApi) throw new Error('CatalogApi not found');

        const resolveBtn = document.querySelector('.btn-run-resolve');
        if (resolveBtn instanceof HTMLElement) {
            resolveBtn.click();
        }

        // Await resolution
        await catalogApi.runResolve();

        expect(catalogApi.resolveStatus()).toBe('success');
        expect(catalogApi.resolveResult()?.kernel.version).toBe('0.11.4');
        expect(catalogApi.resolveResult()?.parts[0]?.name).toBe('chrome');

        const resultBox = document.querySelector('.resolve-result-box');
        expect(resultBox).not.toBeNull();
        expect(resultBox?.textContent).toContain('mesh-web@0.11.4');
    });

    it('handles call failures visibly without throwing', async () => {
        shouldFail = true;

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'catalog', contribution: CatalogApp },
            ],
        });
        site = s;

        const catalogApi = s.kernel.provided(CATALOG);
        if (!catalogApi) throw new Error('CatalogApi not found');

        expect(catalogApi.status()).toBe('error');
        expect(catalogApi.errorMessage()).toContain('server');

        const errorCard = document.querySelector('.catalog-error-card');
        expect(errorCard).not.toBeNull();
    });

    it('surfaces live indicator and removes refresh button', async () => {
        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'catalog', contribution: CatalogApp },
            ],
        });
        site = s;

        const catalogApi = s.kernel.provided(CATALOG);
        if (!catalogApi) throw new Error('CatalogApi not found');

        // Verify live indicator exists and reflects query.live
        const liveIndicator = document.querySelector('.catalog-live-indicator');
        expect(liveIndicator).not.toBeNull();
        expect(liveIndicator?.textContent).toBe('○ not following');
        expect(catalogApi.live()).toBe(false);

        // Verify refresh button is completely deleted
        const refreshBtn = document.querySelector('.btn-refresh-parts');
        expect(refreshBtn).toBeNull();

        // Verify catalog.refresh command is not declared
        const app = new CatalogApp();
        expect(app.commands.some((c) => c.id === 'catalog.refresh')).toBe(false);
    });

    it('renders not-signed-in state as idle without 401 error, and loads automatically when session arrives', async () => {
        const gatedApi = defineApi({
            ...chromeApi,
            calls: {
                ...chromeApi.calls,
                // The generated call with its gate changed, rather than a fresh `call(...)`: a
                // hand-written one infers `ApiCall<unknown, unknown>` and stops being assignable to
                // the api the app declares, which is a type error about the test rather than about
                // the thing under test. What this exercises is the gate, so the gate is all it moves.
                'part.find': { ...chromeApi.calls['part.find'], gate: { kind: 'auth', level: 'user' } },
            },
        });

        class GatedCatalogApp extends CatalogApp {
            override readonly api = gatedApi;
        }

        const s = await mountPart({
            parts: [
                { id: 'auth', contribution: AuthExtension },
                { id: 'ui', contribution: UiExtension },
                { id: 'catalog', contribution: GatedCatalogApp },
            ],
        });
        site = s;

        const catalogApi = s.kernel.provided(CATALOG);
        if (!catalogApi) throw new Error('CatalogApi not found');
        const authApi = s.kernel.provided(AUTH);
        if (!authApi) throw new Error('AuthApi not found');

        // Initially signed out -> status is idle, not error
        expect(catalogApi.status()).toBe('idle');
        expect(catalogApi.errorMessage()).toBeNull();
        const list = document.querySelector('.ui-entity-list');
        expect(list?.getAttribute('data-status')).toBe('idle');
        const idleText = document.querySelector('.ui-entity-list-idle');
        expect(idleText).not.toBeNull();
        expect(idleText?.textContent).toContain('Sign in to view catalog parts.');

        // Session arrives -> collection automatically fetches without manual refresh
        // Exactly what a `Session` is — no email, no memberships, no organization. The kernel's
        // session is who is signed in and when it expires; anything else about the account is a
        // call away, and putting it here would make the auth Extension a second place that holds it.
        authApi.session.set({
            userId: 'user_1',
            displayName: 'Tony',
            roles: [],
            expiresAt: Date.now() + 3_600_000,
        });

        // Wait a microtask for reactive effect to run and fetch
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(catalogApi.status()).toBe('ready');
        expect(catalogApi.parts().length).toBe(2);
        expect(document.querySelectorAll('.part-item').length).toBe(2);

        // Sign out -> transitions back to idle and clears rows
        authApi.session.set(null);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(catalogApi.status()).toBe('idle');
        expect(catalogApi.parts().length).toBe(0);
        expect(document.querySelector('.ui-entity-list-idle')).not.toBeNull();
    });
});
