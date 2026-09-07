import {
    command,
    each,
    element,
    text,
    when,
    type Chrome,
    type Node as Described,
} from '@flybyme/mesh-web';

/**
 * One entry per open window.
 *
 * Keyed by window id rather than by index, because a window closing must not renumber every
 * button after it — `each` would then rebuild entries that did not change, and a rebuilt
 * button is one that loses focus mid-keyboard-navigation.
 */
export function renderWindowList(chrome: Chrome): Described {
    return element('Row', {
        props: {
            class: 'chrome-windows',
            /**
             * `minWidth: 0` is what makes `overflowX: auto` mean anything.
             *
             * A flex item defaults to `min-width: auto`, which refuses to shrink below its content
             * — so this never scrolled, it grew, pushing the rest of the bar along and squeezing
             * the controls to the end. The overflow rule was written and could not take effect.
             */
            style: { display: 'flex', gap: '4px', flex: '1 1 auto', minWidth: '0', overflowX: 'auto' },
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
                        // The full title in the tooltip, because the tab itself is elided and a
                        // desktop with six Notes windows is otherwise six identical tabs.
                        title: () => w().title,
                        /**
                         * The elision the comment above always claimed and nothing implemented:
                         * `chrome` ships no stylesheet, so `.chrome-tab` had no rules at all and
                         * every tab was as wide as its full title. Inline until chrome adopts
                         * `ui.*`, which is where this belongs.
                         *
                         * `flexShrink: 0` keeps a tab its own size so the *row* scrolls, rather
                         * than every tab compressing toward unreadable as windows are opened.
                         */
                        style: {
                            flexShrink: '0', maxWidth: '160px', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            padding: '3px 10px', borderRadius: '4px', fontSize: '12px',
                            border: '1px solid var(--edge, #30363d)',
                            background: 'var(--surface, #21262d)',
                            color: 'var(--ink, #c9d1d9)', cursor: 'pointer',
                        },
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
}
