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
import { AVAILABLE, schema, type Availability, type BoundCommand } from '@flybyme/mesh-web';

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
            command: commandThat(() => refused, async () => { ran += 1; }),
        });

        await button.run();

        // Not merely disabled in the markup: the run path itself refuses, so a caller reaching it
        // any other way — a palette, a key binding, a tool call — is refused identically.
        expect(ran).toBe(0);
    });

    it('renders the reason in the label rather than hiding the control', () => {
        const button = createActionButton({ command: commandThat(() => refused) });
        const view = button.view();

        // states §4: the control stays on screen, disabled, and says what is missing. A control that
        // vanishes when refused teaches a person the feature does not exist, which is a worse lie
        // than a dead button.
        expect(keysOf(view)).toContain('data-refused');
        expect(textOf(view)).toContain('operator');
    });

    it('reports itself disabled while refused', () => {
        const button = createActionButton({ command: commandThat(() => refused) });
        const props = (button.view() as { props: Record<string, unknown> }).props;

        const disabled = props['disabled'];
        expect(typeof disabled === 'function' ? disabled() : disabled).toBe(true);
    });

    it('runs when the command is available', async () => {
        let ran = 0;
        const button = createActionButton({
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
            command: commandThat(() => AVAILABLE, async () => { ran += 1; }),
        });

        await button.run();
        await button.run();

        expect(ran).toBe(2);
    });

    it('reports the error and stops running when the command throws', async () => {
        const button = createActionButton({
            command: commandThat(() => AVAILABLE, async () => { throw new Error('the server said no'); }),
        });

        await button.run();

        expect(button.error()).toBe('the server said no');
        // The failure must clear `running`, or the control is dead for the rest of the session.
        expect(button.running()).toBe(false);
    });
});
