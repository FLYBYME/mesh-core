/**
 * ui.Dialog component.
 *
 * spec/ui/vocabulary.md:
 *   - ui.Dialog: confirmation, and editing that must not lose the background.
 *   - whether it is open belongs to whoever opened it.
 *
 * A component has no logic. Props in, description out. Zero DOM manipulation.
 */

import { dialog, element, read, text } from '@flybyme/mesh-web';
import {
    defineComponent, UI_DIALOG, type Component, type DialogProps,
} from '../contract.js';

export const Dialog: Component<DialogProps> = defineComponent<DialogProps>(
    UI_DIALOG,
    'Modal dialog surface for confirmation and edits that must not lose context.',
    (props) => dialog({
        open: props.open,
        props: {
            // Spread rather than assigned: under `exactOptionalPropertyTypes` an absent title and a
            // title that is `undefined` are different things, and only the first is what "this
            // dialog has no title" means.
            ...(props.title === undefined ? {} : { title: props.title }),
            class: () => {
                const extra = read(props.class);
                return `ui-dialog${extra ? ` ${extra}` : ''}`;
            },
        },
        ...(props.intents ? { intents: props.intents } : {}),
        children: [
            element('Stack', {
                props: { class: 'ui-dialog-content' },
                children: [
                    ...(props.title !== undefined ? [
                        element('Row', {
                            props: { class: 'ui-dialog-header' },
                            children: [
                                element('Heading', {
                                    props: { level: 3, class: 'ui-dialog-title' },
                                    children: [text(props.title)],
                                }),
                            ],
                        }),
                    ] : []),
                    element('Stack', {
                        props: { class: 'ui-dialog-body' },
                        children: props.children ?? [],
                    }),
                ],
            }),
        ],
    }),
);
