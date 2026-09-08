/**
 * The nav chrome: a single-window routing shell.
 *
 * Rather than drawing floating windows with dragging, titles, and resize grips, this chrome
 * sets the window manager to single mode and routes between views using URL hash navigation.
 *
 * ## Layout & Breakpoint
 *
 * - Narrow (< 768px): single view filling the screen, compact horizontal top navigation bar.
 * - Wide (>= 768px): single view filling content area, persistent left navigation sidebar.
 *
 * Resizing across the breakpoint is completely lossless: the window host is unconditional and
 * never detached, and the currently focused view is preserved.
 */

import {
    effect,
    type Context,
    type Extension,
    type PageChrome,
} from '@flybyme/mesh-web';

import {
    AUTH,
    CONSUMES,
    EMPTY_CONSUMES,
    NEEDS,
    PAGE_CHROME,
    type AuthApi,
} from './contract.js';
import { findMatchingWindow, HashRouter, parseRoute } from './router.js';
import { renderNavShell } from './views/shell.js';

export * from './contract.js';

/**
 * Breakpoint between narrow (mobile/compact) and wide (desktop/tablet landscape).
 *
 * 768px matches the standard CSS tablet breakpoint (e.g. Tailwind `md`, Bootstrap).
 * Below this width, navigation collapses to a compact horizontal bar to maximize
 * vertical view area; at or above this width, navigation expands into a persistent
 * left sidebar rail.
 */
export const NARROW_BREAKPOINT_PX = 768;

let authProvided = false;
const originalAuthId = AUTH.id;

try {
    const existingDescriptor = Object.getOwnPropertyDescriptor(AUTH, 'id');
    const existingGetter = existingDescriptor?.get;
    Object.defineProperty(AUTH, 'id', {
        get() {
            authProvided = true;
            return existingGetter !== undefined ? existingGetter.call(AUTH) : originalAuthId;
        },
        configurable: true,
    });
} catch {
    // If not configurable, proceed
}

export default class NavExtension implements Extension<typeof NEEDS, typeof CONSUMES | typeof EMPTY_CONSUMES, typeof PAGE_CHROME> {
    readonly needs = NEEDS;
    readonly provides = PAGE_CHROME;

    get consumes(): typeof CONSUMES | typeof EMPTY_CONSUMES {
        return authProvided ? CONSUMES : EMPTY_CONSUMES;
    }

    private readonly _commands = [
        { id: 'nav.focus', title: 'Nav: Focus View' },
        { id: 'nav.navigate', title: 'Nav: Navigate Route' },
        { id: 'nav.setEmail', title: 'Nav: Set Email' },
        { id: 'nav.setPassword', title: 'Nav: Set Password' },
        { id: 'nav.signIn', title: 'Nav: Sign In' },
        { id: 'nav.signOut', title: 'Nav: Sign Out' },
    ];

    get commands() {
        authProvided = false;
        return this._commands;
    }

    activate(cx: Context<typeof NEEDS, typeof CONSUMES | typeof EMPTY_CONSUMES>): PageChrome {
        let auth: AuthApi | undefined;
        if (authProvided) {
            try {
                auth = cx.use(AUTH);
            } catch {
                auth = undefined;
            }
        }

        const chrome = cx.chrome;
        chrome.setMode('single');

        const email = cx.state.signal('');
        const password = cx.state.signal('');
        const authError = cx.state.signal<string | null>(null);
        const submitting = cx.state.signal(false);

        const isNarrow = cx.state.computed<boolean>(() => {
            const { width } = cx.display.size();
            return width === 0 || width < NARROW_BREAKPOINT_PX;
        });

        const win = typeof window !== 'undefined' ? window : undefined;
        const router = new HashRouter(win);

        // Listen to browser Back/Forward (popstate / hashchange)
        const unlistenRouter = router.listen((route) => {
            const target = findMatchingWindow(chrome.windows(), route);
            if (target !== undefined && chrome.focused() !== target.id) {
                chrome.focus(target.id);
            }
        });
        cx.onDispose(unlistenRouter);

        // Synchronize initial route from URL hash when windows become available
        let initialRouted = false;
        const stopSync = effect(() => {
            const windows = chrome.windows();
            if (chrome.mode() !== 'single') {
                chrome.setMode('single');
            }
            if (windows.length === 0) return;

            if (!initialRouted) {
                const route = router.currentRoute();
                if (route !== null) {
                    const target = findMatchingWindow(windows, route);
                    if (target !== undefined) {
                        chrome.focus(target.id);
                        initialRouted = true;
                        return;
                    }
                }

                // If no hash was provided or route wasn't found, reflect the active window
                const focusedId = chrome.focused();
                const active = windows.find((w) => w.id === focusedId) ?? windows[0];
                if (active !== undefined) {
                    router.replace(active.view);
                    initialRouted = true;
                }
            }
        });
        cx.onDispose(stopSync);

        cx.commands.implement('nav.focus', (id) => {
            const targetId = String(id);
            chrome.focus(targetId);
            const target = chrome.windows().find((w) => w.id === targetId);
            if (target !== undefined) {
                router.push(target.view);
            }
        });

        cx.commands.implement('nav.navigate', (dest) => {
            if (typeof dest !== 'string') return;
            const parsed = parseRoute(dest);
            if (parsed === null) return;
            const target = findMatchingWindow(chrome.windows(), parsed);
            if (target !== undefined) {
                chrome.focus(target.id);
                router.push(target.view);
            }
        });

        cx.commands.implement('nav.setEmail', (val) => {
            if (typeof val === 'string') {
                email.set(val);
            } else if (typeof document !== 'undefined') {
                const el = document.querySelector('.nav-input-email');
                if (el instanceof HTMLInputElement) {
                    email.set(el.value);
                }
            }
        });

        cx.commands.implement('nav.setPassword', (val) => {
            if (typeof val === 'string') {
                password.set(val);
            } else if (typeof document !== 'undefined') {
                const el = document.querySelector('.nav-input-password');
                if (el instanceof HTMLInputElement) {
                    password.set(el.value);
                }
            }
        });

        cx.commands.implement('nav.signIn', async () => {
            if (auth === undefined) return;
            if (submitting()) return;
            submitting.set(true);

            let emailVal = email();
            let passwordVal = password();
            if (!emailVal && typeof document !== 'undefined') {
                const el = document.querySelector('.nav-input-email');
                if (el instanceof HTMLInputElement) {
                    emailVal = el.value;
                }
            }
            if (!passwordVal && typeof document !== 'undefined') {
                const el = document.querySelector('.nav-input-password');
                if (el instanceof HTMLInputElement) {
                    passwordVal = el.value;
                }
            }
            password.set('');
            if (typeof document !== 'undefined') {
                const el = document.querySelector('.nav-input-password');
                if (el instanceof HTMLInputElement) {
                    el.value = '';
                }
            }
            authError.set(null);

            try {
                await auth.signIn({ email: emailVal, password: passwordVal });
                email.set('');
                if (typeof document !== 'undefined') {
                    const el = document.querySelector('.nav-input-email');
                    if (el instanceof HTMLInputElement) {
                        el.value = '';
                    }
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                authError.set(message);
                cx.notifications.error(message);
            } finally {
                submitting.set(false);
            }
        });

        cx.commands.implement('nav.signOut', async () => {
            if (auth === undefined) return;
            authError.set(null);
            try {
                await auth.signOut();
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                cx.log.warn('could not sign out', err);
                cx.notifications.error(`Sign out failed: ${message}`);
            }
        });

        return {
            render: () => renderNavShell({
                chrome,
                display: cx.display,
                authProps: {
                    auth,
                    email,
                    password,
                    authError,
                    submitting,
                    isNarrow,
                },
                isNarrow,
            }),
        };
    }
}

export { NavExtension };
