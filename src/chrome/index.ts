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
    each,
    element,
    command,
    needs,
    text,
    when,
    type Context,
    type Extension,
    type Node as Described,
    type PageChrome,
} from '@flybyme/mesh-web';

const NEEDS = needs('chrome', 'log', 'commands');

export default class ChromeExtension implements Extension<typeof NEEDS, readonly [], typeof PAGE_CHROME> {
    readonly needs = NEEDS;
    readonly provides = PAGE_CHROME;

    /**
     * Named, so they are rebindable and reachable from anywhere a command is.
     *
     * The first version registered its own handler table and the buttons did nothing: a description
     * is data, so a function in it is referred to by id, and the id has to be one the *renderer*
     * knows. Commands are that mechanism, and going through them means the shell's actions are the
     * same kind of thing as an Application's rather than a private arrangement.
     */
    readonly commands = [
        { id: 'chrome.focus', title: 'Chrome: Focus Window' },
        { id: 'chrome.mode', title: 'Chrome: Switch Windowed / Tiled' },
    ];

    activate(cx: Context<typeof NEEDS, readonly []>): PageChrome {
        const chrome = cx.chrome;
        // Handlers are registered, not inlined: a description is data, so a function in it has to be
        // referred to by id rather than carried. The table is this Extension's own scope.

        cx.commands.implement('chrome.focus', (id) => { chrome.focus(String(id)); });
        cx.commands.implement('chrome.mode', () => {
            chrome.setMode(chrome.mode() === 'tiled' ? 'windowed' : 'tiled');
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
