/**
 * ui.ActionCard composite.
 *
 * spec/ui/vocabulary.md:
 *   - ui.ActionCard: one command with inputs: the title, the consequence in a
 *     sentence, the fields, one primary control, and the result or error in place.
 *   - Fields generated from the command's input schema (rules §6).
 *   - Where schema genuinely under-describes an interaction, hand-write one field,
 *     not the whole form.
 *
 * A composite has state. Created per use, renders itself. Zero DOM manipulation.
 */

import { element, read, signal, text, when } from '@flybyme/mesh-web';
import type { Action, Json, Node } from '@flybyme/mesh-web';
import {
    defineComposite, formatRefusal, UI_ACTION_CARD,
    type ActionCardProps, type ActionCardState, type Composite,
} from '../contract.js';
import { humanizeLabel, type JsonSchema } from '../schema.js';
import { createForm } from './form.js';

function extractCommandJsonSchema(inputSchema: unknown): JsonSchema | undefined {
    if (!inputSchema || typeof inputSchema !== 'object') return undefined;
    if ('json' in inputSchema && typeof inputSchema.json === 'object' && inputSchema.json !== null) {
        return inputSchema.json as JsonSchema;
    }
    return inputSchema as JsonSchema;
}

export function createActionCard<I extends Record<string, Json | undefined> = Record<string, Json | undefined>, O = unknown>(
    props: ActionCardProps<I, O>,
): ActionCardState<I, O> {
    const command = props.command;
    const jsonSchema = extractCommandJsonSchema(command.input);

    const running = signal<boolean>(false);
    const error = signal<string | null>(null);
    const result = signal<O | undefined>(undefined);

    /**
     * The card's own registrar, handed straight down.
     *
     * A card is one command with inputs, so its fields belong to the same screen its button does —
     * there is nothing to gain from a second scope and one thing to lose, which is that the form's
     * handlers would then outlive or predecease the card's by a different rule.
     */
    const form = createForm<I>({
        on: props.on,
        schema: jsonSchema,
        initialValues: props.initialValues,
        overrides: props.overrides,
        disabled: () => running(),
    });

    const submit = async (): Promise<O | undefined> => {
        // Rule §3: cannot be fired twice while running
        if (running()) {
            return undefined;
        }

        // States §4: refused command does not dispatch
        const avail = command.available();
        if (!avail.can) {
            return undefined;
        }

        // Validate form inputs against schema
        if (!form.validate()) {
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
            const formValues = form.values();
            const res = await command.run(formValues);
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

    /** Registered once at construction rather than per repaint — see `ActionButton` for why. */
    const pressed: Action = props.on(() => void submit());

    const view = (): Node => {
        const titleStr = (): string => read(props.title) ?? humanizeLabel(command.action);
        const consequenceStr = (): string => read(props.consequence) ?? command.description;

        const getPrimaryLabel = (): string => {
            const avail = command.available();
            const base = read(props.primaryLabel) ?? humanizeLabel(command.action);
            if (running()) {
                return `${base}…`;
            }
            if (!avail.can) {
                const why = formatRefusal(avail);
                return `${base} — ${why}`;
            }
            return base;
        };

        const isPrimaryDisabled = (): boolean => {
            const avail = command.available();
            return !avail.can || running();
        };

        const primaryControlNode = element('Row', {
            props: { class: 'ui-action-card-actions' },
            children: [
                element('Button', {
                    props: {
                        class: () => {
                            const avail = command.available();
                            const isRun = running();
                            return `ui-button ui-button-primary ui-action-card-submit${isRun ? ' running' : ''}${!avail.can ? ' refused' : ''}`;
                        },
                        type: 'button',
                        disabled: isPrimaryDisabled,
                        'aria-disabled': () => String(isPrimaryDisabled()),
                        'data-action': command.action,
                    },
                    intents: { activate: { action: pressed } },
                    children: [text(getPrimaryLabel)],
                }),
            ],
        });

        const resultNode = (): Node => element('Row', {
            props: { class: 'ui-action-card-result', role: 'status' },
            children: [
                element('Text', {
                    props: { class: 'ui-action-card-result-text' },
                    children: [text('Action completed successfully.')],
                }),
            ],
        });

        const errorNode = (): Node => element('Row', {
            props: { class: 'ui-action-card-error', role: 'alert' },
            children: [
                element('Text', {
                    props: { class: 'ui-action-card-error-text' },
                    children: [text(() => error() ?? 'Action failed.')],
                }),
            ],
        });

        return element('Card', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    const isRun = running();
                    const hasErr = Boolean(error());
                    return `ui-action-card${isRun ? ' running' : ''}${hasErr ? ' has-error' : ''}${extra ? ` ${extra}` : ''}`;
                },
                'data-action': command.action,
            },
            children: [
                element('Stack', {
                    props: { class: 'ui-action-card-header' },
                    children: [
                        element('Heading', {
                            props: { level: 3, class: 'ui-action-card-title' },
                            children: [text(titleStr)],
                        }),
                        element('Text', {
                            props: { class: 'ui-action-card-consequence' },
                            children: [text(consequenceStr)],
                        }),
                    ],
                }),
                element('Stack', {
                    props: { class: 'ui-action-card-body' },
                    children: [
                        form.view(),
                        primaryControlNode,
                    ],
                }),
                when(() => result() !== undefined, resultNode),
                when(() => Boolean(error()), errorNode),
            ],
        });
    };

    return {
        form,
        running,
        error,
        result,
        submit,
        view,
    };
}

export const ActionCard: Composite<ActionCardProps<Record<string, Json | undefined>, unknown>, ActionCardState<Record<string, Json | undefined>, unknown>> = defineComposite<
    ActionCardProps<Record<string, Json | undefined>, unknown>,
    ActionCardState<Record<string, Json | undefined>, unknown>
>(
    UI_ACTION_CARD,
    'One command with inputs: title, consequence, fields from schema, one primary control, and result/error in place.',
    (props) => createActionCard(props),
);
