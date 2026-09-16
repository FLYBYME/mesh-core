/**
 * Charts subsystem for mesh-core.
 *
 * Provides:
 * - Chart: The namespace with Chart.Sparkline, Chart.Line, Chart.Area, Chart.Bar, Chart.Donut
 * - math/: coordinate projection, nice tick calculation, SVG path builders
 * - driver/: ChartDriver ComponentDefinition ('ChartSurface')
 * - contract/: pure data interfaces
 */

import { ChartDriver } from './driver/index.js';

export * from './contract/index.js';
export * from './math/index.js';
export * from './components/index.js';
export * from './driver/index.js';

/**
 * The Charts part contribution.
 *
 * Registers the 'ChartSurface' component primitive with the kernel so that
 * all Chart.* components render smoothly in any composition.
 */
export class ChartsPart {
    readonly needs = [] as const;
    readonly components = [ChartDriver] as const;

    activate(): undefined {
        return undefined;
    }
}

export default ChartsPart;
