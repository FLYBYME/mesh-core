/**
 * The shell.
 *
 * A window manager with no chrome has nowhere to put anything: tiled mode was real, persisted per
 * device and lockable by site policy, and until `alt+t` existed there was **no way to turn it on** —
 * not because it was unbuilt, but because nothing on the page could call it. Hotkeys fixed the
 * reachability and left the discoverability: a control nobody can see is a control only its author
 * knows about.
 *
 * So this is the smallest thing that makes the desktop legible. A bar across the top with the open
 * windows in it, a switch between windowed and tiled, and the area the windows live in.
 *
 * ## What it deliberately does not do
 *
 * **It does not move, resize or stack anything.** Those are the kernel's, per
 * [kernel §2](https://github.com/FLYBYME/mesh-web) — a broken chrome must not be able to make windows
 * unresizable. What it does here is *ask*: `focus`, `close`, `setMode`, all through `cx.chrome`,
 * which is a projection of the manager rather than the manager itself.
 *
 * **It is an Extension, not the kernel.** A site that wants a different shell composes a different
 * part and this one is simply absent — `mountPage` resolves `PAGE_CHROME` and mounts the window
 * layer at the root when nobody provides it. That is why the window area below is a node this
 * returns rather than an element it is handed.
 */

import {
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
import { renderShell } from './views/shell.js';

export * from './contract.js';

let authProvided = false;
const originalAuthId = AUTH.id;

try {
    Object.defineProperty(AUTH, 'id', {
        get() {
            authProvided = true;
            return originalAuthId;
        },
        configurable: true,
    });
} catch {
    // If not configurable, proceed
}

export default class ChromeExtension implements Extension<typeof NEEDS, typeof CONSUMES | typeof EMPTY_CONSUMES, typeof PAGE_CHROME> {
    readonly needs = NEEDS;
    readonly provides = PAGE_CHROME;

    get consumes(): typeof CONSUMES | typeof EMPTY_CONSUMES {
        return authProvided ? CONSUMES : EMPTY_CONSUMES;
    }

    private readonly _commands = [
        { id: 'chrome.focus', title: 'Chrome: Focus Window' },
        { id: 'chrome.mode', title: 'Chrome: Switch Windowed / Tiled' },
        { id: 'chrome.setEmail', title: 'Chrome: Set Email' },
        { id: 'chrome.setPassword', title: 'Chrome: Set Password' },
        { id: 'chrome.signIn', title: 'Chrome: Sign In' },
        { id: 'chrome.signOut', title: 'Chrome: Sign Out' },
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
        const email = cx.state.signal('');
        const password = cx.state.signal('');
        const authError = cx.state.signal<string | null>(null);
        const submitting = cx.state.signal(false);

        // Handlers are registered, not inlined: a description is data, so a function in it has to be
        // referred to by id rather than carried. The table is this Extension's own scope.

        cx.commands.implement('chrome.focus', (id) => { chrome.focus(String(id)); });
        cx.commands.implement('chrome.mode', () => {
            chrome.setMode(chrome.mode() === 'tiled' ? 'windowed' : 'tiled');
        });

        cx.commands.implement('chrome.setEmail', (val) => {
            if (typeof val === 'string') {
                email.set(val);
            } else if (typeof document !== 'undefined') {
                const el = document.querySelector('.chrome-input-email');
                if (el instanceof HTMLInputElement) {
                    email.set(el.value);
                }
            }
        });

        cx.commands.implement('chrome.setPassword', (val) => {
            if (typeof val === 'string') {
                password.set(val);
            } else if (typeof document !== 'undefined') {
                const el = document.querySelector('.chrome-input-password');
                if (el instanceof HTMLInputElement) {
                    password.set(el.value);
                }
            }
        });

        cx.commands.implement('chrome.signIn', async () => {
            if (auth === undefined) return;
            if (submitting()) return;
            submitting.set(true);

            let emailVal = email();
            let passwordVal = password();
            if (!emailVal && typeof document !== 'undefined') {
                const el = document.querySelector('.chrome-input-email');
                if (el instanceof HTMLInputElement) {
                    emailVal = el.value;
                }
            }
            if (!passwordVal && typeof document !== 'undefined') {
                const el = document.querySelector('.chrome-input-password');
                if (el instanceof HTMLInputElement) {
                    passwordVal = el.value;
                }
            }
            // A password goes to ticket_issue and is forgotten: clear the controlled signal
            // immediately so it never outlives the submit.
            password.set('');
            if (typeof document !== 'undefined') {
                const el = document.querySelector('.chrome-input-password');
                if (el instanceof HTMLInputElement) {
                    el.value = '';
                }
            }
            authError.set(null);

            try {
                await auth.signIn({ email: emailVal, password: passwordVal });
                email.set('');
                if (typeof document !== 'undefined') {
                    const el = document.querySelector('.chrome-input-email');
                    if (el instanceof HTMLInputElement) {
                        el.value = '';
                    }
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                authError.set(message);
            } finally {
                submitting.set(false);
            }
        });

        cx.commands.implement('chrome.signOut', async () => {
            if (auth === undefined) return;
            authError.set(null);
            try {
                await auth.signOut();
            } catch (err) {
                cx.log.warn('could not sign out', err);
            }
        });

        return {
            render: () => renderShell({
                chrome,
                authProps: {
                    auth,
                    email,
                    password,
                    authError,
                    submitting,
                },
            }),
        };
    }
}

export { ChromeExtension };
