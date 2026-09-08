/**
 * ui.PropertyGrid component.
 *
 * spec/ui/vocabulary.md:
 *   - ui.PropertyGrid: label/value pairs of one thing.
 *
 * A component has no logic. Props in, description out. Zero DOM manipulation.
 */

import { element, read, text } from '@flybyme/mesh-web';
import type { Node } from '@flybyme/mesh-web';
import {
    defineComponent, UI_PROPERTY_GRID, type Component, type PropertyGridProps,
} from '../contract.js';

function isNode(val: unknown): val is Node {
    if (typeof val !== 'object' || val === null) return false;
    return 'kind' in val || Array.isArray(val);
}

export const PropertyGrid: Component<PropertyGridProps> = defineComponent<PropertyGridProps>(
    UI_PROPERTY_GRID,
    'Label/value pairs of one thing, for display.',
    (props) => {
        const itemNodes: Node[] = [];

        if (props.items) {
            for (const item of props.items) {
                const val = item.value;
                const valueNode = isNode(val)
                    ? val
                    : element('Text', {
                        props: { class: 'ui-property-value' },
                        children: [
                            text(() => {
                                const v = typeof val === 'function' ? (val as () => unknown)() : val;
                                if (v === null || v === undefined) return '—';
                                if (typeof v === 'boolean') return v ? 'true' : 'false';
                                return String(v);
                            }),
                        ],
                    });

                itemNodes.push(
                    element('Row', {
                        props: { class: 'ui-property-row' },
                        children: [
                            element('Text', {
                                props: { class: 'ui-property-label' },
                                children: [text(item.label)],
                            }),
                            valueNode,
                        ],
                    }),
                );
            }
        }

        return element('Grid', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    return `ui-property-grid${extra ? ` ${extra}` : ''}`;
                },
                columns: () => {
                    const cols = read(props.columns);
                    return cols !== undefined ? String(cols) : null;
                },
                gap: () => {
                    const g = read(props.gap);
                    return g !== undefined ? g : null;
                },
            },
            children: [
                ...itemNodes,
                ...(props.children ?? []),
            ],
        });
    },
);
