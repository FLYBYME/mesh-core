/**
 * AreaChart component.
 *
 * Filled metric area chart with gradient opacity.
 * Pure description node: element('ChartSurface', ...). Zero DOM calls.
 */

import { element, type Node, type Props } from '@flybyme/mesh-web';
import type { AreaChartProps, ChartRenderPayload } from '../contract/types.js';

export function AreaChart(props: AreaChartProps): Node {
    const isReactive = typeof props.data === 'function';
    const getPayload = (): ChartRenderPayload => ({
        type: 'area',
        props: {
            ...props,
            data: typeof props.data === 'function' ? props.data() : props.data,
        },
    });

    const nodeProps: Record<string, unknown> = {
        payload: isReactive ? getPayload : getPayload(),
    };
    if (props.class !== undefined) nodeProps.class = props.class;
    if (props.style !== undefined) nodeProps.style = props.style;

    return element('ChartSurface', {
        props: nodeProps as unknown as Props,
    });
}
