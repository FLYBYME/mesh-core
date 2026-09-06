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
    PAGE_CHROME,
    consumes,
    each,
    element,
    empty,
    command,
    needs,
    text,
    when,
    type Context,
    type Extension,
    type Node as Described,
    type PageChrome,
} from '@flybyme/mesh-web';

import { AUTH, type AuthApi } from '@flybyme/mesh-web';

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

const NEEDS = needs('chrome', 'log', 'commands', 'state');
const CONSUMES = consumes(AUTH);
const EMPTY_CONSUMES = consumes();

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

        /**
         * One entry per open window.
         *
         * Keyed by window id rather than by index, because a window closing must not renumber every
         * button after it — `each` would then rebuild entries that did not change, and a rebuilt
         * button is one that loses focus mid-keyboard-navigation.
         */
        const windowList = (): Described => element('Row', {
            props: {
                class: 'chrome-windows',
                style: { display: 'flex', gap: '4px', flex: '1 1 auto', overflowX: 'auto' },
            },
            children: [
                each(
                    () => chrome.windows(),
                    (w) => w.id,
                    (w) => element('Button', {
                        props: {
                            class: () => (chrome.focused() === w().id
                                ? 'chrome-tab chrome-tab-active'
                                : 'chrome-tab'),
                            // The full title, because the button itself is elided at ~14 characters
                            // and a desktop with six Notes windows is otherwise six identical tabs.
                            title: () => w().title,
                        },
                        intents: {
                            activate: { action: command('chrome.focus', w().id) },
                        },
                        children: [text(() => w().title)],
                    }),
                ),
                when(
                    () => chrome.windows().length === 0,
                    () => element('Text', {
                        props: { class: 'chrome-empty' },
                        children: [text('No windows open')],
                    }),
                ),
            ],
        });

        /**
         * The mode switch, which is the reason this Extension exists at all.
         *
         * `setMode` has been real since the window manager was written — persisted in the `device`
         * hive, lockable by a site writing it as policy — and no menu, button or binding called it.
         * A whole layout mode existed and could not be turned on.
         */
        const modeSwitch = (): Described => element('Button', {
            props: {
                class: 'chrome-mode',
                title: 'Switch between overlapping windows and tiles (alt+t)',
            },
            intents: {
                activate: { action: command('chrome.mode') },
            },
            children: [text(() => (chrome.mode() === 'tiled' ? '▦ Tiled' : '❐ Windows'))],
        });

        const authView = (): Described => {
            if (auth === undefined) return empty();

            return when(
                () => auth.session() !== null,
                () => {
                    const who = () => {
                        const s = auth.session();
                        return s?.displayName || s?.userId || 'Signed in';
                    };

                    return element('Row', {
                        props: {
                            class: 'chrome-auth chrome-auth-signed-in',
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                flex: '0 0 auto',
                            },
                        },
                        children: [
                            element('Text', {
                                props: {
                                    class: 'chrome-user',
                                    style: {
                                        fontSize: '12px',
                                        color: 'var(--ink, #c9d1d9)',
                                    },
                                },
                                children: [text(who)],
                            }),
                            element('Button', {
                                props: {
                                    class: 'chrome-signout',
                                    title: 'Sign out',
                                    style: {
                                        padding: '2px 8px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        background: 'var(--surface, #21262d)',
                                        border: '1px solid var(--edge, #30363d)',
                                        borderRadius: '4px',
                                        color: 'var(--ink, #c9d1d9)',
                                    },
                                },
                                intents: {
                                    activate: { action: command('chrome.signOut') },
                                },
                                children: [text('Sign out')],
                            }),
                        ],
                    });
                },
                () => element('Form', {
                    props: {
                        class: 'chrome-auth chrome-auth-signed-out',
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            margin: '0',
                            flex: '0 0 auto',
                        },
                    },
                    intents: {
                        commit: { action: command('chrome.signIn'), preventDefault: true },
                    },
                    children: [
                        when(
                            () => authError() !== null,
                            () => element('Text', {
                                props: {
                                    class: 'chrome-auth-error',
                                    style: {
                                        color: 'var(--danger, #f85149)',
                                        fontSize: '12px',
                                    },
                                },
                                children: [text(() => authError() ?? '')],
                            }),
                        ),
                        element('Input', {
                            props: {
                                class: 'chrome-input-email',
                                type: 'email',
                                placeholder: 'Email',
                                value: () => email(),
                                style: {
                                    padding: '2px 6px',
                                    fontSize: '12px',
                                    background: 'var(--surface, #0d1117)',
                                    border: '1px solid var(--edge, #30363d)',
                                    borderRadius: '4px',
                                    color: 'var(--ink, #c9d1d9)',
                                    width: '130px',
                                },
                            },
                            intents: {
                                change: { action: command('chrome.setEmail') },
                            },
                        }),
                        element('Input', {
                            props: {
                                class: 'chrome-input-password',
                                type: 'password',
                                placeholder: 'Password',
                                value: () => password(),
                                style: {
                                    padding: '2px 6px',
                                    fontSize: '12px',
                                    background: 'var(--surface, #0d1117)',
                                    border: '1px solid var(--edge, #30363d)',
                                    borderRadius: '4px',
                                    color: 'var(--ink, #c9d1d9)',
                                    width: '110px',
                                },
                            },
                            intents: {
                                change: { action: command('chrome.setPassword') },
                            },
                        }),
                        element('Button', {
                            props: {
                                class: 'chrome-signin',
                                type: 'submit',
                                style: {
                                    padding: '2px 8px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    background: 'var(--accent, #1f6feb)',
                                    border: '1px solid var(--edge, #30363d)',
                                    borderRadius: '4px',
                                    color: 'var(--on-accent, #ffffff)',
                                },
                            },
                            intents: {
                                activate: { action: command('chrome.signIn') },
                            },
                            children: [text(() => (submitting() ? 'Signing in...' : 'Sign in'))],
                        }),
                    ],
                }),
            );
        };

        return {
            render: (): Described => element('Stack', {
                /**
                 * Styled inline, and that is a finding rather than a preference.
                 *
                 * **A part cannot ship CSS.** The builder bundles an entry with esbuild; the
                 * kernel's own stylesheet is copied by mesh-web's build script and served as a
                 * second file in the kernel artifact. A part has no equivalent, so a shell that
                 * needs `height: 100%` on its outermost box has nowhere to say so except here.
                 *
                 * It matters more than it looks: this is the box the window host lives in, and a
                 * host with no height is a desktop with no windows — which is exactly what the
                 * first deploy of this Extension rendered.
                 */
                props: {
                    class: 'chrome-shell',
                    style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%' },
                },
                children: [
                    element('Row', {
                        props: {
                            class: 'chrome-bar',
                            style: {
                                flex: '0 0 auto', alignItems: 'center', gap: '8px',
                                padding: '6px 10px', background: 'var(--chrome, #161b22)',
                                borderBottom: '1px solid var(--edge, #30363d)',
                            },
                        },
                        children: [
                            element('Text', {
                                props: { class: 'chrome-brand' },
                                children: [text('mesh')],
                            }),
                            windowList(),
                            modeSwitch(),
                            authView(),
                        ],
                    }),

                    /**
                     * **Unconditional, and that is a rule rather than a style.**
                     *
                     * Inside a `when` or an `each` the host is destroyed and rebuilt on every
                     * change, which re-parents every window and resets their scroll. The kernel
                     * checks for it with a `MutationObserver` and throws a `ChromeError` if it is
                     * ever detached, which is how this stops being a comment nobody keeps.
                     */
                    chrome.host(),
                ],
            }),
        };
    }
}
