/**
 * Data contracts and props for the Chart vocabulary.
 *
 * All types are pure and decoupled from DOM.
 */

import type { Json, Reactive, Registrar } from '@flybyme/mesh-web';

export interface DataPoint {
    readonly x: number | string | Date;
    readonly y: number;
}

export interface BarItem {
    readonly label: string;
    readonly value: number;
    readonly color?: string | undefined;
}

export interface DonutSlice {
    readonly label: string;
    readonly value: number;
    readonly color?: string | undefined;
}

export interface ChartMargin {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
}

export interface SparklineProps {
    readonly data: Reactive<readonly number[]>;
    readonly width?: number | undefined;
    readonly height?: number | undefined;
    readonly color?: string | undefined;
    readonly fill?: boolean | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly style?: Reactive<Json> | undefined;
}

export interface LineChartProps {
    readonly data: Reactive<readonly DataPoint[]>;
    readonly width?: number | undefined;
    readonly height?: number | undefined;
    readonly color?: string | undefined;
    readonly showGrid?: boolean | undefined;
    readonly showDots?: boolean | undefined;
    readonly curve?: 'linear' | 'smooth' | undefined;
    readonly xLabel?: string | undefined;
    readonly yLabel?: string | undefined;
    readonly on?: Registrar | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly style?: Reactive<Json> | undefined;
}

export interface AreaChartProps extends LineChartProps {
    readonly fillOpacity?: number | undefined;
}

export interface BarChartProps {
    readonly data: Reactive<readonly BarItem[]>;
    readonly width?: number | undefined;
    readonly height?: number | undefined;
    readonly orientation?: 'vertical' | 'horizontal' | undefined;
    readonly color?: string | undefined;
    readonly showGrid?: boolean | undefined;
    readonly on?: Registrar | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly style?: Reactive<Json> | undefined;
}

export interface DonutChartProps {
    readonly data: Reactive<readonly DonutSlice[]>;
    readonly size?: number | undefined;
    readonly innerRadiusRatio?: number | undefined;
    readonly showLegend?: boolean | undefined;
    readonly on?: Registrar | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly style?: Reactive<Json> | undefined;
}

export type ChartRenderPayload =
    | { readonly type: 'sparkline'; readonly props: SparklineProps }
    | { readonly type: 'line'; readonly props: LineChartProps }
    | { readonly type: 'area'; readonly props: AreaChartProps }
    | { readonly type: 'bar'; readonly props: BarChartProps }
    | { readonly type: 'donut'; readonly props: DonutChartProps };
