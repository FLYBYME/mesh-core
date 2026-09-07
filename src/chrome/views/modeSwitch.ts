import {
    command,
    element,
    text,
    type Chrome,
    type Node as Described,
} from '@flybyme/mesh-web';

/**
 * The mode switch, which is the reason this Extension exists at all.
 *
 * `setMode` has been real since the window manager was written — persisted in the `device`
 * hive, lockable by a site writing it as policy — and no menu, button or binding called it.
 * A whole layout mode existed and could not be turned on.
 */
export function renderModeSwitch(chrome: Chrome): Described {
    return element('Button', {
        props: {
            class: 'chrome-mode',
            title: 'Switch between overlapping windows and tiles (alt+t)',
        },
        intents: {
            activate: { action: command('chrome.mode') },
        },
        children: [text(() => (chrome.mode() === 'tiled' ? '▦ Tiled' : '❐ Windows'))],
    });
}
