/**
 * LineChart component.
 *
 * Single or multi-series continuous line visualization with Bézier smoothing,
 * gridlines, and axes.
 * Pure description node: element('ChartSurface', ...). Zero DOM calls.
 */

import { element, type Node, type Props } from '@flybyme/mesh-web';
import type { ChartRenderPayload, LineChartProps } from '../contract/types.js';

export function LineChart(props: LineChartProps): Node {
    const isReactive = typeof props.data === 'function';
    const getPayload = (): ChartRenderPayload => ({
        type: 'line',
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
