/**
 * The console's shell, as an Extension.
 *
 * This is the claim mesh-web's A6.3 makes, tested by someone who cannot cheat: a workbench — tabs, a
 * mode switch, a status line, everything around the windows — is an *ordinary Extension* over the
 * window manager, with no privileged reach. It declares four capabilities, returns a description,
 * and marks with `cx.chrome.host()` where the windows go. There is no `Shell` object here, no import
 * from a framework internal, and **no DOM**.
 *
 * ## Why the console writes its own rather than installing one
 *
 * mesh-web has a `WorkbenchExtension` and it does not ship it. It lives in that repo's `browser/`
 * directory, outside the package, deliberately — the IDE is a different product from the framework,
 * and a blog that installs the framework should not receive an activity bar. So there was nothing to
 * import, and this file is what an outside author actually does.
 *
 * That turns out to be the better test. A shipped workbench would have proved that mesh-web can run
 * mesh-web's own chrome; writing one here proves the *interfaces* are enough, which is what A6.3
 * actually claims.
 *
 * ## Every affordance is an intent, not a handler
 *
 * There is no `onClick` anywhere below, and the description holds no functions. A button declares
 * `intents: { activate: { action: command(...) } }`, the page dispatches it, and the command is the
 * same one a key binding or a palette entry would reach. That is what makes a tab *scriptable*
 * rather than only clickable — and it is why chrome can be described by something that has never
 * seen an element.
 */

import { type BoundCommand } from '@flybyme/mesh-web';
import {
    command, consumes, createHandlerTable, each, element, needs, text, when, PAGE_CHROME,
    type Chrome, type ChromeWindow, type Context, type Extension, type Node, type PageChrome,
    type Registrar, type Router, type RouterApplication,
} from '@flybyme/mesh-web';

import { AUTH, type AuthApi } from '@flybyme/mesh-core/auth';
import { SignIn } from '@flybyme/mesh-core/ui';

const NEEDS = needs('chrome', 'state', 'commands', 'log', 'router');
/**
 * The one capability the shell needs that the window layer below it doesn't: somewhere to put a
 * sign-in control that every Application on the page shares, instead of each one building its own
 * (`ui/composites/signIn.ts`'s own header names this exact repetition as the reason it exists).
 */
const CONSUMES = consumes(AUTH);

export class ConsoleChrome implements Extension<typeof NEEDS, typeof CONSUMES, typeof PAGE_CHROME> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = PAGE_CHROME;

    /**
     * Declared, so both are bindable to a key and reachable from a palette before this Extension has
     * run at all — the manifest is complete before anything activates.
     */
    readonly commands = [
        { id: 'console.toggleMode', title: 'Toggle tiled / windowed' },
        { id: 'console.focusWindow', title: 'Focus window' },
        { id: 'console.switchApp', title: 'Switch application' },
    ];

    activate(cx: Context<typeof NEEDS, typeof CONSUMES>): PageChrome & { api: ConsoleChromeApi } {
        const navItems = cx.state.signal<readonly NavItem[]>([]);
        const api: ConsoleChromeApi = {
            addNav: (item) => navItems.set([...navItems(), item])
        };

        /**
         * One table for the whole shell's lifetime, not one per render: an Extension activates once
         * and is never deactivated (spec/extension.md section 6), so there is no `dispose()` moment
         * to call this against -- unlike `vx.on` in an Application's view, which a window's own
         * teardown disposes. `banner()` below is called once too (`PageChrome.render()` is called
         * once; the renderer keeps its signals live from there), so one table for one call is exact,
         * not a shortcut.
         */
        const handlers = createHandlerTable('console-chrome');
        const auth = cx.use(AUTH);

        const sidebar = (): Node => element('Stack', {
            props: { class: 'console-sidebar' },
            children: [
                each(
                    navItems,
                    (i) => i.id,
                    (i) => {
                        const item = i();
                        const avail = item.command.available?.();
                        const can = avail ? avail.can : true;
                        
                        return element('Button', {
                            props: { 
                                class: 'console-sidebar-item', 
                                type: 'button',
                                disabled: !can ? 'disabled' : undefined,
                                title: avail && !avail.can ? avail.detail ?? avail.why : undefined
                            },
                            ...(can ? { intents: { activate: { action: command(item.command.action) } } } : {}),
                            children: [text(item.label)]
                        });
                    }
                )
            ]
        });

        const chrome = cx.chrome;

        cx.commands.implement('console.toggleMode', () => {
            chrome.setMode(chrome.mode() === 'tiled' ? 'windowed' : 'tiled');
        });

        cx.commands.implement('console.focusWindow', (id) => {
            if (typeof id === 'string') chrome.focus(id);
        });

        const router = cx.router;
        cx.commands.implement('console.switchApp', (id) => {
            if (typeof id === 'string') router.navigate(id);
        });

        cx.log.info('console chrome ready');

        return { api, handlers,
            render: (): Node => element('Stack', {
                props: { class: 'console' },
                children: [
                    banner(chrome, auth, handlers.on),
                    appSwitcher(router),
                    tabs(chrome),
                    sidebar(),

                    // **The windows.** Unconditional, and never inside a `when` or an `each`: either
                    // destroys and rebuilds it, which re-parents every window and resets its scroll.
                    // The kernel checks this at boot rather than trusting the comment.
                    chrome.host(),

                    status(chrome),
                ],
            }),
        };
    }
}

/**
 * The site's own identity, the mode toggle, and -- new -- sign-in.
 *
 * `SignIn` renders itself: the form when `auth.session()` is `null`, "Signed in as …" otherwise
 * (`ui/composites/signIn.ts`'s own doc calls this out specifically -- "the affordance that fixes the
 * situation must not disappear exactly when the situation occurs"). Chrome doesn't branch on session
 * state itself; it just always renders the composite and lets it decide.
 */
const banner = (chrome: Chrome, auth: Pick<AuthApi, 'session' | 'signIn'>, on: Registrar): Node => element('Row', {
    props: { class: 'console-banner' },
    children: [
        element('Text', { props: { class: 'console-mark' }, children: [text('surfdns')] }),
        element('Text', { props: { class: 'console-where' }, children: [text('operator console')] }),
        element('Button', {
            // A button, so it is reachable without a pointer: every action needs a non-pointer path,
            // and a div with a click handler has none.
            props: { class: 'console-mode', type: 'button' },
            intents: { activate: { action: command('console.toggleMode') } },
            children: [text(() => (chrome.mode() === 'tiled' ? 'Tiled' : 'Windowed'))],
        }),
        SignIn({ auth, on, class: 'console-sign-in' }),
    ],
});

/**
 * One entry per Application this site composes, however many windows each has open.
 *
 * Distinct from `tabs()` below on purpose: that is a *window* switcher (Alt-Tab, one entry per open
 * window, however many belong to one Application), and this is an *Application* switcher (one entry
 * per Application, whether it has one window open or ten) — the thing that was missing entirely
 * before `needs('router')` existed, which is why composing several Applications onto one site used to
 * mean every one of them on screen at once with no way to choose between them.
 *
 * Only rendered when there is more than one Application to choose from: a single-Application site
 * (still the ordinary case) gets nothing extra on screen for a choice it doesn't have.
 */
const appSwitcher = (router: Router): Node => when(
    () => router.applications().length > 1,
    () => element('Row', {
        props: { class: 'console-apps' },
        children: [
            each(
                () => router.applications(),
                (a: RouterApplication) => a.id,
                (a: () => RouterApplication) => element('Button', {
                    props: {
                        class: () => (router.current() === a().id ? 'console-app focused' : 'console-app'),
                        type: 'button',
                    },
                    intents: { activate: { action: command('console.switchApp', a().id) } },
                    children: [text(() => a().title)],
                }),
            ),
        ],
    }),
);

/**
 * One tab per open window, whoever opened it.
 *
 * `chrome.windows()` is what `needs('chrome')` buys, and it is the whole reason a workbench cannot
 * be written with `needs('windows')`: an Application sees only the windows it opened, which is
 * correct for an Application and useless for a shell.
 */
const tabs = (chrome: Chrome): Node => element('Row', {
    props: { class: 'console-tabs' },
    children: [
        each(
            () => chrome.windows(),
            (w: ChromeWindow) => w.id,
            (w: () => ChromeWindow) => element('Button', {
                props: {
                    class: () => (chrome.focused() === w().id ? 'console-tab focused' : 'console-tab'),
                    type: 'button',
                },
                // The id is bound once per tab, which is safe because `each` is keyed by it: this
                // tab is that window for as long as it exists.
                intents: { activate: { action: command('console.focusWindow', w().id) } },
                children: [text(() => w().title)],
            }),
        ),

        // A console with nothing open should say so. An empty strip reads as a rendering failure.
        when(() => chrome.windows().length === 0, () => element('Text', {
            props: { class: 'console-empty' },
            children: [text('no windows')],
        })),
    ],
});

/** The kernel's own state, on screen. */
const status = (chrome: Chrome): Node => element('Row', {
    props: { class: 'console-status' },
    children: [
        element('Text', {
            children: [text(() => {
                const open = chrome.windows().length;
                return `${String(open)} window${open === 1 ? '' : 's'}`;
            })],
        }),
        element('Text', {
            props: { class: 'dim' },
            children: [text(() => {
                const id = chrome.focused();
                return chrome.windows().find((w) => w.id === id)?.title ?? 'nothing focused';
            })],
        }),
    ],
});

export interface NavItem {
    readonly id: string;
    readonly label: string;
    readonly command: BoundCommand<unknown, unknown>;
}

export const CONSOLE_CHROME = 'console.chrome';

export interface ConsoleChromeApi {
    readonly addNav: (item: NavItem) => void;
}
