/**
 * ui.EntityList and ui.EntityItem components.
 *
 * spec/ui/vocabulary.md:
 *   - ui.EntityList: the INDEX region: a live collection you select from.
 *   - ui.EntityItem: one row in an EntityList.
 *
 * Four states: 'loading' | 'ready' | 'empty' | 'error' (spec/ui/states.md).
 * Pure descriptions: props in, Node out. Zero DOM manipulation.
 */

import { element, read, text, when } from '@flybyme/mesh-web';
import type { Node } from '@flybyme/mesh-web';
import {
    defineComponent, UI_ENTITY_ITEM, UI_ENTITY_LIST,
    type Component, type EntityItemProps, type EntityListProps, type EntityListStatus,
} from '../contract.js';

export const EntityList: Component<EntityListProps> = defineComponent<EntityListProps>(
    UI_ENTITY_LIST,
    'The INDEX region: a live collection you select from, answering loading, ready, empty, and error states.',
    (props) => {
        const currentStatus = (): EntityListStatus => read(props.status) ?? 'ready';

        const hasHeader = (): boolean => {
            const t = read(props.title);
            const c = read(props.count);
            return (t !== undefined && t !== '') || c !== undefined;
        };

        const headerNode = (): Node => element('Row', {
            props: { class: 'ui-entity-list-header' },
            children: [
                element('Heading', {
                    props: { level: 2, class: 'ui-entity-list-title' },
                    children: [
                        text(() => read(props.title) ?? ''),
                        text(() => {
                            const c = read(props.count);
                            return c !== undefined && c !== '' ? ` (${c})` : '';
                        }),
                    ],
                }),
            ],
        });

        const loadingNode = (): Node => element('Row', {
            props: { class: 'ui-entity-list-loading', role: 'status' },
            children: [text(() => read(props.loadingMessage) ?? 'Loading…')],
        });

        const errorNode = (): Node => element('Row', {
            props: { class: 'ui-entity-list-error', role: 'alert' },
            children: [text(() => read(props.errorMessage) ?? 'Failed to load')],
        });

        const emptyNode = (): Node => element('Stack', {
            props: { class: 'ui-entity-list-empty', role: 'status' },
            children: [
                element('Text', {
                    props: { class: 'ui-entity-list-empty-message' },
                    children: [text(() => read(props.emptyMessage) ?? 'No items found.')],
                }),
                ...(props.emptyAction ? [read(props.emptyAction) ?? element('Row', {})] : []),
            ],
        });

        const itemsNode = (): Node => element('Stack', {
            props: { class: 'ui-entity-list-items', role: 'list' },
            children: props.children ?? [],
        });

        const contentBranch = (): Node => when(
            () => currentStatus() === 'loading',
            loadingNode,
            () => when(
                () => currentStatus() === 'error',
                errorNode,
                () => when(
                    () => currentStatus() === 'empty',
                    emptyNode,
                    itemsNode,
                ),
            ),
        );

        return element('Stack', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    const s = currentStatus();
                    return `ui-entity-list ui-entity-list-${s}${extra ? ` ${extra}` : ''}`;
                },
                'data-status': () => currentStatus(),
                role: 'region',
                'aria-label': () => read(props.title) ?? 'Entity list',
                width: () => {
                    const w = read(props.width);
                    return w !== undefined ? String(w) : undefined;
                },
            },
            children: [
                when(hasHeader, headerNode),
                contentBranch(),
            ],
        });
    },
);

export const EntityItem: Component<EntityItemProps> = defineComponent<EntityItemProps>(
    UI_ENTITY_ITEM,
    'One row in an EntityList.',
    (props) => {
        const isSelected = (): boolean => Boolean(read(props.selected));

        return element('Row', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    const sel = isSelected();
                    return `ui-entity-item${sel ? ' selected' : ''}${extra ? ` ${extra}` : ''}`;
                },
                role: 'listitem',
                'aria-selected': () => String(isSelected()),
                'data-selected': () => String(isSelected()),
            },
            ...(props.intents ? { intents: props.intents } : {}),
            ...(props.key !== undefined ? { key: props.key } : {}),
            children: [
                ...(props.title !== undefined ? [
                    element('Text', {
                        props: { class: 'ui-entity-item-title' },
                        children: [text(props.title)],
                    }),
                ] : []),
                ...(props.description !== undefined ? [
                    element('Text', {
                        props: { class: 'ui-entity-item-description' },
                        children: [text(props.description)],
                    }),
                ] : []),
                ...(props.children ?? []),
            ],
        });
    },
);
