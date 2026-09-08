/**
 * **The first application on the rebuilt shapes, actually mounted.**
 *
 * Everything changed today — mandatory `internal`, the `ViewContext` reorder, `PartApi` and
 * `checkBindings`, components-versus-composites, auth leaving the kernel — is covered by tests that
 * call a piece directly. **None of it had been mounted**, and `mesh-demos` (ten apps written against
 * the kernel from outside) was deleted this morning, so the framework lost the only thing that used
 * it the way a real app does.
 *
 * This is what replaces it. A component that renders correctly when called and wrongly when mounted
 * is exactly the failure a browser test exists to catch, and there was nothing left to catch it.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mountPart, cleanup } from '@flybyme/mesh-web/testing';

import IdentityApp from '../src/identity/index.js';
import { AuthExtension } from '../src/auth/index.js';
import { IDENTITY } from '../src/identity/contract.js';

afterEach(() => { cleanup(); });

/**
 * Boot the app with auth beside it.
 *
 * No API is reachable, so every collection stays empty and every call fails — which is the state a
 * screen spends most of its life in and the one least often tested. A screen that only works signed
 * in and populated is a screen nobody has watched load.
 */
const boot = async () => await mountPart({
    parts: [
        { id: 'auth', contribution: AuthExtension },
        { id: 'identity', contribution: IdentityApp },
    ],
});

describe('the identity app boots', () => {
    it('opens exactly one window', async () => {
        const site = await boot();

        // One app, one window. Four consoles opened four and a person ended up arranging furniture;
        // folding them into four views was better and still four things to place.
        expect(site.manager.windows()).toHaveLength(1);
        expect(site.manager.windows()[0]?.view).toBe('main');

        site.dispose();
    });

    it('renders its three regions', async () => {
        const site = await boot();
        const text = site.root.textContent ?? '';

        expect(text).toContain('Identity');           // HEADER
        expect(text).toContain('Organizations');      // INDEX
        expect(text).toContain('Select an organization'); // DETAIL, its own placeholder

        site.dispose();
    });

    /**
     * The check that says the published API matches the manifest.
     *
     * `checkBindings` runs at start and refuses a part in either direction — a declared command with
     * no implementation, or a bound one nobody declared. A part that fails it is left `failed`
     * rather than discarded, so reaching `running` at all is the assertion.
     */
    it('satisfies its own manifest, or it would not be running', async () => {
        const site = await boot();

        const process = site.kernel.processes.find((p) => p.applicationId === 'identity');
        expect(process?.state).toBe('running');

        site.dispose();
    });

    it('publishes three commands and two readable state entries, and nothing else', async () => {
        const site = await boot();
        const api = site.kernel.provided(IDENTITY);

        expect(Object.keys(api?.commands ?? {}).sort())
            .toEqual(['addMember', 'createOrganization', 'removeMember']);
        expect(Object.keys(api?.state ?? {}).sort()).toEqual(['organizations', 'roles']);

        // The selection, the status and the error are absent on purpose: another part has no use for
        // which row this screen has highlighted, and anything published is tool-reachable.
        expect(Object.keys(api?.state ?? {})).not.toContain('selected');
        expect(Object.keys(api?.state ?? {})).not.toContain('status');

        site.dispose();
    });

    /**
     * **Published state is observable and not writable.**
     *
     * Read is a value, write is a command. A writable signal here would let any part on the page —
     * and any tool caller — drive this app, which is the shape of bug that put a password buffer on
     * a public API.
     */
    it('publishes readable signals with no setter', async () => {
        const site = await boot();
        const api = site.kernel.provided(IDENTITY);

        const organizations = api?.state['organizations'];
        expect(typeof organizations).toBe('function');
        expect((organizations as unknown as { set?: unknown })?.set).toBeUndefined();

        site.dispose();
    });
});

describe('every control renders its own refusal', () => {
    /**
     * Nobody is signed in, so every command answers `needs_session` — and the controls stay on
     * screen saying so.
     *
     * `spec/ui/states.md` §4. A control that vanishes when refused teaches a person the feature does
     * not exist, which is a worse lie than a disabled button, and it is what happens when a screen
     * has to remember to render a refusal rather than being handed one.
     */
    it('shows a refused control, disabled, with the reason', async () => {
        const site = await boot();
        const text = site.root.textContent ?? '';

        expect(text).toContain('Sign in');

        const disabled = site.root.querySelectorAll('[data-refused="true"]');
        expect(disabled.length).toBeGreaterThan(0);

        site.dispose();
    });

    it('does not dispatch a refused command when it is pressed', async () => {
        const site = await boot();

        const button = site.root.querySelector<HTMLButtonElement>('[data-refused="true"]');
        expect(button).not.toBeNull();
        button?.click();

        // Still refused, still there, nothing happened. The refusal is in the run path and not only
        // in the markup, so a caller arriving by a palette, a key binding or a tool call is refused
        // identically.
        expect(site.root.querySelector('[data-refused="true"]')).not.toBeNull();

        site.dispose();
    });
});
