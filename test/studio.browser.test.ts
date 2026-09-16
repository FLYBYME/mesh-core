/**
 * Browser integration tests for StudioApp.
 *
 * Runs in a real Chromium browser via vitest.browser.config.ts.
 * Verifies:
 * - Booting StudioApp in the kernel via mountPart().
 * - Simultaneous rendering of CodeEditor and Native SVG Charts.
 * - Reactive data synchronization between editor edits and SVG chart paths.
 * - Real-time syntax error marker placement on invalid JSON.
 * - Preset switching, formatting, and chart type toggles.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';

import StudioApp, { type StudioInternal } from '../src/Studio/index.js';

let site: Awaited<ReturnType<typeof bootStudio>> | undefined;

afterEach(() => {
    site?.dispose();
    site = undefined;
    cleanup();
    for (const el of document.querySelectorAll('.studio-container, .mesh-code-editor, .mesh-chart-surface')) {
        el.remove();
    }
});

const bootStudio = async () => {
    const s = await mountPart({
        parts: [{ id: 'studio', contribution: StudioApp }],
    });
    await s.ready;
    await new Promise((r) => setTimeout(r, 25));
    return s;
};

describe('StudioApp browser integration', () => {
    it('boots into a window and renders both CodeEditor and Chart surfaces', async () => {
        site = await bootStudio();

        // 1. Verifies one window opened
        expect(site.manager.windows()).toHaveLength(1);
        expect(site.manager.windows()[0]?.view).toBe('main');

        // 2. Toolbar renders title and initial status
        const title = document.querySelector('.studio-title');
        expect(title).not.toBeNull();
        expect(title?.textContent).toBe('DATA STUDIO');

        const status = document.querySelector('.studio-status-badge');
        expect(status?.textContent).toContain('Synchronized');

        // 3. CodeEditor DOM is mounted
        const editor = document.querySelector('.mesh-code-editor');
        expect(editor).not.toBeNull();

        const textarea = editor?.querySelector('textarea');
        expect(textarea).not.toBeNull();
        expect(textarea?.value).toContain('Sprint 42 Burndown');

        // 4. SVG Chart surfaces are mounted (Area/Line, Donut, Bar, Sparkline)
        const svgSurfaces = document.querySelectorAll('.mesh-chart-surface');
        expect(svgSurfaces.length).toBeGreaterThanOrEqual(4);

        // Verify primary Area/Line chart path
        const primarySvg = svgSurfaces[1]; // First is sparkline in card header
        expect(primarySvg).not.toBeNull();
        const paths = primarySvg?.querySelectorAll('path');
        expect(paths?.length).toBeGreaterThanOrEqual(1);

        // Verify Donut arcs
        const donutSvg = Array.from(svgSurfaces).find((s) => s.querySelector('.mesh-chart-donut-slice'));
        expect(donutSvg).not.toBeNull();

        // Verify Bar rects
        const barSvg = Array.from(svgSurfaces).find((s) => s.querySelector('.mesh-chart-bar'));
        expect(barSvg).not.toBeNull();
    });

    it('reactively updates charts when code updates', async () => {
        site = await bootStudio();
        const proc = site.kernel.processes.find((p) => p.applicationId === 'studio')!;
        const internal = proc.internal as StudioInternal;

        // Get initial bar count
        const initialBars = document.querySelectorAll('.mesh-chart-bar');
        expect(initialBars.length).toBe(4);

        // Update code with a dataset having 2 bars
        const modifiedData = {
            title: 'Custom Test',
            categories: ['A', 'B'],
            series: [{ name: 'Series 1', data: [10, 50] }],
            donut: [{ label: 'Slice 1', value: 100 }],
            bars: [
                { label: 'Alpha', value: 30 },
                { label: 'Beta', value: 70 },
            ],
        };

        internal.updateCode(JSON.stringify(modifiedData, null, 2));

        // Allow reactive microtask to propagate
        await new Promise((r) => setTimeout(r, 20));

        const updatedBars = document.querySelectorAll('.mesh-chart-bar');
        expect(updatedBars.length).toBe(2);

        const textarea = document.querySelector('.mesh-code-editor textarea') as HTMLTextAreaElement;
        expect(textarea.value).toContain('Custom Test');
    });

    it('injects syntax markers into CodeEditor when invalid JSON is entered', async () => {
        site = await bootStudio();
        const proc = site.kernel.processes.find((p) => p.applicationId === 'studio')!;
        const internal = proc.internal as StudioInternal;

        // Enter invalid JSON
        internal.updateCode('{\n  "title": "Broken",\n  "series": [\n}');

        await new Promise((r) => setTimeout(r, 20));

        // Status badge shows syntax error
        const status = document.querySelector('.studio-status-badge');
        expect(status).not.toBeNull();
        expect(status!.className).toContain('error');
        expect(status!.textContent).toContain('Syntax');

        // Gutter line marker is rendered in CodeEditor
        const markers = internal.markers();
        expect(markers.length).toBeGreaterThan(0);

        const gutterMarker = document.querySelector('[data-has-marker="error"]');
        expect(gutterMarker).not.toBeNull();
    });

    it('switches between presets', async () => {
        site = await bootStudio();
        const proc = site.kernel.processes.find((p) => p.applicationId === 'studio')!;
        const internal = proc.internal as StudioInternal;

        // Switch to API Telemetry preset
        internal.selectPreset('telemetry');

        await new Promise((r) => setTimeout(r, 20));

        const textarea = document.querySelector('.mesh-code-editor textarea') as HTMLTextAreaElement;
        expect(textarea.value).toContain('Gateway Latency');
        expect(internal.parsedData().title).toBe('Gateway Latency (ms)');
    });

    it('adds dynamic data points via addPoint()', async () => {
        site = await bootStudio();
        const proc = site.kernel.processes.find((p) => p.applicationId === 'studio')!;
        const internal = proc.internal as StudioInternal;

        const initialPointCount = internal.parsedData().series[0]!.data.length;

        internal.addPoint();

        await new Promise((r) => setTimeout(r, 20));

        const updatedPointCount = internal.parsedData().series[0]!.data.length;
        expect(updatedPointCount).toBe(initialPointCount + 1);

        const textarea = document.querySelector('.mesh-code-editor textarea') as HTMLTextAreaElement;
        expect(textarea.value).toContain(`T+${updatedPointCount}`);
    });

    it('toggles between area and line chart presentations', async () => {
        site = await bootStudio();
        const proc = site.kernel.processes.find((p) => p.applicationId === 'studio')!;
        const internal = proc.internal as StudioInternal;

        expect(internal.chartType()).toBe('area');

        internal.toggleChartType();
        expect(internal.chartType()).toBe('line');

        await new Promise((r) => setTimeout(r, 20));

        internal.toggleChartType();
        expect(internal.chartType()).toBe('area');
    });
});
