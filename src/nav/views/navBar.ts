import {
    command,
    each,
    element,
    text,
    when,
    type Chrome,
    type Node as Described,
} from '@flybyme/mesh-web';
import { renderNavAuthView, type AuthViewProps } from './authView.js';

export interface NavBarProps {
    readonly chrome: Chrome;
    readonly authProps: AuthViewProps;
    readonly isNarrow: () => boolean;
}

export function renderNavBar(props: NavBarProps): Described {
    const { chrome, authProps, isNarrow } = props;

    return element('Stack', {
        props: {
            class: () => `nav-bar ${isNarrow() ? 'nav-bar-narrow' : 'nav-bar-wide'}`,
            style: () => ({
                display: 'flex',
                flexDirection: isNarrow() ? 'row' : 'column',
                width: isNarrow() ? '100%' : '220px',
                height: isNarrow() ? 'auto' : '100%',
                minWidth: isNarrow() ? '0' : '220px',
                flexShrink: '0',
                alignItems: isNarrow() ? 'center' : 'stretch',
                padding: isNarrow() ? '6px 10px' : '12px 10px',
                gap: isNarrow() ? '8px' : '12px',
                background: 'var(--chrome, #161b22)',
                borderBottom: isNarrow() ? '1px solid var(--edge, #30363d)' : 'none',
                borderRight: isNarrow() ? 'none' : '1px solid var(--edge, #30363d)',
                boxSizing: 'border-box',
            }),
        },
        children: [
            element('Row', {
                props: {
                    class: 'nav-header',
                    style: () => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isNarrow() ? '0 4px 0 0' : '0 4px 8px 4px',
                        borderBottom: isNarrow() ? 'none' : '1px solid var(--edge, #21262d)',
                    }),
                },
                children: [
                    element('Text', {
                        props: {
                            class: 'nav-brand',
                            style: {
                                fontSize: '14px',
                                fontWeight: '700',
                                color: 'var(--ink, #ffffff)',
                                letterSpacing: '0.5px',
                            },
                        },
                        children: [text('mesh')],
                    }),
                ],
            }),

            element('Stack', {
                props: {
                    class: 'nav-items',
                    style: () => ({
                        display: 'flex',
                        flexDirection: isNarrow() ? 'row' : 'column',
                        flex: '1 1 auto',
                        gap: '4px',
                        minWidth: '0',
                        minHeight: '0',
                        overflowX: isNarrow() ? 'auto' : 'hidden',
                        overflowY: isNarrow() ? 'hidden' : 'auto',
                    }),
                },
                children: [
                    each(
                        () => chrome.windows(),
                        (w) => w.id,
                        (w) => element('Button', {
                            props: {
                                class: () => (chrome.focused() === w().id
                                    ? 'nav-item nav-item-active'
                                    : 'nav-item'),
                                'data-nav-item': () => w().view,
                                'data-view': () => w().view,
                                title: () => w().title,
                                style: () => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    flexShrink: isNarrow() ? '0' : 'initial',
                                    width: isNarrow() ? 'auto' : '100%',
                                    padding: isNarrow() ? '4px 10px' : '8px 12px',
                                    borderRadius: '6px',
                                    fontSize: isNarrow() ? '12px' : '13px',
                                    fontWeight: chrome.focused() === w().id ? '600' : '400',
                                    border: isNarrow() ? '1px solid var(--edge, #30363d)' : 'none',
                                    background: chrome.focused() === w().id
                                        ? 'var(--surface-active, #30363d)'
                                        : (isNarrow() ? 'var(--surface, #21262d)' : 'transparent'),
                                    color: chrome.focused() === w().id
                                        ? 'var(--ink, #ffffff)'
                                        : 'var(--ink-muted, #8b949e)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    boxSizing: 'border-box',
                                }),
                            },
                            intents: {
                                activate: { action: command('nav.focus', w().id) },
                            },
                            children: [text(() => w().title)],
                        }),
                    ),
                    when(
                        () => chrome.windows().length === 0,
                        () => element('Text', {
                            props: { class: 'nav-empty' },
                            children: [text('No views open')],
                        }),
                    ),
                ],
            }),

            renderNavAuthView(authProps),
        ],
    });
}
