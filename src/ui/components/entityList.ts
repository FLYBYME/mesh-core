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
                /**
                 * **A style, because `width` on a `div` is not a thing.**
                 *
                 * This wrote `width` as an *attribute*. The attribute is only meaningful on a few
                 * elements — `img`, `canvas`, `table` — and `EntityList` renders a `Stack`, which is
                 * a `div`, so it did nothing at all. Meanwhile `ui.css` sets `width: 100%` on this
                 * class, so a list asked for 300px rendered full width.
                 *
                 * It cost an hour, and not as a layout complaint: the console's INDEX region covered
                 * its DETAIL region, so the sign-in button was **visible, enabled, and unclickable**
                 * — Playwright reported *"element intercepts pointer events"* on a control every
                 * assertion said was fine. A test that checks a control is on screen cannot tell
                 * this from working; only pressing it can.
                 *
                 * Same family as `Stack`'s `gap` on a non-flex container (mesh-web roadmap A8.11): a
                 * prop that is read, rendered, and has no effect.
                 *
                 * A bare number means pixels. `width: 300` is what somebody writes, and `'300'` as a
                 * CSS width is invalid and silently dropped — which is the identical failure again.
                 */
                style: () => {
                    const w = read(props.width);
                    if (w === undefined) return null;
                    const size = typeof w === 'number' ? `${String(w)}px` : w;
                    return `width: ${size}; flex: 0 0 ${size};`;
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
