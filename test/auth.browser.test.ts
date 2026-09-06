/**
 * The auth Extension, in a real browser.
 *
 * **The first test this part has ever had.** It could be built, published and served, and nothing
 * could assert that it activates — the only way to find out was to open a page and look, which is
 * exactly the state the browser-testing harness exists to end.
 *
 * It runs through `mountPart`, which boots through the kernel's `start()` — the same path a deployed
 * site takes. A test harness that booted a part its own way would be testing something that does not
 * ship, which is how this framework's previous harness became a fixture pretending to be a
 * deployment.
 */

import { describe, expect, it, afterEach } from 'vitest';
import { mountPart } from '@flybyme/mesh-web/testing';
import {
    needs,
    text,
    type Application,
    type Context,
    type ViewDecl,
} from '@flybyme/mesh-web';
import AuthExtension, { AUTH } from '../src/auth/index.js';
import ChromeExtension from '../src/chrome/index.js';

const PANEL_NEEDS = needs('state', 'log');

class TestApp implements Application<typeof PANEL_NEEDS, readonly []> {
    readonly needs = PANEL_NEEDS;
    readonly views: readonly ViewDecl[] = [
        { id: 'main', title: 'Main View', render: () => text('Hello World') },
    ];
    async start(_cx: Context<typeof PANEL_NEEDS, readonly []>): Promise<void> {}
}

let site: { dispose(): void } | undefined;
afterEach(() => {
    site?.dispose();
    site = undefined;
});

describe('the auth Extension', () => {
    it('activates and provides a session', async () => {
        const s = await mountPart({
            parts: [{ id: 'auth', contribution: AuthExtension }],
        });
        site = s;

        const auth = s.kernel.provided(AUTH);
        expect(auth).toBeDefined();
    });

    it('starts with nobody signed in', async () => {
        // A held ticket is a claim, never a session — and with no store there is no held ticket, so
        // a reload signs you out. That is the safe default and a real choice for a console.
        const s = await mountPart({
            parts: [{ id: 'auth', contribution: AuthExtension }],
        });
        site = s;

        const auth = s.kernel.provided(AUTH);
        expect(auth).toBeDefined();
        expect(auth?.session()).toBeNull();
    });

    it('takes the options a site gives it', async () => {
        // The case that made a part's default export a constructor rather than an instance: which
        // identity API this Extension talks to is the *site's* decision, so the package cannot
        // construct itself. This is also the shape that PartRef's first type rejected outright.
        const s = await mountPart({
            parts: [{
                id: 'auth',
                contribution: AuthExtension,
                options: { endpoints: { whoami: '/somewhere-else/whoami' } },
            }],
        });
        site = s;

        expect(s.kernel.provided(AUTH)).toBeDefined();
    });

    it('holds the page credential seam, and says so in its manifest', async () => {
        // `needs('credentials')` is what makes "the auth Extension attaches the ticket" visible to
        // whoever composes a site, rather than something they have to take on trust.
        const s = await mountPart({
            parts: [{ id: 'auth', contribution: AuthExtension }],
        });
        site = s;

        expect(new AuthExtension().needs).toContain('credentials');
        // And `http`, because this file called global fetch until the capability existed — network
        // access nobody granted and nobody could see.
        expect(new AuthExtension().needs).toContain('http');
    });

    it('a page with chrome and no auth still works', async () => {
        // Most sites will not compose auth. Chrome must fall back gracefully to EMPTY_CONSUMES,
        // mount the window host, render the shell bar, and render no auth form without errors.
        const s = await mountPart({
            parts: [
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'app', contribution: TestApp },
            ],
            open: [{ application: 'app', views: ['main'] }],
        });
        site = s;

        // Chrome bar and window host are mounted
        expect(document.querySelector('.chrome-bar')).not.toBeNull();
        expect(s.manager.windows()).toHaveLength(1);

        // Window mode switching works
        expect(s.manager.mode()).toBe('windowed');
        const modeBtn = document.querySelector('.chrome-mode');
        expect(modeBtn).not.toBeNull();

        // No auth UI is rendered
        expect(document.querySelector('.chrome-auth')).toBeNull();
        expect(document.querySelector('.chrome-auth-signed-in')).toBeNull();
        expect(document.querySelector('.chrome-auth-signed-out')).toBeNull();
    });

    it('integrates with chrome when both are composed on a page', async () => {
        // First time provider and consumer are tested together in one repository.
        const s = await mountPart({
            parts: [
                { id: 'auth', contribution: AuthExtension },
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'app', contribution: TestApp },
            ],
            open: [{ application: 'app', views: ['main'] }],
        });
        site = s;

        expect(document.querySelector('.chrome-bar')).not.toBeNull();
        expect(s.kernel.provided(AUTH)).toBeDefined();

        // Signed out auth form is rendered in chrome bar
        const authForm = document.querySelector('.chrome-auth-signed-out');
        expect(authForm).not.toBeNull();
        expect(document.querySelector('.chrome-input-email')).not.toBeNull();
        expect(document.querySelector('.chrome-input-password')).not.toBeNull();
        expect(document.querySelector('.chrome-signin')).not.toBeNull();
    });

    it('a page with chrome and no auth still works after a page with auth ran', async () => {
        // Verify state isolation: mounting chrome without auth after auth was previously mounted
        // does not falsely trigger authProvided or crash.
        const s = await mountPart({
            parts: [
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'app', contribution: TestApp },
            ],
            open: [{ application: 'app', views: ['main'] }],
        });
        site = s;

        expect(document.querySelector('.chrome-bar')).not.toBeNull();
        expect(document.querySelector('.chrome-auth')).toBeNull();
    });
});
