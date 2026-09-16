/**
 * Real DOM SVG generator and updater for ChartSurface.
 *
 * Strictly encapsulated in driver/: only this file creates SVG elements.
 */

import type { ChartRenderPayload } from '../contract/types.js';
import { calculateBars, calculateDonutArcs, linePath, areaPath, sparklinePath, type Point } from '../math/paths.js';
import { formatCompact, linearScale, niceTicks } from '../math/scales.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ChartDomInstance {
    readonly element: HTMLElement;
    update(payload: ChartRenderPayload): void;
    dispose(): void;
}

export function createChartDom(initialPayload?: ChartRenderPayload): ChartDomInstance {
    const container = document.createElement('div');
    container.className = 'mesh-chart-surface';

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'mesh-chart-svg');
    container.appendChild(svg);

    let legendEl: HTMLElement | undefined;

    const render = (payload: ChartRenderPayload) => {
        svg.replaceChildren();
        if (legendEl) {
            legendEl.remove();
            legendEl = undefined;
        }

        switch (payload.type) {
            case 'sparkline':
                renderSparkline(svg, payload.props);
                break;
            case 'line':
            case 'area':
                renderLineOrArea(svg, payload);
                break;
            case 'bar':
                renderBar(svg, payload.props);
                break;
            case 'donut': {
                const legend = renderDonut(svg, payload.props);
                if (legend) {
                    legendEl = legend;
                    container.appendChild(legend);
                }
                break;
            }
        }
    };

    if (initialPayload) {
        render(initialPayload);
    }

    return {
        element: container,
        update: render,
        dispose() {
            svg.replaceChildren();
            if (legendEl) {
                legendEl.remove();
                legendEl = undefined;
            }
        },
    };
}

function renderSparkline(svg: SVGSVGElement, props: import('../contract/types.js').SparklineProps) {
    const w = props.width ?? 120;
    const h = props.height ?? 32;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', `${w}`);
    svg.setAttribute('height', `${h}`);

    const rawData = typeof props.data === 'function' ? props.data() : props.data;
    const { line, area } = sparklinePath(rawData, w, h);

    if (props.fill !== false && area) {
        const areaPathEl = document.createElementNS(SVG_NS, 'path');
        areaPathEl.setAttribute('class', 'mesh-chart-sparkline-area');
        areaPathEl.setAttribute('d', area);
        if (props.color) areaPathEl.style.fill = props.color;
        svg.appendChild(areaPathEl);
    }

    if (line) {
        const linePathEl = document.createElementNS(SVG_NS, 'path');
        linePathEl.setAttribute('class', 'mesh-chart-sparkline-line');
        linePathEl.setAttribute('d', line);
        if (props.color) linePathEl.style.stroke = props.color;
        svg.appendChild(linePathEl);
    }
}

function renderLineOrArea(
    svg: SVGSVGElement,
    payload: { type: 'line'; props: import('../contract/types.js').LineChartProps } |
             { type: 'area'; props: import('../contract/types.js').AreaChartProps },
) {
    const { props } = payload;
    const w = props.width ?? 400;
    const h = props.height ?? 240;
    const margin = { top: 20, right: 20, bottom: 35, left: 45 };

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    const rawData = typeof props.data === 'function' ? props.data() : props.data;
    if (rawData.length === 0) return;

    const yValues = rawData.map((d) => d.y);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const ticks = niceTicks(yMin, yMax, 4);
    const domainYMin = ticks[0] ?? yMin;
    const domainYMax = ticks[ticks.length - 1] ?? yMax;

    const plotW = w - margin.left - margin.right;
    const plotH = h - margin.top - margin.bottom;

    const xScale = linearScale([0, Math.max(1, rawData.length - 1)], [margin.left, margin.left + plotW]);
    const yScale = linearScale([domainYMin, domainYMax], [margin.top + plotH, margin.top]);

    const points: Point[] = rawData.map((d, i) => ({
        x: Number(xScale(i).toFixed(1)),
        y: Number(yScale(d.y).toFixed(1)),
    }));

    // Grid lines and Y axis
    if (props.showGrid !== false) {
        const gridG = document.createElementNS(SVG_NS, 'g');
        gridG.setAttribute('class', 'mesh-chart-grid');
        const axisG = document.createElementNS(SVG_NS, 'g');
        axisG.setAttribute('class', 'mesh-chart-axis');

        for (const t of ticks) {
            const y = yScale(t);
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', String(margin.left));
            line.setAttribute('x2', String(margin.left + plotW));
            line.setAttribute('y1', String(y));
            line.setAttribute('y2', String(y));
            gridG.appendChild(line);

            const text = document.createElementNS(SVG_NS, 'text');
            text.setAttribute('x', String(margin.left - 8));
            text.setAttribute('y', String(y + 4));
            text.setAttribute('text-anchor', 'end');
            text.textContent = formatCompact(t);
            axisG.appendChild(text);
        }
        svg.appendChild(gridG);
        svg.appendChild(axisG);
    }

    // Baseline for X axis
    const axisG = document.createElementNS(SVG_NS, 'g');
    axisG.setAttribute('class', 'mesh-chart-axis');
    const baseline = document.createElementNS(SVG_NS, 'line');
    baseline.setAttribute('x1', String(margin.left));
    baseline.setAttribute('x2', String(margin.left + plotW));
    baseline.setAttribute('y1', String(margin.top + plotH));
    baseline.setAttribute('y2', String(margin.top + plotH));
    axisG.appendChild(baseline);

    // X axis labels
    const step = Math.max(1, Math.floor(rawData.length / 5));
    for (let i = 0; i < rawData.length; i += step) {
        const d = rawData[i]!;
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', String(xScale(i)));
        text.setAttribute('y', String(margin.top + plotH + 18));
        text.setAttribute('text-anchor', 'middle');
        text.textContent = String(d.x);
        axisG.appendChild(text);
    }
    svg.appendChild(axisG);

    // Area fill
    if (payload.type === 'area') {
        const areaD = areaPath(points, margin.top + plotH, props.curve ?? 'smooth');
        const areaEl = document.createElementNS(SVG_NS, 'path');
        areaEl.setAttribute('class', 'mesh-chart-area');
        areaEl.setAttribute('d', areaD);
        if (props.color) areaEl.style.fill = props.color;
        if (payload.props.fillOpacity !== undefined) {
            areaEl.style.opacity = String(payload.props.fillOpacity);
        }
        svg.appendChild(areaEl);
    }

    // Line stroke
    const lineD = linePath(points, props.curve ?? 'smooth');
    const lineEl = document.createElementNS(SVG_NS, 'path');
    lineEl.setAttribute('class', 'mesh-chart-line');
    lineEl.setAttribute('d', lineD);
    if (props.color) lineEl.style.stroke = props.color;
    svg.appendChild(lineEl);

    // Dots
    if (props.showDots) {
        const dotsG = document.createElementNS(SVG_NS, 'g');
        for (const p of points) {
            const circle = document.createElementNS(SVG_NS, 'circle');
            circle.setAttribute('cx', String(p.x));
            circle.setAttribute('cy', String(p.y));
            circle.setAttribute('r', '3.5');
            circle.setAttribute('fill', props.color ?? 'var(--ui-accent, #58a6ff)');
            circle.setAttribute('stroke', 'var(--ui-surface, #161b22)');
            circle.setAttribute('stroke-width', '1.5');
            dotsG.appendChild(circle);
        }
        svg.appendChild(dotsG);
    }
}

function renderBar(svg: SVGSVGElement, props: import('../contract/types.js').BarChartProps) {
    const w = props.width ?? 400;
    const h = props.height ?? 240;
    const margin = { top: 20, right: 20, bottom: 35, left: 45 };

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    const rawData = typeof props.data === 'function' ? props.data() : props.data;
    const bars = calculateBars(rawData, w, h, margin, props.orientation ?? 'vertical');

    // Baseline
    const axisG = document.createElementNS(SVG_NS, 'g');
    axisG.setAttribute('class', 'mesh-chart-axis');
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(margin.left));
    line.setAttribute('x2', String(w - margin.right));
    line.setAttribute('y1', String(h - margin.bottom));
    line.setAttribute('y2', String(h - margin.bottom));
    axisG.appendChild(line);

    for (const b of bars) {
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('class', 'mesh-chart-bar');
        rect.setAttribute('x', String(b.x));
        rect.setAttribute('y', String(b.y));
        rect.setAttribute('width', String(b.width));
        rect.setAttribute('height', String(b.height));
        if (b.color) rect.style.fill = b.color;
        else if (props.color) rect.style.fill = props.color;

        const title = document.createElementNS(SVG_NS, 'title');
        title.textContent = `${b.label}: ${b.value}`;
        rect.appendChild(title);
        svg.appendChild(rect);

        // Label
        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', String(b.x + b.width / 2));
        label.setAttribute('y', String(h - margin.bottom + 16));
        label.setAttribute('text-anchor', 'middle');
        label.textContent = b.label;
        axisG.appendChild(label);
    }
    svg.appendChild(axisG);
}

function renderDonut(
    svg: SVGSVGElement,
    props: import('../contract/types.js').DonutChartProps,
): HTMLElement | undefined {
    const size = props.size ?? 200;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = (size / 2) * 0.88;
    const innerR = outerR * (props.innerRadiusRatio ?? 0.6);

    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', `${size}`);
    svg.setAttribute('height', `${size}`);

    const rawData = typeof props.data === 'function' ? props.data() : props.data;
    const defaultPalette = [
        'var(--ui-accent, #58a6ff)',
        'var(--ui-success, #3fb950)',
        'var(--ui-warning, #d29922)',
        'var(--ui-danger, #f85149)',
        'var(--ui-ink-dim, #8b949e)',
    ];

    const slices = calculateDonutArcs(rawData, cx, cy, outerR, innerR);

    for (let i = 0; i < slices.length; i++) {
        const s = slices[i]!;
        const color = s.color ?? defaultPalette[i % defaultPalette.length]!;

        const pathEl = document.createElementNS(SVG_NS, 'path');
        pathEl.setAttribute('class', 'mesh-chart-donut-slice');
        pathEl.setAttribute('d', s.path);
        pathEl.style.fill = color;

        const title = document.createElementNS(SVG_NS, 'title');
        title.textContent = `${s.label}: ${s.value} (${s.percentage}%)`;
        pathEl.appendChild(title);

        svg.appendChild(pathEl);
    }

    if (props.showLegend !== false && slices.length > 0) {
        const legend = document.createElement('div');
        legend.className = 'mesh-chart-legend';

        for (let i = 0; i < slices.length; i++) {
            const s = slices[i]!;
            const color = s.color ?? defaultPalette[i % defaultPalette.length]!;

            const item = document.createElement('div');
            item.className = 'mesh-chart-legend-item';

            const swatch = document.createElement('span');
            swatch.className = 'mesh-chart-legend-swatch';
            swatch.style.background = color;

            const label = document.createElement('span');
            label.textContent = `${s.label} (${s.percentage}%)`;

            item.appendChild(swatch);
            item.appendChild(label);
            legend.appendChild(item);
        }
        return legend;
    }

    return undefined;
}
