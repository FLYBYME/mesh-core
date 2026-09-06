import { afterEach, describe, expect, it } from 'vitest';
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

import ChromeExtension from '../src/chrome/index.js';

const NEEDS = needs('state', 'log');

/** Something for the shell to have windows of. */
class Panel implements Application<typeof NEEDS, readonly []> {
    readonly needs = NEEDS;
    readonly views: readonly ViewDecl[] = [
        { id: 'one', title: 'One', render: () => text('one') },
        { id: 'two', title: 'Two', render: () => text('two') },
    ];
    async start(_cx: Context<typeof NEEDS, readonly []>): Promise<void> {}
}

let site: { dispose(): void } | undefined;
afterEach(() => { site?.dispose(); site = undefined; });

const AUTH_NEEDS = needs('state');

interface StubAuthOptions {
    readonly initialSession?: Session | null;
    readonly onSignIn?: (cred: Credentialed) => Promise<Session>;
    readonly onSignOut?: () => Promise<void>;
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
                if (this.options.onSignIn) {
                    const next = await this.options.onSignIn(cred);
                    session.set(next);
                    return next;
                }
                if (cred.password === 'wrong') {
                    throw new Error('Invalid email or password');
                }
                const s: Session = {
                    userId: 'usr_123',
                    displayName: cred.email ? (cred.email.split('@')[0] ?? 'User') : 'User',
                    roles: ['member'],
                    expiresAt: Date.now() + 3600000,
                };
                session.set(s);
                return s;
            },
            signOut: async (): Promise<void> => {
                if (this.options.onSignOut) {
                    await this.options.onSignOut();
                }
                session.set(null);
            },
        };
    }
}

function typeInto(selector: string, value: string): void {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLInputElement)) {
        throw new Error(`Element ${selector} is not an HTMLInputElement`);
    }
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
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
        const first = s.manager.windows()[0];
        expect(first).toBeDefined();
        if (first) {
            expect(s.manager.focused()).not.toBe(first.id);
        }

        const firstTab = tabs[0];
        if (firstTab instanceof HTMLElement) {
            firstTab.click();
        }
        if (first) {
            expect(s.manager.focused()).toBe(first.id);
        }
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
        const modeBtn = document.querySelector('.chrome-mode');
        if (modeBtn instanceof HTMLElement) {
            modeBtn.click();
        }
        expect(s.manager.mode()).toBe('tiled');
    });

    it('boots normally without sign-in UI when AuthExtension is not composed', async () => {
        const s = await mountPart({
            parts: [
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'panel', contribution: Panel },
            ],
            open: [{ application: 'panel', views: ['one'] }],
        });
        site = s;

        expect(document.querySelector('.chrome-bar')).not.toBeNull();
        expect(document.querySelector('.chrome-auth')).toBeNull();
    });

    it('renders signed-out form with email, password, and sign-in button', async () => {
        const s = await mountPart({
            parts: [
                { id: 'auth', contribution: new StubAuthExtension() },
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'panel', contribution: Panel },
            ],
            open: [{ application: 'panel', views: ['one'] }],
        });
        site = s;

        const authForm = document.querySelector('.chrome-auth-signed-out');
        expect(authForm).not.toBeNull();

        const emailInput = document.querySelector('.chrome-input-email');
        expect(emailInput).toBeInstanceOf(HTMLInputElement);

        const passwordInput = document.querySelector('.chrome-input-password');
        expect(passwordInput).toBeInstanceOf(HTMLInputElement);
        if (passwordInput instanceof HTMLInputElement) {
            expect(passwordInput.type).toBe('password');
        }

        const signInBtn = document.querySelector('.chrome-signin');
        expect(signInBtn).not.toBeNull();
    });

    it('displays refusal message visibly and clears password on wrong credentials without throwing', async () => {
        const s = await mountPart({
            parts: [
                { id: 'auth', contribution: new StubAuthExtension() },
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'panel', contribution: Panel },
            ],
            open: [{ application: 'panel', views: ['one'] }],
        });
        site = s;

        typeInto('.chrome-input-email', 'alice@example.com');
        typeInto('.chrome-input-password', 'wrong');

        const passwordInput = document.querySelector('.chrome-input-password');
        if (passwordInput instanceof HTMLInputElement) {
            expect(passwordInput.value).toBe('wrong');
        }

        clickElement('.chrome-signin');

        await waitForCondition(() => document.querySelector('.chrome-auth-error') !== null);

        const errorEl = document.querySelector('.chrome-auth-error');
        expect(errorEl?.textContent).toBe('Invalid email or password');

        // Password input is cleared on submit
        if (passwordInput instanceof HTMLInputElement) {
            expect(passwordInput.value).toBe('');
        }

        // Email input remains intact
        const emailInput = document.querySelector('.chrome-input-email');
        if (emailInput instanceof HTMLInputElement) {
            expect(emailInput.value).toBe('alice@example.com');
        }
    });

    it('signs in with valid credentials and shows user identity and sign-out button', async () => {
        const s = await mountPart({
            parts: [
                { id: 'auth', contribution: new StubAuthExtension() },
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'panel', contribution: Panel },
            ],
            open: [{ application: 'panel', views: ['one'] }],
        });
        site = s;

        typeInto('.chrome-input-email', 'alice@example.com');
        typeInto('.chrome-input-password', 'secret');

        clickElement('.chrome-signin');

        await waitForCondition(() => document.querySelector('.chrome-auth-signed-in') !== null);

        expect(document.querySelector('.chrome-auth-signed-out')).toBeNull();

        const userEl = document.querySelector('.chrome-user');
        expect(userEl?.textContent).toBe('alice');

        const signOutBtn = document.querySelector('.chrome-signout');
        expect(signOutBtn).not.toBeNull();
    });

    it('signs out when clicking sign out button', async () => {
        const s = await mountPart({
            parts: [
                {
                    id: 'auth',
                    contribution: new StubAuthExtension({
                        initialSession: {
                            userId: 'usr_456',
                            displayName: 'Bob',
                            roles: ['member'],
                            expiresAt: Date.now() + 3600000,
                        },
                    }),
                },
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'panel', contribution: Panel },
            ],
            open: [{ application: 'panel', views: ['one'] }],
        });
        site = s;

        expect(document.querySelector('.chrome-auth-signed-in')).not.toBeNull();
        expect(document.querySelector('.chrome-user')?.textContent).toBe('Bob');

        clickElement('.chrome-signout');

        await waitForCondition(() => document.querySelector('.chrome-auth-signed-out') !== null);
        expect(document.querySelector('.chrome-auth-signed-in')).toBeNull();
    });

    it('renders signed-in state on load if session is already held', async () => {
        const s = await mountPart({
            parts: [
                {
                    id: 'auth',
                    contribution: new StubAuthExtension({
                        initialSession: {
                            userId: 'usr_789',
                            displayName: 'Carol',
                            roles: ['admin'],
                            expiresAt: Date.now() + 3600000,
                        },
                    }),
                },
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'panel', contribution: Panel },
            ],
            open: [{ application: 'panel', views: ['one'] }],
        });
        site = s;

        expect(document.querySelector('.chrome-auth-signed-out')).toBeNull();
        const signedIn = document.querySelector('.chrome-auth-signed-in');
        expect(signedIn).not.toBeNull();
        expect(document.querySelector('.chrome-user')?.textContent).toBe('Carol');
    });

    it('displays userId when displayName is empty', async () => {
        const s = await mountPart({
            parts: [
                {
                    id: 'auth',
                    contribution: new StubAuthExtension({
                        initialSession: {
                            userId: 'usr_anonymous',
                            displayName: '',
                            roles: ['member'],
                            expiresAt: Date.now() + 3600000,
                        },
                    }),
                },
                { id: 'chrome', contribution: ChromeExtension },
                { id: 'panel', contribution: Panel },
            ],
            open: [{ application: 'panel', views: ['one'] }],
        });
        site = s;

        expect(document.querySelector('.chrome-user')?.textContent).toBe('usr_anonymous');
    });
});
