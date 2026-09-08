import {
    element,
    type CapabilityMap,
    type Chrome,
    type Node as Described,
} from '@flybyme/mesh-web';
import { renderNavBar } from './navBar.js';
import type { AuthViewProps } from './authView.js';

export type Display = CapabilityMap['display'];

export interface NavShellProps {
    readonly chrome: Chrome;
    readonly display: Display;
    readonly authProps: AuthViewProps;
    readonly isNarrow: () => boolean;
}

export function renderNavShell(props: NavShellProps): Described {
    const { chrome, authProps, isNarrow } = props;

    return element('Stack', {
        props: {
            class: () => `nav-shell ${isNarrow() ? 'nav-shell-narrow' : 'nav-shell-wide'}`,
            style: () => ({
                display: 'flex',
                flexDirection: isNarrow() ? 'column' : 'row',
                width: '100%',
                height: '100%',
                minWidth: '0',
                minHeight: '0',
                overflow: 'hidden',
                background: 'var(--bg, #0d1117)',
                color: 'var(--ink, #c9d1d9)',
            }),
        },
        children: [
            renderNavBar({ chrome, authProps, isNarrow }),
            element('Stack', {
                props: {
                    class: 'nav-content',
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        flex: '1 1 auto',
                        minWidth: '0',
                        minHeight: '0',
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        overflow: 'auto',
                    },
                },
                children: [
                    /**
                     * Unconditional window host.
                     *
                     * Inside a `when` or `each` it would be recreated on every reactive change,
                     * re-parenting windows and triggering ChromeError.
                     */
                    chrome.host(),
                ],
            }),
        ],
    });
}
