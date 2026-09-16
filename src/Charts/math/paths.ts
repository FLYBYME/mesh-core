/**
 * Pure SVG path math and coordinate layout generators.
 *
 * Generates path d-strings and layout geometries without any DOM creation.
 */

import { linearScale } from './scales.js';

export interface Point {
    readonly x: number;
    readonly y: number;
}

export function linePath(points: readonly Point[], curve: 'linear' | 'smooth' = 'linear'): string {
    if (points.length === 0) return '';
    const first = points[0]!;
    if (points.length === 1) return `M ${first.x} ${first.y}`;

    if (curve === 'linear') {
        let d = `M ${first.x} ${first.y}`;
        for (let i = 1; i < points.length; i++) {
            const p = points[i]!;
            d += ` L ${p.x} ${p.y}`;
        }
        return d;
    }

    // Smooth cubic Bézier interpolation
    let d = `M ${first.x} ${first.y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1]! : points[i]!;
        const p1 = points[i]!;
        const p2 = points[i + 1]!;
        const p3 = i < points.length - 2 ? points[i + 2]! : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
}

export function areaPath(
    points: readonly Point[],
    baselineY: number,
    curve: 'linear' | 'smooth' = 'linear',
): string {
    if (points.length === 0) return '';
    const line = linePath(points, curve);
    const first = points[0]!;
    const last = points[points.length - 1]!;
    return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

export function sparklinePath(
    values: readonly number[],
    width: number,
    height: number,
    padding = 2,
): { line: string; area: string } {
    if (values.length === 0) return { line: '', area: '' };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const innerW = Math.max(1, width - padding * 2);
    const innerH = Math.max(1, height - padding * 2);

    const xScale = linearScale([0, Math.max(1, values.length - 1)], [padding, padding + innerW]);
    // Invert Y so higher numbers are near top
    const yScale = linearScale([min, max], [padding + innerH, padding]);

    const points: Point[] = values.map((val, i) => ({
        x: Number(xScale(i).toFixed(1)),
        y: Number(yScale(val).toFixed(1)),
    }));

    const baselineY = padding + innerH;
    return {
        line: linePath(points, 'smooth'),
        area: areaPath(points, baselineY, 'smooth'),
    };
}

export interface BarGeometry {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly label: string;
    readonly value: number;
    readonly color?: string | undefined;
}

export function calculateBars(
    items: readonly { readonly label: string; readonly value: number; readonly color?: string | undefined }[],
    totalWidth: number,
    totalHeight: number,
    margin = { top: 20, right: 20, bottom: 30, left: 40 },
    orientation: 'vertical' | 'horizontal' = 'vertical',
): BarGeometry[] {
    if (items.length === 0) return [];
    const maxVal = Math.max(1, ...items.map((i) => Math.max(0, i.value)));
    const plotW = Math.max(1, totalWidth - margin.left - margin.right);
    const plotH = Math.max(1, totalHeight - margin.top - margin.bottom);

    if (orientation === 'vertical') {
        const slotW = plotW / items.length;
        const barW = Math.max(2, slotW * 0.65);
        const barOffset = (slotW - barW) / 2;

        return items.map((item, idx) => {
            const clampedVal = Math.max(0, item.value);
            const h = (clampedVal / maxVal) * plotH;
            return {
                x: Number((margin.left + idx * slotW + barOffset).toFixed(1)),
                y: Number((margin.top + plotH - h).toFixed(1)),
                width: Number(barW.toFixed(1)),
                height: Number(h.toFixed(1)),
                label: item.label,
                value: item.value,
                color: item.color,
            };
        });
    }

    // Horizontal bars
    const slotH = plotH / items.length;
    const barH = Math.max(2, slotH * 0.65);
    const barOffset = (slotH - barH) / 2;

    return items.map((item, idx) => {
        const clampedVal = Math.max(0, item.value);
        const w = (clampedVal / maxVal) * plotW;
        return {
            x: margin.left,
            y: Number((margin.top + idx * slotH + barOffset).toFixed(1)),
            width: Number(w.toFixed(1)),
            height: Number(barH.toFixed(1)),
            label: item.label,
            value: item.value,
            color: item.color,
        };
    });
}

export interface DonutArcGeometry {
    readonly path: string;
    readonly label: string;
    readonly value: number;
    readonly color?: string | undefined;
    readonly percentage: number;
}

export function calculateDonutArcs(
    slices: readonly { readonly label: string; readonly value: number; readonly color?: string | undefined }[],
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
): DonutArcGeometry[] {
    const total = slices.reduce((acc, s) => acc + Math.max(0, s.value), 0);
    if (total === 0) return [];

    let currentAngle = -Math.PI / 2; // Start at 12 o'clock

    return slices.map((slice) => {
        const fraction = Math.max(0, slice.value) / total;
        // Clamp to slightly less than 2*PI to prevent start and end points from collapsing
        const angle = Math.min(fraction * 2 * Math.PI, 2 * Math.PI - 0.0001);
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        const x1 = cx + outerR * Math.cos(startAngle);
        const y1 = cy + outerR * Math.sin(startAngle);
        const x2 = cx + outerR * Math.cos(endAngle);
        const y2 = cy + outerR * Math.sin(endAngle);

        const x3 = cx + innerR * Math.cos(endAngle);
        const y3 = cy + innerR * Math.sin(endAngle);
        const x4 = cx + innerR * Math.cos(startAngle);
        const y4 = cy + innerR * Math.sin(startAngle);

        const largeArc = angle > Math.PI ? 1 : 0;

        const path = [
            `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
            `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`,
            `L ${x3.toFixed(1)} ${y3.toFixed(1)}`,
            `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4.toFixed(1)} ${y4.toFixed(1)}`,
            'Z',
        ].join(' ');

        return {
            path,
            label: slice.label,
            value: slice.value,
            color: slice.color,
            percentage: Number((fraction * 100).toFixed(1)),
        };
    });
}
