/**
 * `ConsoleChrome`'s application switcher, pressed.
 *
 * Mounted through `mountPart` -- the same real `start()` a deployment uses (per
 * `signIn.browser.test.ts`) -- rather than exercising the `router` capability directly (that's
 * `router.test.ts` in mesh-web, against `routerSink` alone): what's under test here is the whole
 * path from "two Applications composed onto one site" to "a button that switches which one shows",
 * including the wiring `chrome.ts` itself does (`needs('router')`, the `console.switchApp` command).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart, type MountedSite } from '@flybyme/mesh-web/testing';
import { needs, type Application, type Context } from '@flybyme/mesh-web';

import { AuthExtension } from '../src/auth/index.js';
import { ConsoleChrome } from '../src/chrome/index.js';

const APP_NEEDS = needs('log');

class NamedApp implements Application<typeof APP_NEEDS> {
    readonly needs = APP_NEEDS;
    constructor(readonly title: string) {}
    async start(cx: Context<typeof APP_NEEDS>): Promise<{ internal: Record<string, never> }> {
        cx.log.info(`${this.title} started`);
        return { internal: {} };
    }
}

const boot = async (): Promise<MountedSite> => await mountPart({
    parts: [
        { id: 'auth', contribution: AuthExtension },
        { id: 'chrome', contribution: ConsoleChrome },
        { id: 'repos', contribution: new NamedApp('Repos') },
        { id: 'mail', contribution: new NamedApp('Mail') },
    ],
    api: 'http://identity.test',
});

afterEach(() => {
    cleanup();
    // Each `mountPart` does a real `history.pushState` against this shared browser page; reset it so
    // one test's navigation can't decide the next test's initial route.
    window.history.replaceState({}, '', '/');
});

describe('the application switcher', () => {
    it('renders one entry per composed Application, titled as each declared', async () => {
        const site = await boot();

        const labels = [...site.root.querySelectorAll<HTMLButtonElement>('.console-app')]
            .map((b) => b.textContent);

        expect(labels).toEqual(['Repos', 'Mail']);
        site.dispose();
    });

    it('marks the first Application focused before any switch', async () => {
        const site = await boot();

        const buttons = [...site.root.querySelectorAll<HTMLButtonElement>('.console-app')];
        expect(buttons[0]?.className).toContain('focused');
        expect(buttons[1]?.className).not.toContain('focused');
        site.dispose();
    });

    it('clicking a different Application moves focus and updates the URL', async () => {
        const site = await boot();

        const buttons = [...site.root.querySelectorAll<HTMLButtonElement>('.console-app')];
        buttons[1]!.click();
        await new Promise((resolve) => setTimeout(resolve, 0));

        const after = [...site.root.querySelectorAll<HTMLButtonElement>('.console-app')];
        expect(after[0]?.className).not.toContain('focused');
        expect(after[1]?.className).toContain('focused');
        expect(window.location.pathname).toContain('mail');

        site.dispose();
    });

    it('renders no switcher at all for a single-Application site', async () => {
        const site = await mountPart({
            parts: [
                { id: 'auth', contribution: AuthExtension },
                { id: 'chrome', contribution: ConsoleChrome },
                { id: 'repos', contribution: new NamedApp('Repos') },
            ],
            api: 'http://identity.test',
        });

        expect(site.root.querySelector('.console-apps')).toBeNull();
        site.dispose();
    });
});
