import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mountPart } from '@flybyme/mesh-web/testing';
import {
    AUTH,
    needs,
    text,
    type Application,
    type AuthApi,
    type Context,
    type Credentialed,
    type Extension,
    type Session,
    type ViewDecl,
} from '@flybyme/mesh-web';

import NavExtension, { NARROW_BREAKPOINT_PX } from '../src/nav/index.js';

const NEEDS = needs('state', 'log');

/** Panel application with multiple views to test routing and reachability. */
class MultiViewPanel implements Application<typeof NEEDS, readonly []> {
    readonly needs = NEEDS;
    readonly views: readonly ViewDecl[] = [
        { id: 'alpha', title: 'Alpha View', render: () => text('content-alpha') },
        { id: 'beta', title: 'Beta View', render: () => text('content-beta') },
        { id: 'gamma', title: 'Gamma View', render: () => text('content-gamma') },
    ];
    async start(_cx: Context<typeof NEEDS, readonly []>): Promise<void> {}
}

const AUTH_NEEDS = needs('state');

interface StubAuthOptions {
    readonly initialSession?: Session | null;
}

class StubAuthExtension implements Extension<typeof AUTH_NEEDS, readonly [], typeof AUTH> {
    readonly needs = AUTH_NEEDS;
    readonly provides = AUTH;

    constructor(private readonly options: StubAuthOptions = {}) {}

    activate(cx: Context<typeof AUTH_NEEDS, readonly []>): AuthApi {
        const session = cx.state.signal<Session | null>(this.options.initialSession ?? null);
        return {
            session,
            signIn: async (cred: Credentialed): Promise<Session> => {
                if (cred.password === 'wrong') {
                    throw new Error('Invalid credentials');
                }
                const s: Session = {
                    userId: 'usr_frank',
                    displayName: cred.email ? (cred.email.split('@')[0] ?? 'Frank') : 'Frank',
                    roles: ['operator'],
                    expiresAt: Date.now() + 3600000,
                };
                session.set(s);
                return s;
            },
            signOut: async (): Promise<void> => {
                session.set(null);
            },
        };
    }
}

let site: { dispose(): void } | undefined;
let rootEl: HTMLDivElement | undefined;
let observer: MutationObserver | undefined;
let widthRef = { value: 1024 };

beforeEach(() => {
    if (typeof window !== 'undefined') {
        window.location.hash = '';
    }
});

afterEach(() => {
    site?.dispose();
    site = undefined;
    observer?.disconnect();
    observer = undefined;
    rootEl?.remove();
    rootEl = undefined;
    if (typeof window !== 'undefined') {
        window.location.hash = '';
    }
});

function createRoot(width: number, height = 800): HTMLDivElement {
    widthRef.value = width;
    const el = document.createElement('div');
    el.id = 'mesh-test-root';
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.position = 'relative';
    el.style.overflow = 'hidden';

    Object.defineProperty(el, 'clientWidth', {
        get: () => widthRef.value,
        configurable: true,
    });
    Object.defineProperty(el, 'clientHeight', { value: height, configurable: true });

    observer = new MutationObserver(() => {
        const host = el.querySelector('[data-mesh-window-host]');
        if (host instanceof HTMLElement) {
            Object.defineProperty(host, 'clientWidth', {
                get: () => widthRef.value,
                configurable: true,
            });
            Object.defineProperty(host, 'clientHeight', { value: height, configurable: true });
        }
    });
    observer.observe(el, { childList: true, subtree: true });

    document.body.append(el);
    rootEl = el;
    return el;
}

function clickElement(selector: string): void {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLElement)) {
        throw new Error(`Element ${selector} is not an HTMLElement`);
    }
    el.click();
}

async function waitForCondition(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
    const start = Date.now();
    while (!predicate()) {
        if (Date.now() - start > timeoutMs) {
            throw new Error('Timed out waiting for condition');
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

describe('the nav routing chrome', () => {
    it('sets single window mode with no window frames, grips, or drag bars', async () => {
        const root = createRoot(400);
        const s = await mountPart({
            parts: [
                { id: 'nav', contribution: NavExtension },
                { id: 'panel', contribution: MultiViewPanel },
            ],
            open: [{ application: 'panel', views: ['alpha'] }],
            root,
        });
        site = s;

        // Window mode is single
        expect(s.manager.mode()).toBe('single');
        // No window frames or resize grips exist in the DOM
        expect(document.querySelector('.grip')).toBeNull();
        expect(document.querySelector('.chrome-mode')).toBeNull();
        // The active view content is mounted and visible
        expect(document.body.textContent).toContain('content-alpha');
    });

    it('renders a compact top navigation bar on narrow displays', async () => {
        const root = createRoot(380); // below 768px breakpoint
        const s = await mountPart({
            parts: [
                { id: 'nav', contribution: NavExtension },
                { id: 'panel', contribution: MultiViewPanel },
            ],
            open: [{ application: 'panel', views: ['alpha', 'beta'] }],
            root,
        });
        site = s;

        await waitForCondition(() => document.querySelector('.nav-bar-narrow') !== null);
        expect(document.querySelector('.nav-bar-narrow')).not.toBeNull();
        expect(document.querySelector('.nav-bar-wide')).toBeNull();
        expect(document.querySelector('.nav-shell-narrow')).not.toBeNull();

        // Exactly one view is visible in single mode
        expect(s.manager.visible()).toHaveLength(1);
    });

    it('renders a persistent left sidebar on wide displays', async () => {
        const root = createRoot(1024); // above 768px breakpoint
        const s = await mountPart({
            parts: [
                { id: 'nav', contribution: NavExtension },
                { id: 'panel', contribution: MultiViewPanel },
            ],
            open: [{ application: 'panel', views: ['alpha', 'beta'] }],
            root,
        });
        site = s;

        await waitForCondition(() => document.querySelector('.nav-bar-wide') !== null);
        expect(document.querySelector('.nav-bar-wide')).not.toBeNull();
        expect(document.querySelector('.nav-bar-narrow')).toBeNull();
        expect(document.querySelector('.nav-shell-wide')).not.toBeNull();

        expect(s.manager.visible()).toHaveLength(1);
    });

    it('makes every view of an app reachable, not just the first', async () => {
        const root = createRoot(800);
        const s = await mountPart({
            parts: [
                { id: 'nav', contribution: NavExtension },
                { id: 'panel', contribution: MultiViewPanel },
            ],
            open: [{ application: 'panel', views: ['alpha', 'beta', 'gamma'] }],
            root,
        });
        site = s;

        const navItems = [...document.querySelectorAll('.nav-item')];
        expect(navItems).toHaveLength(3);

        const titles = navItems.map((el) => el.textContent?.trim());
        expect(titles).toEqual(['Alpha View', 'Beta View', 'Gamma View']);

        // Navigate to beta
        const betaBtn = document.querySelector('[data-nav-item="beta"]');
        expect(betaBtn).toBeInstanceOf(HTMLElement);
        if (betaBtn instanceof HTMLElement) betaBtn.click();

        await waitForCondition(() => document.body.textContent?.includes('content-beta') ?? false);
        expect(window.location.hash).toBe('#/beta');

        // Navigate to gamma
        const gammaBtn = document.querySelector('[data-nav-item="gamma"]');
        expect(gammaBtn).toBeInstanceOf(HTMLElement);
        if (gammaBtn instanceof HTMLElement) gammaBtn.click();

        await waitForCondition(() => document.body.textContent?.includes('content-gamma') ?? false);
        expect(window.location.hash).toBe('#/gamma');
    });

    it('dragging a browser narrow does not lose which view is showing', async () => {
        const root = createRoot(1024);
        const s = await mountPart({
            parts: [
                { id: 'nav', contribution: NavExtension },
                { id: 'panel', contribution: MultiViewPanel },
            ],
            open: [{ application: 'panel', views: ['alpha', 'beta'] }],
            root,
        });
        site = s;

        // Switch to beta view on wide
        const betaBtn = document.querySelector('[data-nav-item="beta"]');
        if (betaBtn instanceof HTMLElement) betaBtn.click();
        await waitForCondition(() => document.body.textContent?.includes('content-beta') ?? false);

        expect(document.querySelector('.nav-shell-wide')).not.toBeNull();
        expect(document.body.textContent).toContain('content-beta');

        // Resize below breakpoint
        widthRef.value = NARROW_BREAKPOINT_PX - 100;
        window.dispatchEvent(new Event('resize'));

        await waitForCondition(() => document.querySelector('.nav-shell-narrow') !== null);

        // Crucial test: Beta view MUST still be showing
        expect(document.body.textContent).toContain('content-beta');
        expect(s.manager.focused()).toBe(s.manager.windows().find((w) => w.view === 'beta')?.id);
    });

    it('lands on the requested view when a URL is pasted', async () => {
        // Colleague pastes URL with hash
        window.location.hash = '#/panel/beta';

        const root = createRoot(500);
        const s = await mountPart({
            parts: [
                { id: 'nav', contribution: NavExtension },
                { id: 'panel', contribution: MultiViewPanel },
            ],
            open: [{ application: 'panel', views: ['alpha', 'beta'] }],
            root,
        });
        site = s;

        await waitForCondition(() => document.body.textContent?.includes('content-beta') ?? false);
        expect(s.manager.focused()).toBe(s.manager.windows().find((w) => w.view === 'beta')?.id);
    });

    it('navigates history when the back button is pressed', async () => {
        const root = createRoot(600);
        const s = await mountPart({
            parts: [
                { id: 'nav', contribution: NavExtension },
                { id: 'panel', contribution: MultiViewPanel },
            ],
            open: [{ application: 'panel', views: ['alpha', 'beta'] }],
            root,
        });
        site = s;

        // Initial view is beta (most recently opened in open list)
        await waitForCondition(() => window.location.hash === '#/beta');

        // Click alpha
        const alphaBtn = document.querySelector('[data-nav-item="alpha"]');
        if (alphaBtn instanceof HTMLElement) alphaBtn.click();
        await waitForCondition(() => window.location.hash === '#/alpha');
        expect(document.body.textContent).toContain('content-alpha');

        // Trigger real browser Back button
        window.history.back();

        await waitForCondition(() => window.location.hash === '#/beta');
        await waitForCondition(() => document.body.textContent?.includes('content-beta') ?? false);
        expect(s.manager.focused()).toBe(s.manager.windows().find((w) => w.view === 'beta')?.id);
    });

    it('supports sign in and sign out when auth extension is composed', async () => {
        const root = createRoot(800);
        const s = await mountPart({
            parts: [
                { id: 'auth', contribution: new StubAuthExtension() },
                { id: 'nav', contribution: NavExtension },
                { id: 'panel', contribution: MultiViewPanel },
            ],
            open: [{ application: 'panel', views: ['alpha'] }],
            root,
        });
        site = s;

        expect(document.querySelector('.nav-auth-signed-out')).not.toBeNull();

        const emailInput = document.querySelector('.nav-input-email');
        const passwordInput = document.querySelector('.nav-input-password');
        expect(emailInput).toBeInstanceOf(HTMLInputElement);
        expect(passwordInput).toBeInstanceOf(HTMLInputElement);

        if (emailInput instanceof HTMLInputElement) {
            emailInput.value = 'frank@example.com';
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (passwordInput instanceof HTMLInputElement) {
            passwordInput.value = 'secret';
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        clickElement('.nav-signin');

        await waitForCondition(() => document.querySelector('.nav-auth-signed-in') !== null);
        expect(document.querySelector('.nav-user')?.textContent).toBe('frank');

        clickElement('.nav-signout');

        await waitForCondition(() => document.querySelector('.nav-auth-signed-out') !== null);
        expect(document.querySelector('.nav-auth-signed-in')).toBeNull();
    });
});
