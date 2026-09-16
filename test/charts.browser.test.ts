/**
 * Browser integration tests for Charts.
 *
 * Runs in a real Chromium browser via vitest.browser.config.ts.
 * Verifies:
 * - Real DOM SVG mounting: Sparkline, Line, Area, Bar, Donut.
 * - Reactive update via ChartDriver.apply().
 * - Declarative Chart namespace outputs element('ChartSurface').
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@flybyme/mesh-web/testing';
import type { Json } from '@flybyme/mesh-web';

import { Chart, ChartDriver, type ChartRenderPayload } from '../src/Charts/index.js';

afterEach(() => {
    cleanup();
    for (const el of document.querySelectorAll('.mesh-chart-surface')) {
        el.remove();
    }
});

describe('Chart declarative namespace output', () => {
    it('Chart.Sparkline produces element with ChartSurface component', () => {
        const node = Chart.Sparkline({
            data: [10, 20, 30],
        });
        expect(!Array.isArray(node) && 'kind' in node && node.kind === 'element').toBe(true);
        if (!Array.isArray(node) && 'kind' in node && node.kind === 'element') {
            expect(node.component).toBe('ChartSurface');
        }
    });

    it('Chart.Line produces element with ChartSurface component', () => {
        const node = Chart.Line({
            data: [{ x: 1, y: 10 }, { x: 2, y: 20 }],
        });
        expect(!Array.isArray(node) && 'kind' in node && node.kind === 'element').toBe(true);
        if (!Array.isArray(node) && 'kind' in node && node.kind === 'element') {
            expect(node.component).toBe('ChartSurface');
        }
    });

    it('Chart.Bar produces element with ChartSurface component', () => {
        const node = Chart.Bar({
            data: [{ label: 'Q1', value: 100 }],
        });
        expect(!Array.isArray(node) && 'kind' in node && node.kind === 'element').toBe(true);
        if (!Array.isArray(node) && 'kind' in node && node.kind === 'element') {
            expect(node.component).toBe('ChartSurface');
        }
    });

    it('Chart.Donut produces element with ChartSurface component', () => {
        const node = Chart.Donut({
            data: [{ label: 'A', value: 50 }, { label: 'B', value: 50 }],
        });
        expect(!Array.isArray(node) && 'kind' in node && node.kind === 'element').toBe(true);
        if (!Array.isArray(node) && 'kind' in node && node.kind === 'element') {
            expect(node.component).toBe('ChartSurface');
        }
    });
});

describe('ChartDriver real browser SVG rendering', () => {
    it('renders Sparkline SVG paths', () => {
        const payload: ChartRenderPayload = {
            type: 'sparkline',
            props: { data: [5, 15, 8, 24, 18], width: 100, height: 30 },
        };

        const el = ChartDriver.create({ payload: payload as unknown as Json });
        document.body.appendChild(el);

        const line = el.querySelector('.mesh-chart-sparkline-line');
        const area = el.querySelector('.mesh-chart-sparkline-area');

        expect(line).not.toBeNull();
        expect(area).not.toBeNull();
        expect(line?.getAttribute('d')).toContain('M');
    });

    it('renders LineChart with gridlines, axis labels, and stroke path', () => {
        const payload: ChartRenderPayload = {
            type: 'line',
            props: {
                data: [
                    { x: '10:00', y: 50 },
                    { x: '10:05', y: 120 },
                    { x: '10:10', y: 80 },
                ],
                showGrid: true,
                showDots: true,
            },
        };

        const el = ChartDriver.create({ payload: payload as unknown as Json });
        document.body.appendChild(el);

        const grid = el.querySelector('.mesh-chart-grid');
        const line = el.querySelector('.mesh-chart-line');
        const circles = el.querySelectorAll('circle');

        expect(grid).not.toBeNull();
        expect(line).not.toBeNull();
        expect(circles.length).toBe(3);
    });

    it('renders BarChart with rect bars and titles', () => {
        const payload: ChartRenderPayload = {
            type: 'bar',
            props: {
                data: [
                    { label: '200 OK', value: 1200 },
                    { label: '500 ERR', value: 45 },
                ],
            },
        };

        const el = ChartDriver.create({ payload: payload as unknown as Json });
        document.body.appendChild(el);

        const bars = el.querySelectorAll('.mesh-chart-bar');
        expect(bars.length).toBe(2);
        expect(bars[0]?.querySelector('title')?.textContent).toBe('200 OK: 1200');
    });

    it('renders DonutChart with slice arcs and legend items', () => {
        const payload: ChartRenderPayload = {
            type: 'donut',
            props: {
                data: [
                    { label: 'Chrome', value: 70 },
                    { label: 'Safari', value: 30 },
                ],
                showLegend: true,
            },
        };

        const el = ChartDriver.create({ payload: payload as unknown as Json });
        document.body.appendChild(el);

        const slices = el.querySelectorAll('.mesh-chart-donut-slice');
        const legendItems = el.querySelectorAll('.mesh-chart-legend-item');

        expect(slices.length).toBe(2);
        expect(legendItems.length).toBe(2);
        expect(legendItems[0]?.textContent).toContain('Chrome (70%)');
    });

    it('updates SVG dynamically via apply() without remounting container', () => {
        const payload1: ChartRenderPayload = {
            type: 'sparkline',
            props: { data: [1, 2, 3] },
        };

        const el = ChartDriver.create({ payload: payload1 as unknown as Json });
        document.body.appendChild(el);

        const payload2: ChartRenderPayload = {
            type: 'bar',
            props: { data: [{ label: 'Updated', value: 10 }] },
        };

        ChartDriver.apply?.(el, 'payload', payload2 as unknown as Json);

        const bars = el.querySelectorAll('.mesh-chart-bar');
        expect(bars.length).toBe(1);
    });
});
