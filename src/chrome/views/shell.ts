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
