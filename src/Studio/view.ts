/**
 * StudioApp declarative view.
 *
 * Produces a pure DescriptionNode tree combining CodeEditor and Chart components.
 * Zero DOM access.
 */

import {
    element, text, when, type Node, type ViewContext,
} from '@flybyme/mesh-web';

import { CodeEditor } from '../CodeEditor/index.js';
import { Chart } from '../Charts/index.js';
import type { DataPoint } from '../Charts/contract/types.js';
import type { StudioInternal } from './contract.js';
import { ALL_PRESETS } from './presets.js';

export function renderStudio(vx: ViewContext<Record<string, never>, StudioInternal>): Node {
    return element('Stack', {
        props: { class: 'studio-container' },
        children: [
            // Top Toolbar
            renderToolbar(vx),

            // Main Two-Column Split Workspace
            element('Row', {
                props: { class: 'studio-workspace' },
                children: [
                    // Left Pane: CodeEditor
                    renderEditorPane(vx),

                    // Right Pane: Live Chart Visualizer
                    renderVisualizerPane(vx),
                ],
            }),
        ],
    });
}

function renderToolbar(vx: ViewContext<Record<string, never>, StudioInternal>): Node {
    const internal = vx.internal;

    return element('Row', {
        props: { class: 'studio-toolbar' },
        children: [
            // Left: Title & Status
            element('Row', {
                props: { class: 'studio-toolbar-left' },
                children: [
                    element('Text', {
                        props: { class: 'studio-title' },
                        children: [text('DATA STUDIO')],
                    }),
                    element('Text', {
                        props: {
                            class: () =>
                                internal.status().isError
                                    ? 'studio-status-badge error'
                                    : 'studio-status-badge ok',
                        },
                        children: [text(() => internal.status().message)],
                    }),
                ],
            }),

            // Right: Preset Buttons & Action Controls
            element('Row', {
                props: { class: 'studio-toolbar-right' },
                children: [
                    // Presets
                    ...ALL_PRESETS.map((preset) =>
                        element('Button', {
                            props: { class: 'studio-btn', type: 'button' },
                            intents: {
                                activate: { action: vx.on(() => internal.selectPreset(preset.id)) },
                            },
                            children: [text(preset.title)],
                        }),
                    ),

                    // Format JSON
                    element('Button', {
                        props: { class: 'studio-btn', type: 'button' },
                        intents: {
                            activate: { action: vx.on(() => internal.formatCode()) },
                        },
                        children: [text('Format')],
                    }),

                    // Add Data Point
                    element('Button', {
                        props: { class: 'studio-btn', type: 'button' },
                        intents: {
                            activate: { action: vx.on(() => internal.addPoint()) },
                        },
                        children: [text('+ Point')],
                    }),

                    // Toggle Chart Type (Area vs Line)
                    element('Button', {
                        props: { class: 'studio-btn', type: 'button' },
                        intents: {
                            activate: { action: vx.on(() => internal.toggleChartType()) },
                        },
                        children: [
                            text(() =>
                                internal.chartType() === 'area'
                                    ? 'Show Line'
                                    : 'Show Area',
                            ),
                        ],
                    }),
                ],
            }),
        ],
    });
}

function renderEditorPane(vx: ViewContext<Record<string, never>, StudioInternal>): Node {
    const internal = vx.internal;

    return element('Stack', {
        props: { class: 'studio-editor-pane' },
        children: [
            element('Row', {
                props: { class: 'studio-pane-header' },
                children: [
                    element('Text', { children: [text('Code & Dataset (JSON)')] }),
                    element('Text', {
                        props: { style: { opacity: 0.6 } },
                        children: [text('Live Sync')],
                    }),
                ],
            }),
            element('Stack', {
                props: { class: 'studio-editor-host' },
                children: [
                    CodeEditor({
                        on: vx.on,
                        content: () => internal.rawCode(),
                        language: 'json',
                        lineNumbers: true,
                        markers: () => internal.markers(),
                        controller: internal.editorController,
                        onChange: (val) => internal.updateCode(val),
                    }),
                ],
            }),
        ],
    });
}

function renderVisualizerPane(vx: ViewContext<Record<string, never>, StudioInternal>): Node {
    const internal = vx.internal;

    // Derived reactive accessors for the chart components
    const primarySeriesData = (): readonly DataPoint[] => {
        const data = internal.parsedData();
        const primary = data.series[0];
        if (!primary) return [];
        return primary.data.map((y, i) => ({
            x: data.categories[i] ?? i + 1,
            y,
        }));
    };

    const sparklineData = (): readonly number[] => {
        const data = internal.parsedData();
        return data.series[0]?.data ?? [10, 20, 15, 35, 25];
    };

    const donutData = () => internal.parsedData().donut;
    const barData = () => internal.parsedData().bars;

    return element('Stack', {
        props: { class: 'studio-visualizer-pane' },
        children: [
            // Card 1: Primary Area/Line Chart
            element('Stack', {
                props: { class: 'studio-card' },
                children: [
                    element('Row', {
                        props: { style: { justifyContent: 'space-between', alignItems: 'center' } },
                        children: [
                            element('Text', {
                                props: { class: 'studio-card-title' },
                                children: [text(() => internal.parsedData().title || 'Trend Overview')],
                            }),
                            // Sparkline embedded in card header
                            Chart.Sparkline({
                                data: sparklineData,
                                width: 80,
                                height: 20,
                                color: '#38bdf8',
                            }),
                        ],
                    }),
                    when(
                        () => internal.chartType() === 'area',
                        () =>
                            Chart.Area({
                                data: primarySeriesData,
                                height: 220,
                                color: '#38bdf8',
                                showGrid: true,
                                showDots: true,
                                curve: 'smooth',
                            }),
                        () =>
                            Chart.Line({
                                data: primarySeriesData,
                                height: 220,
                                color: '#38bdf8',
                                showGrid: true,
                                showDots: true,
                                curve: 'smooth',
                            }),
                    ),
                ],
            }),

            // Grid of 2 Cards: Donut & Bar Charts
            element('Row', {
                props: { class: 'studio-grid-two' },
                children: [
                    // Donut Chart Card
                    element('Stack', {
                        props: { class: 'studio-card' },
                        children: [
                            element('Text', {
                                props: { class: 'studio-card-title' },
                                children: [text('Breakdown & Distribution')],
                            }),
                            Chart.Donut({
                                data: donutData,
                                size: 180,
                                innerRadiusRatio: 0.5,
                            }),
                        ],
                    }),

                    // Bar Chart Card
                    element('Stack', {
                        props: { class: 'studio-card' },
                        children: [
                            element('Text', {
                                props: { class: 'studio-card-title' },
                                children: [text('Category Comparison')],
                            }),
                            Chart.Bar({
                                data: barData,
                                height: 180,
                                showGrid: true,
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}
