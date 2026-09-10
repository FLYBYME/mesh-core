/**
 * ui.SignIn composite.
 *
 * **The sign-in form, written once.** Every app that needed one built it by hand: mesh-operator's
 * console bent `ui.ActionCard` with a `renderControl` override to get a password field, plus a
 * `SignInInput` type and a `signIn` command whose whole job was to forward to `auth.signIn` — about
 * sixty lines across three files, repeated per app.
 *
 * ## It takes the auth API as a prop
 *
 * `AuthApi` is mesh-web's and frozen, so this is not a method on it. The caller already holds one —
 * `cx.use(AUTH)` — and passes it in, exactly as it passes `vx.on`. Only `session` and `signIn` are
 * read, so that is all the prop asks for.
 *
 * ## What it renders
 *
 * - **idle** — email, password (`type="password"`), one primary control.
 * - **busy** — while `signIn` is in flight: the control is disabled and says so, the fields are
 *   disabled, and a second press does nothing (rules §3).
 * - **error** — the failure on the card, in place. The form stays, with what was typed in it.
 * - **signed in** — no form. Driven by `auth.session()`, not by a flag of its own, so a session
 *   restored on boot hides it too and a sign-out brings it back. *The affordance that fixes the
 *   situation must not disappear exactly when the situation occurs.*
 *
 * ## In place, not modal — for now
 *
 * The kernel has a real modal primitive (`Dialog` → native `<dialog>` + `showModal()`), and wrapping
 * this card in `ui.Dialog` would be a few lines. It is not done because of what that primitive does
 * **when it is open at mount**, which is exactly when a signed-out page would open a sign-in: the
 * element is not connected yet, `showModal()` throws, the renderer falls back to the `open`
 * attribute, and its retry is gated on `!el.open` — so it never upgrades. The result is a non-modal
 * `<dialog>`, `position: absolute` over the window's content: another layer over windows, which is
 * the open bug (mesh-web A8.16) rather than a fix for it. Measured 2026-09-10: opened after mount it
 * is `:modal` and `position: fixed`; opened at mount it is neither. When the renderer is fixed, the
 * modal variant is `ui.Dialog({ open, children: [card] })`.
 *
 * A composite has state. Created per use, renders itself. Zero DOM manipulation.
 */

import { element, read, signal, text, when } from '@flybyme/mesh-web';
import type { Action, Node, Session } from '@flybyme/mesh-web';
import { Field } from '../components/field.js';
import {
    defineComposite, UI_SIGN_IN,
    type Composite, type SignInProps, type SignInState,
} from '../contract.js';

const DEFAULT_TITLE = 'Sign in';

export function createSignIn(props: SignInProps): SignInState {
    const email = signal<string>(props.initialEmail ?? '');
    const password = signal<string>('');
    const busy = signal<boolean>(false);
    const error = signal<string | null>(null);

    const submit = async (): Promise<Session | undefined> => {
        // Rule §3: cannot be fired twice while running. The disabled control already stops a click;
        // this is what stops every other way in — Enter, the palette, a caller holding `submit`.
        if (busy()) return undefined;

        const credentials = { email: email().trim(), password: password() };
        if (credentials.email === '' || credentials.password === '') {
            // Said here rather than left to a 401 from the API, which would read as "wrong password".
            error.set('Enter your email and password.');
            return undefined;
        }

        busy.set(true);
        error.set(null);

        try {
            const session = await props.auth.signIn(credentials);
            // Used and done with. The form is about to go, and a password has no reason to outlive it.
            password.set('');
            props.onSignedIn?.(session);
            return session;
        } catch (err) {
            const failure = err instanceof Error ? err : new Error(String(err));
            error.set(failure.message);
            props.onError?.(failure);
            return undefined;
        } finally {
            busy.set(false);
        }
    };

    /**
     * **Registered once, here, and not in `view()`** — see `ActionButton`. A handler table has no
     * eviction, and `view()` can run again whenever a `when` above this composite flips.
     *
     * The value is the field's text, already turned into a string by the renderer.
     */
    const emailChanged: Action = props.on((value) => email.set(String(value ?? '')));
    const passwordChanged: Action = props.on((value) => password.set(String(value ?? '')));

    /**
     * **One path in, for a click and for Enter alike.**
     *
     * The control is `type="submit"` and carries no intent of its own; the form's `commit` does. So a
     * click submits the form, Enter in either field submits the form, and both arrive here once. An
     * `activate` on the button as well would be two dispatches per click, one of them relying on the
     * guard above to be harmless.
     */
    const submitted: Action = props.on(() => void submit());

    const view = (): Node => {
        const noteStr = (): string => read(props.note) ?? '';

        const field = (
            name: 'email' | 'password',
            label: string,
            autocomplete: string,
            value: () => string,
            changed: Action,
        ): Node => Field({
            label,
            name,
            children: [
                element('Input', {
                    props: {
                        class: `ui-input input-${name}`,
                        // `email` for the keyboard it brings up; `password` because the browser's own
                        // masking is the whole reason the operator console needed an override.
                        type: name,
                        name,
                        autocomplete,
                        value,
                        disabled: () => busy(),
                    },
                    intents: { change: { action: changed } },
                }),
            ],
        });

        const card = (): Node => element('Card', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    return `ui-sign-in${busy() ? ' busy' : ''}${error() !== null ? ' has-error' : ''}${extra ? ` ${extra}` : ''}`;
                },
                'data-state': () => (busy() ? 'busy' : (error() !== null ? 'error' : 'idle')),
            },
            children: [
                element('Stack', {
                    props: { class: 'ui-sign-in-header' },
                    children: [
                        element('Heading', {
                            props: { level: 3, class: 'ui-sign-in-title' },
                            children: [text(() => read(props.title) ?? DEFAULT_TITLE)],
                        }),
                        when(() => noteStr() !== '', () => element('Text', {
                            props: { class: 'ui-sign-in-note' },
                            children: [text(noteStr)],
                        })),
                    ],
                }),
                element('Form', {
                    props: {
                        class: 'ui-sign-in-form',
                        // The browser's own validation would stop the submit before anything here
                        // saw it, and report it in a tooltip the card knows nothing about.
                        novalidate: true,
                    },
                    intents: { commit: { action: submitted, preventDefault: true } },
                    children: [
                        field('email', 'Email', 'username', () => email(), emailChanged),
                        field('password', 'Password', 'current-password', () => password(), passwordChanged),
                        when(() => error() !== null, () => element('Row', {
                            props: { class: 'ui-sign-in-error', role: 'alert' },
                            children: [
                                element('Text', {
                                    props: { class: 'ui-sign-in-error-text' },
                                    children: [text(() => error() ?? '')],
                                }),
                            ],
                        })),
                        element('Row', {
                            props: { class: 'ui-sign-in-actions' },
                            children: [
                                element('Button', {
                                    props: {
                                        class: 'ui-button ui-button-primary ui-sign-in-submit',
                                        type: 'submit',
                                        disabled: () => busy(),
                                    },
                                    children: [text(() => (busy()
                                        ? (read(props.busyLabel) ?? 'Signing in…')
                                        : (read(props.submitLabel) ?? DEFAULT_TITLE)))],
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        });

        return when(
            () => props.auth.session() === null,
            card,
            () => element('Text', {
                props: { class: 'ui-sign-in-done', role: 'status' },
                children: [text(() => `Signed in as ${props.auth.session()?.displayName ?? ''}.`)],
            }),
        );
    };

    return { busy, error, submit, view };
}

export const SignIn: Composite<SignInProps, SignInState> = defineComposite<SignInProps, SignInState>(
    UI_SIGN_IN,
    'Email and password over the auth API: busy while signing in, the failure in place, gone once signed in.',
    (props) => createSignIn(props),
);
