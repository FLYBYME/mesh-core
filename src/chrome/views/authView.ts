import {
    command,
    element,
    empty,
    text,
    when,
    type AuthApi,
    type Node as Described,
    type Signal,
} from '@flybyme/mesh-web';

export interface AuthViewProps {
    readonly auth?: AuthApi | undefined;
    readonly email: Signal<string>;
    readonly password: Signal<string>;
    readonly authError: Signal<string | null>;
    readonly submitting: Signal<boolean>;
}

export function renderAuthView(props: AuthViewProps): Described {
    const { auth, email, password, authError, submitting } = props;
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
                    // Named even though `row` is the initial value. The kernel stylesheet used to
                    // set `flex-direction: column` on every bare `form`, and an inline style only
                    // wins the properties it names — so this box said `flex` and rendered a column.
                    // The kernel no longer does that; declaring it here means this view does not
                    // depend on that having been fixed.
                    flexDirection: 'row',
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
}
