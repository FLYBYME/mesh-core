import {
    element,
    text,
    type Chrome,
    type Node as Described,
} from '@flybyme/mesh-web';
import { renderWindowList } from './windowList.js';
import { renderModeSwitch } from './modeSwitch.js';
import { renderAuthView, type AuthViewProps } from './authView.js';

export interface ShellViewProps {
    readonly chrome: Chrome;
    readonly authProps: AuthViewProps;
}

export function renderShell(props: ShellViewProps): Described {
    const { chrome, authProps } = props;
    return element('Stack', {
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
                    /**
                     * `display: flex` is not optional here, and its absence is why the bar's
                     * contents stacked vertically and the controls jumped as titles changed.
                     *
                     * `Row` renders a bare `<div>` — the kernel styles no primitive — so
                     * `alignItems` and `gap` did nothing and every child was a block. 107 of the
                     * 140 `Row` uses across mesh-core and mesh-demos set this by hand; this was
                     * one of the 33 that did not.
                     *
                     * `minWidth: 0` so the window list can actually shrink and scroll instead of
                     * forcing the bar wider than the page — a flex item's default `min-width: auto`
                     * refuses to shrink below its content, which is the other half of the jumping.
                     */
                    style: {
                        display: 'flex', flex: '0 0 auto', alignItems: 'center', gap: '8px',
                        minWidth: '0',
                        padding: '6px 10px', background: 'var(--chrome, #161b22)',
                        borderBottom: '1px solid var(--edge, #30363d)',
                    },
                },
                children: [
                    element('Text', {
                        props: { class: 'chrome-brand' },
                        children: [text('mesh')],
                    }),
                    renderWindowList(chrome),
                    renderModeSwitch(chrome),
                    renderAuthView(authProps),
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
    });
}
