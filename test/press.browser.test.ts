/**
 * **Clicking it.**
 *
 * Every other test of `ui.ActionButton` calls `button.run()`, and `run()` was never broken. What was
 * broken is the only thing a person can actually do: the description's `activate` named
 * `ui.ActionButton:<action>`, a handler id nothing had registered, and an unresolved handler is *a
 * stale event, not a crash*. So the control rendered, enabled, labelled correctly, and did nothing —
 * for weeks, with a full green suite.
 *
 * `test/identity.browser.test.ts` even clicks a button already. It clicks a **refused** one and
 * asserts nothing happened, which passes whether the button is wired or not. That is the shape of
 * the hole: the assertion was true for the wrong reason.
 *
 * This file mounts a real application in a real browser, finds the button by what a person would see
 * it as, and dispatches a real click. No test here knows that `run` exists.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';
import {
    AVAILABLE, element, needs, schema, text,
    type Application, type BoundCommand, type Context, type PartApi, type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';

import { ActionButton, ActionCard } from '../src/ui/index.js';

afterEach(() => { cleanup(); });

const APP_NEEDS = needs('windows');

/** What the test wants to know: was the command's own `run` reached, and with what. */
interface Pressed {
    readonly runs: string[];
}

/**
 * One command, one button, one card. Nothing else — no provider, no state capability, no models.
 *
 * A composite takes its registrar as a prop, so the whole of what is under test is the one line in
 * `render` that passes `vx.on`. That is deliberately the only wiring in this file: if a screen needed
 * more than that to make a control work, the fix would not be finished.
 */
class PressApp implements Application<typeof APP_NEEDS, readonly [], undefined, PartApi, Pressed> {
    readonly needs = APP_NEEDS;

    constructor(private readonly runs: string[]) {}

    readonly views: readonly ViewDecl<Record<string, never>, Pressed, PartApi>[] = [
        {
            id: 'main',
            title: 'Press',
            instances: 'one',
            window: { defaultSize: { width: 400, height: 300 }, minSize: { width: 200, height: 150 } },
            render: (vx: ViewContext<Record<string, never>, Pressed, PartApi>) => element('Stack', {
                children: [
                    ActionButton({
                        on: vx.on,
                        command: this.command('thing.rename'),
                        label: 'Rename',
                        input: 'from the button',
                    }).view(),
                    ActionCard({
                        on: vx.on,
                        command: this.card,
                        title: 'A card',
                        primaryLabel: 'Do it',
                    }).view(),
                    element('Text', { children: [text(() => `runs:${String(vx.internal.runs.length)}`)] }),
                ],
            }),
        },
    ];

    private command(action: string): BoundCommand<string, void> {
        return {
            action,
            description: 'Gives the thing a different name.',
            input: schema<string>(),
            output: schema<void>(),
            available: () => AVAILABLE,
            run: async (input: string) => { this.runs.push(`${action}:${input}`); },
        };
    }

    /**
     * A card runs its command with the **form's** values, so its input is an object — and the one
     * property is what makes the card's other inert half testable: a generated field's `change`
     * intent also named an id nobody registered (`ui.Form:input:reason`), so typing into a card
     * changed nothing and it submitted whatever the schema defaulted to.
     */
    private readonly card: BoundCommand<{ reason?: string; kind?: string }, void> = {
        action: 'thing.archive',
        description: 'Puts the thing away.',
        input: schema<{ reason?: string; kind?: string }>({
            type: 'object',
            properties: {
                reason: { type: 'string', title: 'Reason' },
                // An enum, so the form generates a `ui.Select` — a row of buttons rather than a
                // native control, which is why its press could not be an intent on the wrapper.
                kind: { type: 'string', title: 'Kind', enum: ['soft', 'hard'] },
            },
        }),
        output: schema<void>(),
        available: () => AVAILABLE,
        run: async (input) => {
            this.runs.push(`thing.archive:${input.reason ?? ''}:${input.kind ?? ''}`);
        },
    };

    async start(cx: Context<typeof APP_NEEDS, readonly [], PartApi>): Promise<{ internal: Pressed }> {
        // An application opens its own window. A composition's `open` entry with no `views` starts
        // the process and opens nothing, which is a running app and a blank page.
        cx.windows.open({ view: 'main' });
        return { internal: { runs: this.runs } };
    }
}

const boot = async (runs: string[]) => await mountPart({
    parts: [{ id: 'press', contribution: new PressApp(runs) }],
});

/** Let the click's handler, the command's promise and the resulting repaint all land. */
const settle = async (): Promise<void> => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('a composite runs its command when a person presses it', () => {
    it('runs the command on a click, with the input the view supplied', async () => {
        const runs: string[] = [];
        const site = await boot(runs);

        const button = site.root.querySelector<HTMLButtonElement>('button[data-action="thing.rename"]');
        expect(button).not.toBeNull();
        expect(button?.disabled).toBe(false);
        expect(button?.textContent).toContain('Rename');

        button?.click();
        await settle();

        // The whole of stage 2 in one assertion. Before it: `[]`.
        expect(runs).toEqual(['thing.rename:from the button']);

        site.dispose();
    });

    it('runs an ActionCard from its primary control', async () => {
        const runs: string[] = [];
        const site = await boot(runs);

        const primary = site.root.querySelector<HTMLButtonElement>('.ui-action-card-submit');
        expect(primary).not.toBeNull();

        primary?.click();
        await settle();

        expect(runs).toEqual(['thing.archive::']);

        site.dispose();
    });

    /**
     * **Typing into a generated field reaches the command.**
     *
     * The field is generated from the command's own input schema — nobody wrote it — and its
     * `change` intent used to name `ui.Form:input:reason`, which nothing registered. So a card
     * accepted text, showed it (the DOM holds it), and submitted the schema's default. That is worse
     * than a dead control: it is a form that lies about what it is about to send.
     *
     * `input` and not `change` on the event, because a `change` on a text field fires on blur and a
     * form whose button is clicked before blurring would submit the previous value.
     */
    it('sends what was typed into a generated field', async () => {
        const runs: string[] = [];
        const site = await boot(runs);

        const field = site.root.querySelector<HTMLInputElement>('input.input-reason');
        expect(field).not.toBeNull();

        field!.value = 'tidying up';
        field!.dispatchEvent(new Event('input', { bubbles: true }));
        await settle();

        site.root.querySelector<HTMLButtonElement>('.ui-action-card-submit')?.click();
        await settle();

        expect(runs).toEqual(['thing.archive:tidying up:']);

        site.dispose();
    });

    /**
     * **Choosing an option, which was inert for a second reason on top of the first.**
     *
     * `ui.Select` is a row of buttons, and its `change` intent was spread onto the wrapping `Row`
     * while the buttons carried none. `change` is bound to the DOM `input` event, which a `div` does
     * not emit and has no value to read — so even a registered handler there could never have fired.
     * The press belongs on the option, because the option is what a person clicks.
     */
    it('sends the option that was chosen', async () => {
        const runs: string[] = [];
        const site = await boot(runs);

        const hard = site.root.querySelector<HTMLButtonElement>('.ui-select-option[data-value="hard"]');
        expect(hard).not.toBeNull();
        expect(hard?.dataset['selected']).toBe('false');

        hard?.click();
        await settle();

        // Selected, and visibly so: the option reads the form's value back, so a press that did not
        // reach the form would leave every option unselected.
        expect(hard?.dataset['selected']).toBe('true');

        site.root.querySelector<HTMLButtonElement>('.ui-action-card-submit')?.click();
        await settle();

        expect(runs).toEqual(['thing.archive::hard']);

        site.dispose();
    });

    /**
     * **Twice is once, through the DOM this time.**
     *
     * `rules §3` is already covered by a test that calls `run()` twice. This is the same claim from
     * the outside, and it is the one that matters: a person who does not see anything happen clicks
     * again, and `builder.release_part` takes forty seconds.
     */
    it('ignores a second click while the first is still running', async () => {
        const runs: string[] = [];
        const site = await boot(runs);

        const button = site.root.querySelector<HTMLButtonElement>('button[data-action="thing.rename"]');
        button?.click();
        button?.click();
        await settle();

        expect(runs).toHaveLength(1);

        site.dispose();
    });
});
