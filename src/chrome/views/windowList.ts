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
}
