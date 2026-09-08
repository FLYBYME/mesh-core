/**
 * ui.Field and ui.Label components.
 *
 * spec/ui/vocabulary.md:
 *   - ui.Field: one labelled input in a form.
 *   - ui.Label: the label of a field.
 *
 * A component has no logic. Props in, description out. Zero DOM manipulation.
 */

import { element, read, text, when } from '@flybyme/mesh-web';
import type { Node } from '@flybyme/mesh-web';
import {
    defineComponent, UI_FIELD, UI_LABEL,
    type Component, type FieldProps, type LabelProps,
} from '../contract.js';

export const Label: Component<LabelProps> = defineComponent<LabelProps>(
    UI_LABEL,
    'The label of a field.',
    (props) => {
        const isRequired = (): boolean => Boolean(read(props.required));

        return element('Row', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    return `ui-label${extra ? ` ${extra}` : ''}`;
                },
                'data-for': () => {
                    const f = read(props.for);
                    return f !== undefined ? f : null;
                },
            },
            children: [
                ...(props.text !== undefined ? [text(props.text)] : []),
                when(isRequired, () => element('Text', {
                    props: { class: 'ui-label-required', 'aria-hidden': 'true' },
                    children: [text(' *')],
                })),
                ...(props.children ?? []),
            ],
        });
    },
);

export const Field: Component<FieldProps> = defineComponent<FieldProps>(
    UI_FIELD,
    'One labelled input in a form.',
    (props) => {
        const hasLabel = (): boolean => {
            const l = read(props.label);
            return l !== undefined && l !== '';
        };

        const hasHint = (): boolean => {
            const h = read(props.hint);
            const d = read(props.description);
            return (h !== undefined && h !== '') || (d !== undefined && d !== '');
        };

        const hasError = (): boolean => {
            const err = read(props.error);
            return err !== null && err !== undefined && err !== '';
        };

        const labelNode = (): Node => Label({
            text: props.label,
            required: props.required,
            for: props.name,
        });

        const hintNode = (): Node => element('Text', {
            props: { class: 'ui-field-hint' },
            children: [text(() => read(props.hint) ?? read(props.description) ?? '')],
        });

        const errorNode = (): Node => element('Text', {
            props: { class: 'ui-field-error', role: 'alert' },
            children: [text(() => read(props.error) ?? '')],
        });

        return element('Stack', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    const inv = hasError();
                    return `ui-field${inv ? ' ui-field-invalid' : ''}${extra ? ` ${extra}` : ''}`;
                },
                'data-invalid': () => String(hasError()),
                'data-required': () => String(Boolean(read(props.required))),
                'data-field-name': () => read(props.name) ?? null,
            },
            children: [
                when(hasLabel, labelNode),
                element('Stack', {
                    props: { class: 'ui-field-control' },
                    children: props.children ?? [],
                }),
                when(hasHint, hintNode),
                when(hasError, errorNode),
            ],
        });
    },
);
