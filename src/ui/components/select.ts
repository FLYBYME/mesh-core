/**
 * ui.Select component.
 *
 * spec/ui/vocabulary.md:
 *   - ui.Select: a choice from a known set.
 *   - not for: a choice from a collection — that is an EntityList.
 *
 * A component has no logic. Props in, description out. Zero DOM manipulation.
 */

import { element, read, text } from '@flybyme/mesh-web';
import type { Node } from '@flybyme/mesh-web';
import {
    defineComponent, UI_SELECT,
    type Component, type SelectOption, type SelectProps,
} from '../contract.js';

function normalizeOption(item: string | SelectOption): SelectOption {
    if (typeof item === 'string') {
        return { value: item, label: item };
    }
    return item;
}

export const Select: Component<SelectProps> = defineComponent<SelectProps>(
    UI_SELECT,
    'A choice from a known set.',
    (props) => {
        const rawOptions = (): readonly (string | SelectOption)[] => read(props.options) ?? [];
        const optionsList = (): readonly SelectOption[] => rawOptions().map(normalizeOption);

        const currentValue = (): string => {
            const v = read(props.value);
            return v !== undefined && v !== null ? String(v) : '';
        };

        const isDisabled = (): boolean => Boolean(read(props.disabled));

        const optionNodes: Node[] = [];
        const opts = optionsList();

        for (const opt of opts) {
            const isSelected = (): boolean => currentValue() === opt.value;

            optionNodes.push(
                element('Button', {
                    props: {
                        class: () => {
                            const sel = isSelected();
                            return `ui-select-option${sel ? ' selected' : ''}`;
                        },
                        type: 'button',
                        disabled: isDisabled,
                        'aria-pressed': () => String(isSelected()),
                        'data-value': opt.value,
                        'data-selected': () => String(isSelected()),
                    },
                    children: [text(opt.label)],
                }),
            );
        }

        return element('Row', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    const dis = isDisabled();
                    return `ui-select${dis ? ' disabled' : ''}${extra ? ` ${extra}` : ''}`;
                },
                role: 'group',
                'data-value': currentValue,
                'data-name': () => read(props.name),
            },
            ...(props.intents ? { intents: props.intents } : {}),
            children: optionNodes,
        });
    },
);
