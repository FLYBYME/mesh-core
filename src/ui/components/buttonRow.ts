/**
 * ui.ButtonRow component.
 *
 * spec/ui/vocabulary.md:
 *   - ui.ButtonRow: the actions of a form or a detail.
 *   - not for: one primary action — that belongs to the header.
 *
 * A component has no logic. Props in, description out. Zero DOM manipulation.
 */

import { element, read } from '@flybyme/mesh-web';
import {
    defineComponent, UI_BUTTON_ROW, type ButtonRowProps, type Component,
} from '../contract.js';

export const ButtonRow: Component<ButtonRowProps> = defineComponent<ButtonRowProps>(
    UI_BUTTON_ROW,
    'The actions of a form or a detail.',
    (props) => element('Row', {
        props: {
            class: () => {
                const align = read(props.align) ?? 'start';
                const extra = read(props.class);
                return `ui-button-row ui-button-row-${align}${extra ? ` ${extra}` : ''}`;
            },
            gap: () => {
                const g = read(props.gap);
                return g !== undefined ? g : 8;
            },
            role: 'toolbar',
        },
        children: props.children ?? [],
    }),
);
