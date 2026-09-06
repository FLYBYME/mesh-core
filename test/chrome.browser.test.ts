import { afterEach, describe, expect, it } from 'vitest';
import { mountPart } from '@flybyme/mesh-web/testing';
import { needs, text, type Application, type Context, type ViewDecl } from '@flybyme/mesh-web';

import ChromeExtension from '../src/chrome/index.js';

const NEEDS = needs('state', 'log');

/** Something for the shell to have windows of. */
class Panel implements Application<typeof NEEDS, readonly []> {
    readonly needs = NEEDS;
    readonly views = [
        { id: 'one', title: 'One', render: () => text('one') },
        { id: 'two', title: 'Two', render: () => text('two') },
    ] as unknown as readonly ViewDecl<never, never>[];
    async start(_cx: Context<typeof NEEDS, readonly []>): Promise<void> {}
}

let site: { dispose(): void } | undefined;
afterEach(() => { site?.dispose(); site = undefined; });

describe('the shell', () => {
    it('mounts a window host, so windows have somewhere to be', async () => {
        // The one rule chrome cannot break: `mountPage` throws ChromeError if the description
        // renders no host, because a site whose chrome forgot the windows is broken rather than a
        // site with no windows.
        const s = await mountPart({
            parts: [
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'panel', contribution: Panel },
            ],
            open: [{ application: 'panel', views: ['one'] }],
        });
        site = s;

        expect(document.querySelector('.chrome-bar')).not.toBeNull();
        expect(s.manager.windows()).toHaveLength(1);
    });

    it('lists every open window and focuses the one clicked', async () => {
        const s = await mountPart({
            parts: [
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'panel', contribution: Panel },
            ],
            open: [{ application: 'panel', views: ['one', 'two'] }],
        });
        site = s;

        const tabs = [...document.querySelectorAll('.chrome-tab')];
        expect(tabs).toHaveLength(2);

        // The second window opened, so the first is behind it. Clicking its tab raises it.
        const first = s.manager.windows()[0]!;
        expect(s.manager.focused()).not.toBe(first.id);

        (tabs[0] as HTMLElement).click();
        expect(s.manager.focused()).toBe(first.id);
    });

    it('switches the mode nothing else on the page could reach', async () => {
        // `setMode` was real, persisted per device and lockable by policy, and no menu, button or
        // binding called it. This button is the whole reason this Extension exists.
        const s = await mountPart({
            parts: [
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'panel', contribution: Panel },
            ],
            open: [{ application: 'panel', views: ['one'] }],
        });
        site = s;

        expect(s.manager.mode()).toBe('windowed');
        (document.querySelector('.chrome-mode') as HTMLElement).click();
        expect(s.manager.mode()).toBe('tiled');
    });
});
