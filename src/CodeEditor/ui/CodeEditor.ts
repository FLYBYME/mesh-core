/**
 * Declarative CodeEditor composite for views.
 *
 * Produces a pure DescriptionNode.
 * Zero DOM access: strictly generates an element('CodeEditor', ...) node.
 *
 * Enforces mesh-core's invariant: 'on: Registrar' is mandatory so handler
 * closures are registered within the view's scoped handler table.
 */

import { element, type IntentBinding, type Intents, type Node, type Props } from '@flybyme/mesh-web';
import type { CodeEditorProps } from '../contract/types.js';

export function CodeEditor(props: CodeEditorProps): Node {
    if (typeof props.on !== 'function') {
        throw new Error(
            'CodeEditor requires an "on" registrar from ViewContext (vx.on). ' +
            'Passing on keeps handler lifetimes tied to the view.',
        );
    }

    const nodeProps: Record<string, unknown> = {
        content: props.content,
    };

    if (props.language !== undefined) nodeProps.language = props.language;
    if (props.readOnly !== undefined) nodeProps.readOnly = props.readOnly;
    if (props.lineNumbers !== undefined) nodeProps.lineNumbers = props.lineNumbers;
    if (props.markers !== undefined) nodeProps.markers = props.markers;
    if (props.controller !== undefined) nodeProps.controller = props.controller;
    if (props.class !== undefined) nodeProps.class = props.class;
    if (props.style !== undefined) nodeProps.style = props.style;

    const intents: Record<string, IntentBinding> = {};

    if (props.onChange !== undefined) {
        intents.change = {
            action: props.on((val) => {
                if (typeof val === 'string') {
                    props.onChange?.(val);
                }
            }),
        };
    }

    const hasIntents = Object.keys(intents).length > 0;

    return element('CodeEditor', {
        props: nodeProps as unknown as Props,
        ...(hasIntents ? { intents: intents as Intents } : {}),
    });
}
