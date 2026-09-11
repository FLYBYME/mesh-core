/**
 * ui.DetailSurface component.
 *
 * spec/ui/vocabulary.md:
 *   - ui.DetailSurface: the DETAIL region, including its no-selection placeholder.
 *
 * A component has no logic. Props in, description out. Zero DOM manipulation.
 */

import { element, read, text, when } from '@flybyme/mesh-web';
import type { Node } from '@flybyme/mesh-web';
import {
    defineComponent, UI_DETAIL_SURFACE, type Component, type DetailSurfaceProps,
} from '../contract.js';

export const DetailSurface: Component<DetailSurfaceProps> = defineComponent<DetailSurfaceProps>(
    UI_DETAIL_SURFACE,
    'The DETAIL region, including its no-selection placeholder.',
    (props) => {
        const isSelected = (): boolean => {
            const sel = read(props.selected);
            return sel !== undefined ? Boolean(sel) : true;
        };

        const placeholderNode = (): Node => element('Stack', {
            props: { class: 'ui-detail-surface-placeholder', role: 'status' },
            children: [
                element('Heading', {
                    props: { level: 3, class: 'ui-detail-placeholder-title' },
                    children: [text(() => read(props.placeholderTitle) ?? 'No selection')],
                }),
                element('Text', {
                    props: { class: 'ui-detail-placeholder-message' },
                    children: [text(() => read(props.placeholderMessage) ?? 'Select an item to view details.')],
                }),
            ],
        });

        const hasHeader = (): boolean => {
            const t = read(props.title);
            const b = read(props.subtitle);
            return (t !== undefined && t !== '') || (b !== undefined && b !== '');
        };

        const headerNode = (): Node => element('Row', {
            props: { class: 'ui-detail-surface-header' },
            children: [
                ...(props.title !== undefined ? [
                    element('Heading', {
                        props: { level: 2, class: 'ui-detail-surface-title' },
                        children: [text(props.title)],
                    }),
                ] : []),
                ...(props.subtitle !== undefined ? [
                    element('Badge', {
                        props: {
                            class: () => {
                                const variant = read(props.subtitleVariant);
                                return `ui-detail-surface-badge${variant ? ` ui-badge-${variant}` : ''}`;
                            },
                        },
                        children: [text(props.subtitle)],
                    }),
                ] : []),
            ],
        });

        const detailContentNode = (): Node => element('Stack', {
            props: { class: 'ui-detail-surface-content' },
            children: [
                when(hasHeader, headerNode),
                ...(props.children ?? []),
            ],
        });

        return element('Stack', {
            props: {
                class: () => {
                    const extra = read(props.class);
                    const sel = isSelected();
                    return `ui-detail-surface${sel ? ' has-selection' : ' empty-selection'}${extra ? ` ${extra}` : ''}`;
                },
                role: 'region',
                'aria-label': () => read(props.title) ?? 'Detail surface',
            },
            children: [
                when(isSelected, detailContentNode, placeholderNode),
            ],
        });
    },
);
