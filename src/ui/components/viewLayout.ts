import { element, read } from '@flybyme/mesh-web';
import type { Node, Reactive } from '@flybyme/mesh-web';
import { defineComponent, type Component } from '../contract.js';

export const UI_VIEW_LAYOUT = 'ui.ViewLayout';

export interface ViewLayoutProps {
    readonly header?: Reactive<Node | undefined> | undefined;
    readonly index?: Reactive<Node | undefined> | undefined;
    readonly detail?: Reactive<Node | undefined> | undefined;
    readonly footer?: Reactive<Node | undefined> | undefined;
    readonly class?: Reactive<string> | undefined;
}

export const ViewLayout: Component<ViewLayoutProps> = defineComponent<ViewLayoutProps>(
    UI_VIEW_LAYOUT,
    'The anatomy of a view: header, index, detail, footer. Obeys the scroll model under both chromes.',
    (props) => {
        const bodyNode = (): Node => element('Row', {
            props: { class: 'ui-view-layout-body' },
            children: [
                ...(props.index !== undefined ? [read(props.index) ?? element('Stack', {})] : []),
                ...(props.detail !== undefined ? [read(props.detail) ?? element('Stack', {})] : []),
            ],
        });

        return element('Stack', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    return `ui-view-layout${extra ? ` ${extra}` : ''}`;
                },
            },
            children: [
                ...(props.header !== undefined ? [read(props.header) ?? element('Stack', {})] : []),
                bodyNode(),
                ...(props.footer !== undefined ? [read(props.footer) ?? element('Stack', {})] : []),
            ],
        });
    },
);
