/**
 * ui.Select component.
 *
 * spec/ui/vocabulary.md:
 *   - ui.Select: a choice from a known set.
 *   - not for: a choice from a collection — that is an EntityList.
 *
 * A component has no logic. Props in, description out. Zero DOM manipulation.
 */

import { each, element, read, text } from '@flybyme/mesh-web';
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
        const optionsList = (): readonly SelectOption[] =>
            (read(props.options) ?? []).map(normalizeOption);

        const currentValue = (): string => {
            const v = read(props.value);
            return v !== undefined && v !== null ? String(v) : '';
        };

        const isDisabled = (): boolean => Boolean(read(props.disabled));

        return element('Row', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    const dis = isDisabled();
                    return `ui-select${dis ? ' disabled' : ''}${extra ? ` ${extra}` : ''}`;
                },
                role: 'group',
                'data-value': currentValue,
                'data-name': () => read(props.name) ?? null,
            },
            children: [
                /**
                 * `each`, not a plain loop over a snapshot -- `props.options` is reactive (a signal
                 * or a function reading one), and a form opened before its options finish loading
                 * used to render permanently empty: the loop below ran once, at construction, and
                 * nothing rebuilt `optionNodes` when the signal it read later changed. Found live,
                 * a dialog built at page load, before the organization's roles had loaded from the
                 * network -- the role picker inside it stayed empty forever, even once they arrived.
                 */
                each(
                    optionsList,
                    (opt) => opt.value,
                    (opt) => {
                        const isSelected = (): boolean => currentValue() === opt().value;

                        return element('Button', {
                            /**
                             * **The press is on the option, because the option is what a person clicks.**
                             *
                             * `props.intents` used to be spread onto the wrapping `Row` above and the
                             * options carried none, so a Select was inert twice over: nothing dispatched
                             * from a button, and the `change` the wrapper declared can never fire --
                             * `change` is bound to the DOM `input` event and a `Row` is a `div`, which
                             * does not emit one and has no value to read.
                             */
                            intents: { activate: { action: props.on(() => props.onSelect?.(opt().value)) } },
                            props: {
                                class: () => `ui-select-option${isSelected() ? ' selected' : ''}`,
                                type: 'button',
                                disabled: isDisabled,
                                'aria-pressed': () => String(isSelected()),
                                'data-value': () => opt().value,
                                'data-selected': () => String(isSelected()),
                            },
                            children: [text(() => opt().label)],
                        });
                    },
                ),
            ],
        });
    },
);
