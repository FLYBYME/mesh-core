/**
 * ui.ActionButton composite.
 *
 * spec/ui/vocabulary.md:
 *   - ui.ActionButton: one command. Owns whether it is running; reads available() for refusal.
 *   - refused -> visible, disabled, labelled with why (states §4)
 *   - running -> says what it is doing, cannot be fired twice (rules §3)
 *   - confirmable -> asks first (rules §7)
 *
 * A composite has state. Created per use, renders itself. Zero DOM manipulation.
 */

import { element, read, signal, text } from '@flybyme/mesh-web';
import type { Action, Node } from '@flybyme/mesh-web';
import {
    formatRefusal,
    type ActionButtonProps, type ActionButtonState,
} from '../contract.js';
import { humanizeLabel } from '../schema.js';

export function createActionButton<I = void, O = void>(
    props: ActionButtonProps<I, O>,
): ActionButtonState<O> {
    const running = signal<boolean>(false);
    const error = signal<string | null>(null);
    const result = signal<O | undefined>(undefined);

    const command = props.command;

    const run = async (): Promise<O | undefined> => {
        // Rule §3: cannot be fired twice while running
        if (running()) {
            return undefined;
        }

        // States §4: refused command does not dispatch
        const avail = command.available();
        if (!avail.can) {
            return undefined;
        }

        // Rules §7: confirmable command asks first
        if (command.confirm) {
            if (props.confirmation) {
                const confirmed = await props.confirmation.ask({
                    message: command.confirm.message,
                    destructive: true,
                });
                if (!confirmed) {
                    return undefined;
                }
            }
        }

        running.set(true);
        error.set(null);

        try {
            const inputVal = typeof props.input === 'function'
                ? (props.input as () => I)()
                : (props.input as I);
            const res = await command.run(inputVal);
            result.set(res);
            props.onResult?.(res);
            return res;
        } catch (err) {
            const errObj = err instanceof Error ? err : new Error(String(err));
            error.set(errObj.message);
            props.onError?.(errObj);
            return undefined;
        } finally {
            running.set(false);
        }
    };

    /**
     * **Registered once, here, and not in `view()`.**
     *
     * `view()` runs again whenever a `when` branch above this composite flips, and a handler table
     * has no eviction — registering inside it would add an entry per repaint for the life of the
     * screen. `run` never changes, so one registration is all there is to make.
     *
     * The press is deliberately not awaited. An intent is *this happened*, not *this finished*; what
     * the run produces is already on `running`, `error` and `result` for the view to read.
     */
    const pressed: Action = props.on(() => void run());

    const view = (): Node => {
        const getLabel = (): string => {
            const avail = command.available();
            const base = read(props.label) ?? humanizeLabel(command.action);
            if (running()) {
                return read(props.runningLabel) ?? `${base}…`;
            }
            if (!avail.can) {
                const why = formatRefusal(avail);
                return `${base} — ${why}`;
            }
            return base;
        };

        const isDisabled = (): boolean => {
            const avail = command.available();
            return !avail.can || running();
        };

        return element('Button', {
            props: {
                class: () => {
                    const avail = command.available();
                    const isRun = running();
                    const extra = read(props.class);
                    return `ui-action-button${isRun ? ' running' : ''}${!avail.can ? ' refused' : ''}${extra ? ` ${extra}` : ''}`;
                },
                type: 'button',
                disabled: isDisabled,
                'aria-disabled': () => String(isDisabled()),
                'data-action': command.action,
                'data-running': () => String(running()),
                'data-refused': () => String(!command.available().can),
                title: () => {
                    const avail = command.available();
                    if (!avail.can) return formatRefusal(avail);
                    return command.description;
                },
            },
            intents: { activate: { action: pressed } },
            children: [text(getLabel)],
        });
    };

    return {
        running,
        error,
        result,
        run,
        view,
    };
}

export function ActionButton<I = void, O = void>(props: ActionButtonProps<I, O>): Node {
    return createActionButton(props).view();
}
