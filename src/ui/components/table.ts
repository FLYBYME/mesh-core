/**
 * ui.Table and ui.TableRow components.
 *
 * spec/ui/vocabulary.md:
 *   - ui.Table: many rows, real columns, comparison across rows.
 *   - ui.TableRow: one row of a Table.
 *
 * Answering the four states: loading, ready, empty, error.
 * Pure descriptions: props in, Node out. Zero DOM manipulation.
 */

import { element, read, text, when } from '@flybyme/mesh-web';
import type { Node } from '@flybyme/mesh-web';
import {
    defineComponent, UI_TABLE, UI_TABLE_ROW,
    type Component, type EntityListStatus, type TableProps, type TableRowProps,
} from '../contract.js';

export const Table: Component<TableProps> = defineComponent<TableProps>(
    UI_TABLE,
    'Many rows, real columns, comparison across rows.',
    (props) => {
        const currentStatus = (): EntityListStatus => read(props.status) ?? 'ready';

        const headersList = (): readonly string[] => read(props.headers) ?? [];
        const hasHeaders = (): boolean => headersList().length > 0;

        const headerNode = (): Node => element('Row', {
            props: {
                class: () => {
                    const extra = read(props.headerClass);
                    return `ui-table-header${extra ? ` ${extra}` : ''}`;
                },
                role: 'row',
            },
            children: headersList().map((headerText) => element('Text', {
                props: { class: 'ui-table-header-cell', role: 'columnheader' },
                children: [text(headerText)],
            })),
        });

        const loadingNode = (): Node => element('Row', {
            props: { class: 'ui-table-loading', role: 'status' },
            children: [text(() => read(props.loadingMessage) ?? 'Loading…')],
        });

        const errorNode = (): Node => element('Row', {
            props: { class: 'ui-table-error', role: 'alert' },
            children: [text(() => read(props.errorMessage) ?? 'Failed to load')],
        });

        const emptyNode = (): Node => element('Row', {
            props: { class: 'ui-table-empty', role: 'status' },
            children: [text(() => read(props.emptyMessage) ?? 'No records found.')],
        });

        const rowsNode = (): Node => element('Stack', {
            props: {
                class: () => {
                    const extra = read(props.rowsClass);
                    return `ui-table-rows${extra ? ` ${extra}` : ''}`;
                },
                role: 'rowgroup',
            },
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
                    rowsNode,
                ),
            ),
        );

        return element('Stack', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    const s = currentStatus();
                    return `ui-table ui-table-${s}${extra ? ` ${extra}` : ''}`;
                },
                'data-status': () => currentStatus(),
                role: 'table',
            },
            children: [
                when(hasHeaders, headerNode),
                contentBranch(),
            ],
        });
    },
);

export const TableRow: Component<TableRowProps> = defineComponent<TableRowProps>(
    UI_TABLE_ROW,
    'One row of a Table.',
    (props) => {
        const isSelected = (): boolean => Boolean(read(props.selected));

        return element('Row', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    const sel = isSelected();
                    return `ui-table-row${sel ? ' selected' : ''}${extra ? ` ${extra}` : ''}`;
                },
                role: 'row',
                'data-selected': () => String(isSelected()),
                'aria-selected': () => String(isSelected()),
            },
            ...(props.intents ? { intents: props.intents } : {}),
            ...(props.key !== undefined ? { key: props.key } : {}),
            children: props.children ?? [],
        });
    },
);
