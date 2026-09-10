/**
 * ui.Form composite.
 *
 * spec/ui/vocabulary.md:
 *   - ui.Form: editing a thing: owns the buffers, validity and dirty state.
 *   - not for: display — use ui.PropertyGrid.
 *   - fields are generated from the schema, never written by hand (rules §6).
 *
 * A composite has state. Created per use, renders itself. Zero DOM manipulation.
 */

import {
    computed, element, read, signal, text, when,
} from '@flybyme/mesh-web';
import type {
    Action, IntentValue, Json, Node, Schema,
} from '@flybyme/mesh-web';
import { ButtonRow } from '../components/buttonRow.js';
import { Field } from '../components/field.js';
import { Select } from '../components/select.js';
import {
    defineComposite, UI_FORM, type Composite, type FieldOverride,
    type FieldRenderContext, type FormProps, type FormState,
} from '../contract.js';
import {
    getProperties, humanizeLabel, isPropertyRequired, parseDefaultValue,
    type JsonSchema,
} from '../schema.js';

function extractJsonSchema<T>(schemaOrWrapper: JsonSchema | Schema<T> | undefined): JsonSchema | undefined {
    if (!schemaOrWrapper) return undefined;
    if ('json' in schemaOrWrapper && typeof schemaOrWrapper.json === 'object' && schemaOrWrapper.json !== null) {
        return schemaOrWrapper.json as JsonSchema;
    }
    return schemaOrWrapper as JsonSchema;
}

export function createForm<T extends Record<string, Json | undefined> = Record<string, Json | undefined>>(
    props: FormProps<T>,
): FormState<T> {
    const rawSchema = extractJsonSchema(props.schema);
    const properties = getProperties(rawSchema);

    // Initial values
    const initialRecord: Record<string, Json | undefined> = {};
    for (const [name, prop] of Object.entries(properties)) {
        const d = parseDefaultValue(prop);
        if (d !== undefined) initialRecord[name] = d;
    }
    if (props.initialValues) {
        Object.assign(initialRecord, props.initialValues);
    }

    const values = signal<T>({ ...initialRecord } as T);
    const errors = signal<Record<string, string | undefined>>({});
    const busy = signal<boolean>(false);

    // Track dirty state
    const dirty = computed<boolean>(() => {
        const current = values();
        for (const [k, v] of Object.entries(current)) {
            const initVal = initialRecord[k];
            if (v !== initVal) return true;
        }
        return false;
    });

    // Track validity
    const valid = computed<boolean>(() => {
        const currentErrors = errors();
        for (const err of Object.values(currentErrors)) {
            if (err) return false;
        }
        if (!rawSchema) return true;
        const currentValues = values();
        for (const name of Object.keys(properties)) {
            if (isPropertyRequired(rawSchema, name)) {
                const v = currentValues[name];
                if (v === undefined || v === null || v === '') return false;
            }
        }
        return true;
    });

    const setField = (name: keyof T, val: Json | undefined): void => {
        const next = { ...values(), [name]: val };
        values.set(next);

        // Clear error on edit
        const currentErrors = { ...errors() };
        if (currentErrors[name as string]) {
            delete currentErrors[name as string];
            errors.set(currentErrors);
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string | undefined> = {};
        if (rawSchema) {
            const currentValues = values();
            for (const [name, prop] of Object.entries(properties)) {
                const req = isPropertyRequired(rawSchema, name);
                const v = currentValues[name];
                if (req && (v === undefined || v === null || v === '')) {
                    newErrors[name] = `${prop.title ?? humanizeLabel(name)} is required`;
                }
            }
        }
        errors.set(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const submit = async (): Promise<void> => {
        if (!validate()) return;
        busy.set(true);
        try {
            await props.onSubmit?.(values());
        } finally {
            busy.set(false);
        }
    };

    const reset = (): void => {
        values.set({ ...initialRecord } as T);
        errors.set({});
    };

    /**
     * **One registration per key, however many times the form is drawn.**
     *
     * A form builds its fields inside `view()`, and `view()` runs again every time a `when` above it
     * flips — a dialog opening, a section expanding. A handler table has no eviction before the view
     * is disposed, so registering inside the loop would add an entry per field per repaint and grow
     * for as long as the screen is open. Keying by field name makes the second call free.
     *
     * The value is whatever the intent carried, and the renderer has already turned it into the
     * right shape: a boolean from a checkbox, a number from a number field, the text from anything
     * else, `undefined` from an empty number field. So one handler per field covers all five
     * widgets, where the ids this replaces needed five (`ui.Form:select:`, `:check:`, `:num:`,
     * `:text:`, `:input:`) and registered none of them.
     */
    const bound = new Map<string, Action>();
    const bind = (key: string, fn: (value?: IntentValue) => void): Action => {
        const existing = bound.get(key);
        if (existing !== undefined) return existing;
        const made = props.on(fn);
        bound.set(key, made);
        return made;
    };

    const bindField = (name: string): Action =>
        bind(`field:${name}`, (v) => setField(name as keyof T, v as Json | undefined));

    const view = (): Node => {
        const overrides = props.overrides ?? {};
        const fieldOverrides = overrides.fields ?? {};

        // Determine field ordering
        let propertyNames = Object.keys(properties);
        if (overrides.fieldOrder) {
            const orderMap = new Map<string, number>();
            overrides.fieldOrder.forEach((name, idx) => orderMap.set(name, idx));
            propertyNames.sort((a, b) => {
                const aIdx = orderMap.get(a) ?? 999;
                const bIdx = orderMap.get(b) ?? 999;
                return aIdx - bIdx;
            });
        }

        const fieldNodes: Node[] = [];

        for (const name of propertyNames) {
            const prop = properties[name] ?? {};
            const override = fieldOverrides[name] as FieldOverride<Json> | undefined;

            const isRequired = isPropertyRequired(rawSchema, name);
            const labelStr = override?.label !== undefined
                ? (typeof override.label === 'function' ? override.label() : override.label)
                : (prop.title ?? humanizeLabel(name));
            const hintStr = override?.hint !== undefined
                ? (typeof override.hint === 'function' ? override.hint() : override.hint)
                : prop.description;

            const isDisabled = (): boolean => {
                if (busy()) return true;
                if (read(props.disabled)) return true;
                if (override?.disabled !== undefined) return Boolean(read(override.disabled));
                return false;
            };

            const fieldValue = (): Json | undefined => (values() as Record<string, Json | undefined>)[name];
            const fieldError = (): string | undefined => errors()[name];

            const ctx: FieldRenderContext<Json> = {
                name,
                schema: prop,
                required: isRequired,
                label: labelStr,
                hint: hintStr,
                error: fieldError(),
                disabled: isDisabled(),
                value: fieldValue,
                onChange: (v) => setField(name as keyof T, v),

                defaultControl(): Node {
                    const placeholder = override?.placeholder !== undefined
                        ? (typeof override.placeholder === 'function' ? override.placeholder() : override.placeholder)
                        : undefined;

                    // 1. Enum / Select
                    if (prop.enum || override?.widget === 'select' || override?.options) {
                        const rawOpts = override?.options ?? prop.enum ?? [];
                        const opts = typeof rawOpts === 'function' ? rawOpts() : rawOpts;

                        return Select({
                            name,
                            // A Select is a row of buttons, so it registers one handler per option
                            // rather than binding `change` — see `ui.Select`.
                            on: props.on,
                            onSelect: (v) => setField(name as keyof T, v),
                            // A `Select` shows a string or a number; a field with no value yet is
                            // an empty selection, not the string "undefined".
                            value: (): string | number | undefined => {
                                const v = fieldValue();
                                return typeof v === 'string' || typeof v === 'number' ? v : undefined;
                            },
                            options: opts,
                            disabled: isDisabled,
                            placeholder,
                        });
                    }

                    // 2. Boolean -> checkbox
                    if (prop.type === 'boolean' || override?.widget === 'checkbox') {
                        return element('Input', {
                            props: {
                                class: `ui-input input-${name}`,
                                type: 'checkbox',
                                name,
                                checked: () => Boolean(fieldValue()),
                                disabled: isDisabled,
                            },
                            intents: { change: { action: bindField(name) } },
                        });
                    }

                    // 3. Number
                    if (prop.type === 'number' || prop.type === 'integer' || override?.widget === 'input' && (prop.type === 'number')) {
                        return element('Input', {
                            props: {
                                class: `ui-input input-${name}`,
                                type: 'number',
                                name,
                                value: () => {
                                    const v = fieldValue();
                                    return v !== undefined && v !== null ? String(v) : '';
                                },
                                disabled: isDisabled,
                                placeholder,
                            },
                            intents: { change: { action: bindField(name) } },
                        });
                    }

                    // 4. Textarea
                    if (override?.widget === 'textarea' || prop.format === 'textarea') {
                        return element('TextArea', {
                            props: {
                                class: `ui-textarea textarea-${name}`,
                                name,
                                value: () => {
                                    const v = fieldValue();
                                    return v !== undefined && v !== null ? String(v) : '';
                                },
                                disabled: isDisabled,
                                placeholder,
                            },
                            intents: { change: { action: bindField(name) } },
                        });
                    }

                    // 5. Default text input
                    return element('Input', {
                        props: {
                            class: `ui-input input-${name}`,
                            type: 'text',
                            name,
                            value: () => {
                                const v = fieldValue();
                                return v !== undefined && v !== null ? String(v) : '';
                            },
                            disabled: isDisabled,
                            placeholder,
                        },
                        intents: { change: { action: bindField(name) } },
                    });
                },

                defaultField(): Node {
                    return Field({
                        label: labelStr,
                        name,
                        required: isRequired,
                        hint: hintStr,
                        error: fieldError,
                        children: [
                            override?.renderControl ? override.renderControl(ctx) : ctx.defaultControl(),
                        ],
                    });
                },
            };

            const renderFieldNode = (): Node => {
                if (override?.renderField) {
                    return override.renderField(ctx);
                }
                return ctx.defaultField();
            };

            if (override?.hidden !== undefined) {
                const isHidden = typeof override.hidden === 'function' ? override.hidden : () => Boolean(override.hidden);
                fieldNodes.push(when(() => !isHidden(), renderFieldNode));
            } else {
                fieldNodes.push(renderFieldNode());
            }
        }

        // Actions row
        const hasActions = Boolean(props.onSubmit || props.onCancel);
        const defaultActions = (): Node => ButtonRow({
            align: 'end',
            gap: 8,
            class: 'ui-form-actions',
            children: [
                ...(props.onCancel ? [
                    element('Button', {
                        props: {
                            class: 'ui-button ui-button-cancel',
                            type: 'button',
                            disabled: () => busy() || Boolean(read(props.disabled)),
                        },
                        intents: {
                            activate: { action: bind('cancel', () => props.onCancel?.()) },
                        },
                        children: [text(() => read(props.cancelLabel) ?? 'Cancel')],
                    }),
                ] : []),
                ...(props.onSubmit ? [
                    element('Button', {
                        props: {
                            class: 'ui-button ui-button-primary ui-button-submit',
                            type: 'submit',
                            disabled: () => busy() || Boolean(read(props.disabled)),
                        },
                        intents: {
                            activate: { action: bind('submit', () => void submit()) },
                        },
                        children: [
                            text(() => {
                                if (busy()) return 'Saving…';
                                return read(props.submitLabel) ?? 'Save';
                            }),
                        ],
                    }),
                ] : []),
            ],
        });

        const actionsNode = hasActions
            ? (overrides.renderActions ? overrides.renderActions(defaultActions) : defaultActions())
            : undefined;

        const defaultFormFrame = (): Node => element('Form', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    const b = busy();
                    return `ui-form${b ? ' ui-form-busy' : ''}${extra ? ` ${extra}` : ''}`;
                },
            },
            ...(props.onSubmit ? {
                intents: {
                    // Enter in a field, which submits the form without going near the button. The
                    // same closure as `submit`, deliberately: two registrations would be two paths
                    // that can disagree, and `submit()` already refuses when the form is invalid.
                    commit: {
                        action: bind('submit', () => void submit()),
                        preventDefault: true,
                    },
                },
            } : {}),
            children: [
                ...fieldNodes,
                ...(props.children ?? []),
                ...(actionsNode ? [actionsNode] : []),
            ],
        });

        if (overrides.frame) {
            return overrides.frame(defaultFormFrame);
        }
        return defaultFormFrame();
    };

    return {
        values,
        errors,
        dirty,
        valid,
        busy,
        setField,
        validate,
        submit,
        reset,
        view,
    };
}

export const Form: Composite<FormProps<Record<string, Json | undefined>>, FormState<Record<string, Json | undefined>>> = defineComposite<
    FormProps<Record<string, Json | undefined>>,
    FormState<Record<string, Json | undefined>>
>(
    UI_FORM,
    'Editing a thing: owns the buffers, validity, dirty state, and generates fields from schema.',
    (props) => createForm(props),
);
