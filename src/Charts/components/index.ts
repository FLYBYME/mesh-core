/**
 * The Chart vocabulary namespace.
 *
 * Provides declarative chart components:
 * - Chart.Sparkline: compact inline trend
 * - Chart.Line: time-series & metrics trendline
 * - Chart.Area: filled gradient area chart
 * - Chart.Bar: column & horizontal bar chart
 * - Chart.Donut: proportional slice & distribution
 */

import { Sparkline } from './Sparkline.js';
import { LineChart } from './LineChart.js';
import { AreaChart } from './AreaChart.js';
import { BarChart } from './BarChart.js';
import { DonutChart } from './DonutChart.js';

export const Chart = {
    Sparkline,
    Line: LineChart,
    Area: AreaChart,
    Bar: BarChart,
    Donut: DonutChart,
} as const;

export { Sparkline, LineChart, AreaChart, BarChart, DonutChart };
