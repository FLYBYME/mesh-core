import {
    command,
    element,
    text,
    when,
    type Json,
    type Node as Described,
} from '@flybyme/mesh-web';

import {
    UI_BUTTON_ROW,
    UI_FIELD,
    UI_FORM,
    UI_SELECT,
    type FieldOverride,
    type FieldRenderContext,
    type RenderFormOptions,
    type SelectOption,
} from '../contract.js';
import {
    getProperties,
    humanizeLabel,
    isPropertyRequired,
} from '../schema.js';

export function renderForm(options: RenderFormOptions): Described {
    const properties = getProperties(options.schema);
    const overrides = options.overrides ?? {};
    const fieldOverrides = overrides.fields ?? {};

    // 1. Determine field ordering
    let keys = Object.keys(properties);

    if (Array.isArray(overrides.fieldOrder)) {
        const orderSet = new Set(overrides.fieldOrder);
        const ordered = overrides.fieldOrder.filter((k) => k in properties);
        const rest = keys.filter((k) => !orderSet.has(k));
        keys = [...ordered, ...rest];
    } else {
        keys.sort((a, b) => {
            const orderA = fieldOverrides[a]?.order;
            const orderB = fieldOverrides[b]?.order;
            if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
            if (orderA !== undefined) return -1;
            if (orderB !== undefined) return 1;
            return 0;
        });
    }

    // 2. Render each field
    const fieldNodes: Described[] = [];

    for (const name of keys) {
        const property = properties[name] ?? {};
        const fieldOverride = (fieldOverrides[name] ?? {}) as FieldOverride;

        const isRequired = isPropertyRequired(options.schema, name);
        const labelStr = fieldOverride.label !== undefined
            ? (typeof fieldOverride.label === 'function' ? fieldOverride.label() : fieldOverride.label)
            : (property.title ?? humanizeLabel(name));

        const hintStr = fieldOverride.hint !== undefined
            ? (typeof fieldOverride.hint === 'function' ? fieldOverride.hint() : fieldOverride.hint)
            : (property.description ?? '');

        const isDisabled = (): boolean => {
            if (typeof fieldOverride.disabled === 'function') return fieldOverride.disabled();
            if (typeof fieldOverride.disabled === 'boolean') return fieldOverride.disabled;
            return options.disabled ? options.disabled() : false;
        };

        const fieldVal = (): Json | undefined => options.values()[name];
        const errorVal = (): string => (options.errors ? (options.errors()[name] ?? '') : '');
        const onChangeAction = command(options.onFieldChange, name);

        // Build FieldRenderContext
        const ctx: FieldRenderContext = {
            name,
            schema: property,
            required: isRequired,
            label: labelStr,
            hint: hintStr || undefined,
            error: errorVal(),
            disabled: isDisabled(),
            value: fieldVal,
            onChangeAction,

            defaultControl(): Described {
                const placeholder = fieldOverride.placeholder
                    ? (typeof fieldOverride.placeholder === 'function' ? fieldOverride.placeholder() : fieldOverride.placeholder)
                    : undefined;

                // Select / Enum
                if (property.enum || fieldOverride.widget === 'select' || fieldOverride.options) {
                    const rawOpts = fieldOverride.options ?? property.enum ?? [];
                    const normalizedOpts = (): readonly (string | SelectOption)[] =>
                        (typeof rawOpts === 'function' ? rawOpts() : rawOpts);

                    return element(UI_SELECT, {
                        props: {
                            class: `input-${name}`,
                            name,
                            value: () => {
                                const v = fieldVal();
                                return v !== undefined && v !== null ? String(v) : '';
                            },
                            options: normalizedOpts,
                            disabled: isDisabled,
                            placeholder,
                        },
                        intents: { change: { action: onChangeAction } },
                    });
                }

                // Checkbox / Boolean
                if (property.type === 'boolean' || fieldOverride.widget === 'checkbox') {
                    return element('Input', {
                        props: {
                            class: `input-${name}`,
                            type: 'checkbox',
                            name,
                            checked: () => Boolean(fieldVal()),
                            disabled: isDisabled,
                        },
                        intents: { change: { action: onChangeAction } },
                    });
                }

                // Number
                if (property.type === 'number' || property.type === 'integer') {
                    return element('Input', {
                        props: {
                            class: `input-${name}`,
                            type: 'number',
                            name,
                            value: () => {
                                const v = fieldVal();
                                return v !== undefined && v !== null ? String(v) : '';
                            },
                            disabled: isDisabled,
                            placeholder,
                        },
                        intents: { change: { action: onChangeAction } },
                    });
                }

                // TextArea
                if (fieldOverride.widget === 'textarea') {
                    return element('TextArea', {
                        props: {
                            class: `input-${name}`,
                            name,
                            value: () => {
                                const v = fieldVal();
                                return v !== undefined && v !== null ? String(v) : '';
                            },
                            disabled: isDisabled,
                            placeholder,
                        },
                        intents: { change: { action: onChangeAction } },
                    });
                }

                // Default string input
                return element('Input', {
                    props: {
                        class: `input-${name}`,
                        type: 'text',
                        name,
                        value: () => {
                            const v = fieldVal();
                            return v !== undefined && v !== null ? String(v) : '';
                        },
                        disabled: isDisabled,
                        placeholder,
                    },
                    intents: { change: { action: onChangeAction } },
                });
            },

            defaultField(): Described {
                return element(UI_FIELD, {
                    props: {
                        class: `field-${name}`,
                        name,
                        label: () => (typeof fieldOverride.label === 'function' ? fieldOverride.label() : labelStr),
                        hint: () => (typeof fieldOverride.hint === 'function' ? fieldOverride.hint() : hintStr),
                        error: errorVal,
                        required: isRequired,
                    },
                    children: [
                        fieldOverride.renderControl ? fieldOverride.renderControl(ctx) : ctx.defaultControl(),
                    ],
                });
            },
        };

        const renderFieldNode = (): Described => {
            if (fieldOverride.renderField) {
                return fieldOverride.renderField(ctx);
            }
            return ctx.defaultField();
        };

        if (fieldOverride.hidden !== undefined) {
            const isHidden = typeof fieldOverride.hidden === 'function'
                ? fieldOverride.hidden
                : () => Boolean(fieldOverride.hidden);

            fieldNodes.push(when(() => !isHidden(), renderFieldNode));
        } else {
            fieldNodes.push(renderFieldNode());
        }
    }

    // 3. Actions row
    const hasActions = Boolean(options.onSubmit || options.onCancel);
    const defaultActions = (): Described => element(UI_BUTTON_ROW, {
        props: { class: 'form-actions', align: 'end', gap: 8 },
        children: [
            ...(options.onCancel ? [
                element('Button', {
                    props: {
                        class: 'ui-button ui-button-cancel btn-cancel',
                        type: 'button',
                        disabled: () => Boolean(options.busy?.() || options.disabled?.()),
                    },
                    intents: { activate: { action: command(options.onCancel) } },
                    children: [text(() => (typeof options.cancelLabel === 'function' ? options.cancelLabel() : (options.cancelLabel ?? 'Cancel')))],
                }),
            ] : []),
            ...(options.onSubmit ? [
                element('Button', {
                    props: {
                        class: 'ui-button ui-button-primary ui-button-submit btn-submit',
                        type: 'submit',
                        disabled: () => Boolean(options.busy?.() || options.disabled?.()),
                    },
                    intents: { activate: { action: command(options.onSubmit) } },
                    children: [text(() => (options.busy?.()
                        ? 'Saving...'
                        : (typeof options.submitLabel === 'function' ? options.submitLabel() : options.submitLabel ?? 'Save')))],
                }),
            ] : []),
        ],
    });

    const actionsNode = hasActions
        ? (overrides.renderActions ? overrides.renderActions(defaultActions) : defaultActions())
        : undefined;

    // 4. Wrap in Form frame
    const defaultFormFrame = (): Described => element(UI_FORM, {
        props: {
            class: options.class ?? 'ui-schema-form',
        },
        ...(options.onSubmit ? { intents: { commit: { action: command(options.onSubmit), preventDefault: true } } } : {}),
        children: [
            ...fieldNodes,
            ...(actionsNode ? [actionsNode] : []),
        ],
    });

    if (overrides.frame) {
        return overrides.frame(defaultFormFrame);
    }
    return defaultFormFrame();
}
