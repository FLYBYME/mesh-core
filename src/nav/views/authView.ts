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
    readonly isNarrow?: () => boolean;
}

export function renderNavAuthView(props: AuthViewProps): Described {
    const { auth, email, password, authError, submitting, isNarrow } = props;
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
                    class: 'nav-auth nav-auth-signed-in',
                    style: () => ({
                        display: 'flex',
                        flexDirection: isNarrow?.() ? 'row' : 'column',
                        alignItems: isNarrow?.() ? 'center' : 'flex-start',
                        gap: '6px',
                        flex: '0 0 auto',
                    }),
                },
                children: [
                    element('Text', {
                        props: {
                            class: 'nav-user',
                            style: {
                                fontSize: '12px',
                                color: 'var(--ink, #c9d1d9)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '180px',
                            },
                        },
                        children: [text(who)],
                    }),
                    element('Button', {
                        props: {
                            class: 'nav-signout',
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
                            activate: { action: command('nav.signOut') },
                        },
                        children: [text('Sign out')],
                    }),
                ],
            });
        },
        () => element('Form', {
            props: {
                class: 'nav-auth nav-auth-signed-out',
                style: () => ({
                    display: 'flex',
                    flexDirection: isNarrow?.() ? 'row' : 'column',
                    alignItems: isNarrow?.() ? 'center' : 'stretch',
                    gap: '6px',
                    margin: '0',
                    flex: '0 0 auto',
                }),
            },
            intents: {
                commit: { action: command('nav.signIn'), preventDefault: true },
            },
            children: [
                when(
                    () => authError() !== null,
                    () => element('Text', {
                        props: {
                            class: 'nav-auth-error',
                            style: {
                                color: 'var(--danger, #f85149)',
                                fontSize: '11px',
                            },
                        },
                        children: [text(() => authError() ?? '')],
                    }),
                ),
                element('Input', {
                    props: {
                        class: 'nav-input-email',
                        type: 'email',
                        placeholder: 'Email',
                        value: () => email(),
                        style: () => ({
                            padding: '2px 6px',
                            fontSize: '12px',
                            background: 'var(--surface, #0d1117)',
                            border: '1px solid var(--edge, #30363d)',
                            borderRadius: '4px',
                            color: 'var(--ink, #c9d1d9)',
                            width: isNarrow?.() ? '110px' : '100%',
                            boxSizing: 'border-box',
                        }),
                    },
                    intents: {
                        change: { action: command('nav.setEmail') },
                    },
                }),
                element('Input', {
                    props: {
                        class: 'nav-input-password',
                        type: 'password',
                        placeholder: 'Password',
                        value: () => password(),
                        style: () => ({
                            padding: '2px 6px',
                            fontSize: '12px',
                            background: 'var(--surface, #0d1117)',
                            border: '1px solid var(--edge, #30363d)',
                            borderRadius: '4px',
                            color: 'var(--ink, #c9d1d9)',
                            width: isNarrow?.() ? '90px' : '100%',
                            boxSizing: 'border-box',
                        }),
                    },
                    intents: {
                        change: { action: command('nav.setPassword') },
                    },
                }),
                element('Button', {
                    props: {
                        class: 'nav-signin',
                        type: 'submit',
                        disabled: () => submitting(),
                        style: () => ({
                            padding: '2px 8px',
                            fontSize: '12px',
                            cursor: submitting() ? 'not-allowed' : 'pointer',
                            opacity: submitting() ? 0.7 : 1,
                            background: 'var(--accent, #1f6feb)',
                            border: '1px solid var(--edge, #30363d)',
                            borderRadius: '4px',
                            color: 'var(--on-accent, #ffffff)',
                        }),
                    },
                    intents: {
                        activate: { action: command('nav.signIn') },
                    },
                    children: [text(() => (submitting() ? 'Signing in...' : 'Sign in'))],
                }),
            ],
        }),
    );
}
