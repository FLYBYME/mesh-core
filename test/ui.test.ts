/**
 * **The four claims `spec/ui/vocabulary.md` makes, asserted.**
 *
 * The dispatch that wrote `src/ui` ran out of quota before it could write these, so the code arrived
 * unverified. These are the evidence its own prompt asked for, and each maps to a rule that has
 * already been broken once in this codebase:
 *
 * 1. No component calls `document.createElement`. The old `entityList.ts` was 211 lines of
 *    imperative DOM for a sidebar with a heading and three states.
 * 2. A component renders with no DOM at all. If it cannot, it is a composite or it is wrong.
 * 3. An `ActionButton` given a refused command renders disabled **with the reason** and does not
 *    dispatch — states §4, and the gap the roadmap called U3.
 * 4. A running command cannot be fired twice — rules §3, and `builder.release_repo` takes forty
 *    seconds.
 */

import { describe, expect, it } from 'vitest';
import {
    AVAILABLE, createHandlerTable, schema,
    type Action, type Availability, type BoundCommand, type Node,
} from '@flybyme/mesh-web';

import { createActionButton } from '../src/ui/composites/actionButton.js';
import { EntityList } from '../src/ui/components/entityList.js';
import { PropertyGrid } from '../src/ui/components/propertyGrid.js';

// ---------------------------------------------------------------------------- helpers

/** A command that answers however the test needs, so refusal and success are one line apart. */
const commandThat = (
    available: () => Availability,
    run: (input: unknown) => Promise<unknown> = async () => undefined,
): BoundCommand<unknown, unknown> => ({
    action: 'thing.rename',
    description: 'Gives the thing a different name.',
    input: schema<unknown>(),
    output: schema<unknown>(),
    available,
    run,
});

/**
 * **The real handler table, not a stub.**
 *
 * A composite now takes `on` — the right to register a handler — and these tests hand it the same
 * implementation a mounted view gets. A stub returning a made-up id would agree with exactly the bug
 * this replaces: `ActionButton` used to write `id: \`ui.ActionButton:${command.action}\`` and nothing
 * anywhere registered it, so the button was inert while every test here passed.
 *
 * One table for the file. Handlers accumulate and are never disposed, which is what a table is for
 * in a test: `press` below can invoke any id any of these views produced.
 */
const wiring = createHandlerTable('ui.test');

/**
 * Press a description, rather than call the thing behind it.
 *
 * Reads the `activate` action off the node and invokes it through the table — the same two steps the
 * renderer's dispatcher takes when a person clicks. `invoke` answers false for an id nobody
 * registered, so an inert control fails here instead of being reported as a passing test.
 */
const press = (node: Node): boolean => {
    const intents = (node as { intents?: { activate?: { action: Action } } }).intents;
    const action = intents?.activate?.action;
    if (action === undefined || action.kind !== 'handler') return false;
    return wiring.invoke(action.id);
};

// The source-scanning half of the evidence — no `document.createElement`, no element-keyed WeakMap
// — is in `ui.source.test.ts`, which runs under node. It cannot live here: these tests run in a
// real browser, where `node:fs` is externalised and reading the source is impossible.

// ---------------------------------------------------------------------------- 2. headless

/**
 * Read a description tree as text.
 *
 * A description carries most of its content in **functions** — `Reactive<T>` is `T | (() => T)`, so
 * a title, a label and an attribute are all callable. `JSON.stringify` silently drops every one of
 * them, which makes it exactly the wrong tool here and a quiet source of tests that pass on an empty
 * screen. This calls them.
 */
const textOf = (node: unknown): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'function') return textOf((node as () => unknown)());
    if (typeof node !== 'object') return String(node);

    const n = node as Record<string, unknown>;
    if (Array.isArray(node)) return node.map(textOf).join(' ');

    // A `when` keeps its subtree behind `then`/`otherwise` rather than in `children`, so a reader
    // that only walks `children` sees a list with no header and reports it as empty. Both branches
    // are read here: a test asking "does this ever say X" should not depend on which way the
    // condition happens to fall.
    if (n['kind'] === 'when') return [n['then'], n['otherwise']].map(textOf).join(' ');

    return [n['value'], n['component'], n['props'], n['children']].map(textOf).join(' ');
};

const keysOf = (node: unknown): readonly string[] => {
    if (node === null || typeof node !== 'object') return [];
    const n = node as Record<string, unknown>;
    const own = n['props'] === undefined ? [] : Object.keys(n['props'] as object);
    const kids = Array.isArray(n['children']) ? n['children'].flatMap(keysOf) : [];
    return [...own, ...kids];
};

describe('a component renders without a DOM', () => {
    it('returns a description tree, not an element', () => {
        // Children arrive through props, not as a second argument: a component is `(props) => Node`
        // and nothing else, which is what lets `defineComponent` describe every one of them the
        // same way.
        const node = EntityList({ title: 'Parts', status: 'ready', children: [] }) as { kind: string };

        // No document was needed to produce this. That is the whole practical argument for the
        // component/composite split, and the thing the old `ComponentDefinition` could not do.
        expect(node.kind).toBe('element');
        expect(textOf(node)).toContain('Parts');
    });

    it('renders each of the four list states without one of them being a special case', () => {
        for (const status of ['loading', 'ready', 'empty', 'error'] as const) {
            const node = EntityList({ title: 'Parts', status, children: [] }) as { kind: string };
            expect(node.kind).toBe('element');
        }
    });

    it('renders label and value pairs', () => {
        const node = PropertyGrid({ items: [{ label: 'Host', value: 'console.localhost' }] });
        expect(textOf(node)).toContain('console.localhost');
    });
});

// ---------------------------------------------------------------------------- 3. refused

describe('a refused command is visible, disabled, and says why', () => {
    const refused: Availability = { can: false, why: 'needs_operator' };

    it('does not dispatch', async () => {
        let ran = 0;
        const button = createActionButton({
            on: wiring.on,
            command: commandThat(() => refused, async () => { ran += 1; }),
        });

        await button.run();

        // Not merely disabled in the markup: the run path itself refuses, so a caller reaching it
        // any other way — a palette, a key binding, a tool call — is refused identically.
        expect(ran).toBe(0);
    });

    it('renders the reason in the label rather than hiding the control', () => {
        const button = createActionButton({
            on: wiring.on,
            command: commandThat(() => refused),
        });
        const view = button.view();

        // states §4: the control stays on screen, disabled, and says what is missing. A control that
        // vanishes when refused teaches a person the feature does not exist, which is a worse lie
        // than a dead button.
        expect(keysOf(view)).toContain('data-refused');
        expect(textOf(view)).toContain('operator');
    });

    it('reports itself disabled while refused', () => {
        const button = createActionButton({
            on: wiring.on,
            command: commandThat(() => refused),
        });
        const props = (button.view() as { props: Record<string, unknown> }).props;

        const disabled = props['disabled'];
        expect(typeof disabled === 'function' ? disabled() : disabled).toBe(true);
    });

    it('runs when the command is available', async () => {
        let ran = 0;
        const button = createActionButton({
            on: wiring.on,
            command: commandThat(() => AVAILABLE, async () => { ran += 1; }),
        });

        await button.run();
        expect(ran).toBe(1);
    });
});

// ---------------------------------------------------------------------------- 4. busy

describe('a running command cannot be fired twice', () => {
    it('ignores a second press while the first is in flight', async () => {
        let ran = 0;
        let release = (): void => {};
        const held = new Promise<void>((resolve) => { release = resolve; });

        const button = createActionButton({
            on: wiring.on,
            command: commandThat(() => AVAILABLE, async () => {
                ran += 1;
                await held;
            }),
        });

        const first = button.run();
        const second = button.run();   // while the first is still awaiting
        release();
        await Promise.all([first, second]);

        // rules §3. `builder.release_repo` takes forty seconds and emits N partReleased events;
        // firing it twice is not a cosmetic problem.
        expect(ran).toBe(1);
    });

    it('is runnable again once the first has finished', async () => {
        let ran = 0;
        const button = createActionButton({
            on: wiring.on,
            command: commandThat(() => AVAILABLE, async () => { ran += 1; }),
        });

        await button.run();
        await button.run();

        expect(ran).toBe(2);
    });

    it('reports the error and stops running when the command throws', async () => {
        const button = createActionButton({
            on: wiring.on,
            command: commandThat(() => AVAILABLE, async () => { throw new Error('the server said no'); }),
        });

        await button.run();

        expect(button.error()).toBe('the server said no');
        // The failure must clear `running`, or the control is dead for the rest of the session.
        expect(button.running()).toBe(false);
    });
});

// ---------------------------------------------------------------------------- 5. pressed

/**
 * **The claim every test above assumed and none of them made: pressing it runs the command.**
 *
 * Each test in this file calls `button.run()`. That is the composite's own method, and it worked
 * perfectly for weeks while the control on screen did nothing at all, because the description's
 * `activate` named a handler id that nothing had registered. A test that calls a piece never presses
 * it, and the gap between the two is where A8.10 lived.
 *
 * These go through the action instead: read what the description declares, invoke it on the table
 * the button registered against. Nothing here knows `run` exists.
 */
describe('pressing the button is what runs the command', () => {
    it('dispatches through the handler the composite registered', async () => {
        let ran = 0;
        const button = createActionButton({
            on: wiring.on,
            command: commandThat(() => AVAILABLE, async () => { ran += 1; }),
        });

        // The id is resolvable. Before this change it was `ui.ActionButton:thing.rename`, which no
        // table has ever contained, and `invoke` answered false — silently, because an unresolved
        // handler is a stale event rather than a crash.
        expect(press(button.view())).toBe(true);

        // The press does not await the run — an intent is *this happened*, not *this finished* — so
        // the assertion has to let the microtask queue drain first.
        await Promise.resolve();
        expect(ran).toBe(1);
    });

    it('registers once however many times the view is drawn', () => {
        const button = createActionButton({
            on: wiring.on,
            command: commandThat(() => AVAILABLE),
        });

        const first = button.view();
        const second = button.view();

        // A handler table has no eviction before the view is disposed, so registering inside
        // `view()` would leak an entry per repaint — and a `when` above a composite repaints it
        // every time the condition flips. Registration belongs at construction.
        const idOf = (n: Node): string => {
            const action = (n as { intents: { activate: { action: Action } } }).intents.activate.action;
            return action.kind === 'handler' ? action.id : '';
        };
        expect(idOf(first)).toBe(idOf(second));
    });

    it('a refused command does not dispatch when pressed either', async () => {
        let ran = 0;
        const button = createActionButton({
            on: wiring.on,
            command: commandThat(() => ({ can: false, why: 'needs_operator' }), async () => { ran += 1; }),
        });

        // The handler resolves — the button is wired — and the run path refuses. Both halves matter:
        // a control that is inert and a control that is refused look identical from outside and are
        // completely different bugs.
        expect(press(button.view())).toBe(true);

        await Promise.resolve();
        expect(ran).toBe(0);
    });
});

// ---------------------------------------------------------------------------- 6. action card

import { createActionCard } from '../src/ui/composites/actionCard.js';

import type { Json } from '@flybyme/mesh-web';

const formCommandThat = (
    available: () => Availability,
    run: (input: Record<string, Json | undefined>) => Promise<unknown> = async () => undefined,
): BoundCommand<Record<string, Json | undefined>, unknown> => ({
    action: 'thing.rename',
    description: 'Gives the thing a different name.',
    input: schema<Record<string, Json | undefined>>(),
    output: schema<unknown>(),
    available,
    run,
});

describe('ActionCard secondary action', () => {
    it('dismisses without running the primary action', async () => {
        let ran = 0;
        let dismissed = 0;
        const card = createActionCard({
            on: wiring.on,
            command: formCommandThat(() => AVAILABLE, async () => { ran += 1; }),
            onSecondary: () => { dismissed += 1; },
        });

        const view = card.view() as any;
        
        // Find the secondary button
        const bodyStack = view.children[1];
        const actionsRow = bodyStack.children[1];
        const secondaryBtn = actionsRow.children[1];
        expect(secondaryBtn).toBeDefined();

        press(secondaryBtn);

        await Promise.resolve();

        expect(dismissed).toBe(1);
        expect(ran).toBe(0);
    });
});
