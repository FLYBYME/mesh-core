/**
 * **`ui.SignIn`, pressed.**
 *
 * Mounted beside the real `AuthExtension`, with `fetch` replaced by a fake identity — the same
 * approach as `auth.test.ts`. So what is under test is the whole path a person takes: type into the
 * fields, click the control, `AuthApi.signIn` makes its two requests, the session lands, and the
 * screen changes. No test here calls `submit()`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart, type MountedSite } from '@flybyme/mesh-web/testing';
import {
    consumes, element, needs,
    type Application, type AuthApi, type Context, type PartApi, type ViewContext, type ViewDecl,
} from '@flybyme/mesh-web';

import { AUTH, AuthExtension } from '../src/auth/index.js';
import { SignIn } from '../src/ui/index.js';

// ---------------------------------------------------------------------------- a fake identity

const PASSWORD = 'correct-horse';
const TOKEN = 'ticket-1';

/** Every credential that reached the ticket endpoint. One press should be one entry. */
let tickets: unknown[] = [];
/** When set, the ticket endpoint waits for it — which is how a test sees the busy state. */
let hold: Promise<void> | undefined;
const realFetch = globalThis.fetch;

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
});

beforeEach(() => {
    tickets = [];
    hold = undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const body: unknown = init?.body === undefined ? undefined : JSON.parse(String(init.body));

        if (url.endsWith('/api/identity/ticket')) {
            tickets.push(body);
            if (hold !== undefined) await hold;
            return (body as { password?: string }).password === PASSWORD
                ? json(200, { token: TOKEN, userId: 'u-1', expiresAt: 9e12 })
                : json(401, {});
        }

        if (url.endsWith('/api/identity/whoami')) {
            return new Headers(init?.headers).get('authorization') === `Bearer ${TOKEN}`
                ? json(200, { userId: 'u-1', displayName: 'Alice', roles: ['authenticated'] })
                : json(401, {});
        }

        return json(200, []);
    }) as typeof fetch;
});

afterEach(() => {
    globalThis.fetch = realFetch;
    cleanup();
});

// ---------------------------------------------------------------------------- an app with a sign-in

const APP_NEEDS = needs('windows');
const APP_CONSUMES = consumes(AUTH);

interface Internal {
    readonly auth: AuthApi;
}

/**
 * The whole of what an app now writes to have a sign-in: one call in `render`. That is the claim
 * being tested as much as any behaviour — if this app needed more, the composite would not be done.
 */
class SignInApp implements Application<typeof APP_NEEDS, typeof APP_CONSUMES, undefined, PartApi, Internal> {
    readonly needs = APP_NEEDS;
    readonly consumes = APP_CONSUMES;
    readonly session = 'optional' as const;

    readonly views: readonly ViewDecl<Record<string, never>, Internal, PartApi>[] = [
        {
            id: 'main',
            title: 'Sign in',
            instances: 'one',
            window: { defaultSize: { width: 420, height: 360 }, minSize: { width: 200, height: 150 } },
            render: (vx: ViewContext<Record<string, never>, Internal, PartApi>) => element('Stack', {
                children: [
                    SignIn({ on: vx.on, auth: vx.internal.auth, note: 'Everything here is gated.' }).view(),
                ],
            }),
        },
    ];

    async start(cx: Context<typeof APP_NEEDS, typeof APP_CONSUMES, PartApi>): Promise<{ internal: Internal }> {
        cx.windows.open({ view: 'main' });
        return { internal: { auth: cx.use(AUTH) } };
    }
}

const boot = async (): Promise<MountedSite> => await mountPart({
    parts: [
        { id: 'auth', contribution: AuthExtension },
        { id: 'signin', contribution: new SignInApp() },
    ],
    api: 'http://identity.test',
});

// ---------------------------------------------------------------------------- what a person does

const find = <T extends Element>(site: MountedSite, selector: string): T | null =>
    site.root.querySelector<T>(selector);

const button = (site: MountedSite): HTMLButtonElement | null =>
    find<HTMLButtonElement>(site, 'button.ui-sign-in-submit');

/** Type into a field the way a browser reports it: set the value, then `input`. */
const type = (site: MountedSite, name: 'email' | 'password', value: string): void => {
    const field = find<HTMLInputElement>(site, `input[name="${name}"]`);
    expect(field).not.toBeNull();
    field!.value = value;
    field!.dispatchEvent(new Event('input', { bubbles: true }));
};

/** Let the press, both requests and the repaint land. */
const settle = async (): Promise<void> => {
    for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

/** Wait for something a person would see, rather than guessing how many ticks it takes. */
const until = async (condition: () => boolean, what: string): Promise<void> => {
    const deadline = Date.now() + 2000;
    while (!condition()) {
        if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
};

const alertText = (site: MountedSite): string => find(site, '.ui-sign-in [role="alert"]')?.textContent ?? '';

describe('ui.SignIn', () => {
    it('renders idle: an email field, a password field that masks, and one enabled control', async () => {
        const site = await boot();
        await settle();

        const email = find<HTMLInputElement>(site, 'input[name="email"]');
        const password = find<HTMLInputElement>(site, 'input[name="password"]');
        expect(email).not.toBeNull();
        expect(password?.type).toBe('password');
        expect(button(site)?.disabled).toBe(false);
        expect(button(site)?.textContent).toBe('Sign in');
        expect(find(site, '.ui-sign-in')?.getAttribute('data-state')).toBe('idle');
        expect(alertText(site)).toBe('');

        site.dispose();
    });

    it('renders a wrong password as an error on the card and keeps the form', async () => {
        const site = await boot();
        await settle();

        type(site, 'email', 'alice@example.com');
        type(site, 'password', 'wrong');
        button(site)?.click();

        await until(() => alertText(site) !== '', 'the error');

        expect(alertText(site)).toContain('Those credentials are not valid.');
        expect(find(site, '.ui-sign-in')?.getAttribute('data-state')).toBe('error');
        // The form stayed, with what was typed, and can be pressed again.
        expect(find<HTMLInputElement>(site, 'input[name="email"]')?.value).toBe('alice@example.com');
        expect(find(site, 'input[name="password"]')).not.toBeNull();
        expect(button(site)?.disabled).toBe(false);
        expect(tickets).toHaveLength(1);

        site.dispose();
    });

    it('signs in once with the right password, and the form goes away', async () => {
        const site = await boot();
        await settle();

        type(site, 'email', 'alice@example.com');
        type(site, 'password', PASSWORD);
        button(site)?.click();

        await until(() => find(site, 'input[name="password"]') === null, 'the form to go');

        expect(tickets).toEqual([{ email: 'alice@example.com', password: PASSWORD }]);
        expect(find(site, 'input[name="email"]')).toBeNull();
        expect(find(site, '.ui-sign-in-done')?.textContent).toBe('Signed in as Alice.');

        site.dispose();
    });

    /**
     * **Busy, and a press while busy is not a second sign-in.**
     *
     * Two clicks — what a person does when nothing seems to happen — and then a form submit, which is
     * the Enter path and does not go through the disabled control. The disabled button stops the
     * clicks; only the composite's own guard stops the submit, so this fails if either is removed.
     */
    it('shows busy while signing in and does not submit twice', async () => {
        const site = await boot();
        await settle();

        let release: () => void = () => undefined;
        hold = new Promise<void>((resolve) => { release = resolve; });

        type(site, 'email', 'alice@example.com');
        type(site, 'password', PASSWORD);
        button(site)?.click();
        await settle();

        expect(button(site)?.disabled).toBe(true);
        expect(button(site)?.textContent).toBe('Signing in…');
        expect(find<HTMLInputElement>(site, 'input[name="password"]')?.disabled).toBe(true);
        expect(find(site, '.ui-sign-in')?.getAttribute('data-state')).toBe('busy');

        button(site)?.click();
        button(site)?.click();
        find<HTMLFormElement>(site, 'form.ui-sign-in-form')?.requestSubmit();
        await settle();

        expect(tickets).toHaveLength(1);

        release();
        await until(() => find(site, 'input[name="password"]') === null, 'the form to go');
        expect(tickets).toHaveLength(1);

        site.dispose();
    });

    it('asks for both fields rather than sending an empty one', async () => {
        const site = await boot();
        await settle();

        button(site)?.click();
        await settle();

        expect(alertText(site)).toBe('Enter your email and password.');
        expect(tickets).toHaveLength(0);

        site.dispose();
    });
});
