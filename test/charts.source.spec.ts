/**
 * Source assertion and math unit tests for the Charts subsystem.
 *
 * Runs under Node (.spec.ts) to verify architectural isolation:
 * - contract/, math/, and components/ contain ZERO DOM calls.
 * - Math functions calculate accurate scales, ticks, paths, and geometries.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    areaPath,
    calculateBars,
    calculateDonutArcs,
    formatCompact,
    linearScale,
    linePath,
    niceTicks,
    sparklinePath,
} from '../src/Charts/math/index.js';

const sourceFiles = (dir: string, ext?: string): readonly string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...sourceFiles(path, ext));
        else if (!ext || entry.name.endsWith(ext)) out.push(path);
    }
    return out;
};

const stripComments = (content: string): string =>
    content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('Charts architectural isolation', () => {
    const nonDriverTsFiles = [
        ...sourceFiles('src/Charts/contract', '.ts'),
        ...sourceFiles('src/Charts/math', '.ts'),
        ...sourceFiles('src/Charts/components', '.ts'),
    ];

    it('contains files to verify', () => {
        expect(nonDriverTsFiles.length).toBeGreaterThan(5);
    });

    it('calls document.createElement nowhere in contract, math, or components', () => {
        const offenders = nonDriverTsFiles.filter((p) =>
            /document\s*\.\s*createElement/.test(stripComments(readFileSync(p, 'utf8'))),
        );
        expect(offenders).toEqual([]);
    });

    it('accesses no browser globals in contract, math, or components', () => {
        const globalRe = /(?<![\w$.])(?:globalThis|window|document|localStorage|sessionStorage)\s*[.[]/;
        const offenders = nonDriverTsFiles.filter((p) =>
            globalRe.test(stripComments(readFileSync(p, 'utf8'))),
        );
        expect(offenders).toEqual([]);
    });
});

describe('Charts math: linearScale & niceTicks', () => {
    it('scales values accurately across domain and range', () => {
        const scale = linearScale([0, 100], [0, 500]);
        expect(scale(0)).toBe(0);
        expect(scale(50)).toBe(250);
        expect(scale(100)).toBe(500);
    });

    it('handles inverted Y ranges (SVG coordinate projection)', () => {
        const scale = linearScale([0, 100], [200, 0]);
        expect(scale(0)).toBe(200);
        expect(scale(50)).toBe(100);
        expect(scale(100)).toBe(0);
    });

    it('handles single-point / zero-span domains safely', () => {
        const scale = linearScale([50, 50], [0, 200]);
        expect(scale(50)).toBe(100);
    });

    it('generates clean human-readable ticks', () => {
        const ticks = niceTicks(0, 100, 5);
        expect(ticks[0]).toBeLessThanOrEqual(0);
        expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(100);
        expect(ticks.length).toBeGreaterThanOrEqual(4);
    });

    it('formats compact values', () => {
        expect(formatCompact(500)).toBe('500');
        expect(formatCompact(1500)).toBe('1.5k');
        expect(formatCompact(2500000)).toBe('2.5M');
    });
});

describe('Charts math: SVG paths & geometries', () => {
    it('generates linear and smooth line paths', () => {
        const points = [
            { x: 0, y: 100 },
            { x: 50, y: 20 },
            { x: 100, y: 80 },
        ];

        const linear = linePath(points, 'linear');
        expect(linear).toBe('M 0 100 L 50 20 L 100 80');

        const smooth = linePath(points, 'smooth');
        expect(smooth).toContain('C');
    });

    it('generates closed area paths', () => {
        const points = [
            { x: 0, y: 50 },
            { x: 100, y: 20 },
        ];
        const area = areaPath(points, 200, 'linear');
        expect(area).toBe('M 0 50 L 100 20 L 100 200 L 0 200 Z');
    });

    it('generates sparkline line and area', () => {
        const spark = sparklinePath([10, 20, 15, 35, 25], 120, 32);
        expect(spark.line).toContain('M');
        expect(spark.area).toContain('Z');
    });

    it('calculates vertical and horizontal bar geometries', () => {
        const items = [
            { label: 'A', value: 10 },
            { label: 'B', value: 20 },
        ];

        const vertical = calculateBars(items, 200, 100);
        expect(vertical.length).toBe(2);
        expect(vertical[0]?.height).toBeLessThan(vertical[1]!.height);

        const horizontal = calculateBars(items, 200, 100, undefined, 'horizontal');
        expect(horizontal.length).toBe(2);
        expect(horizontal[0]?.width).toBeLessThan(horizontal[1]!.width);
    });

    it('calculates donut arc slices with percentage shares', () => {
        const slices = [
            { label: 'OK', value: 75 },
            { label: 'ERR', value: 25 },
        ];

        const arcs = calculateDonutArcs(slices, 100, 100, 80, 50);
        expect(arcs.length).toBe(2);
        expect(arcs[0]?.percentage).toBe(75);
        expect(arcs[1]?.percentage).toBe(25);
        expect(arcs[0]?.path).toContain('A');
    });

    it('handles single 100% donut slice without collapsing arc endpoints', () => {
        const slices = [{ label: 'ALL', value: 100 }];
        const arcs = calculateDonutArcs(slices, 100, 100, 80, 50);
        expect(arcs.length).toBe(1);
        expect(arcs[0]?.percentage).toBe(100);
        // Path must contain arc command with non-zero length
        expect(arcs[0]?.path).toContain('A 80 80');
    });

    it('clamps negative bar values to non-negative heights and widths', () => {
        const items = [
            { label: 'Loss', value: -50 },
            { label: 'Zero', value: 0 },
            { label: 'Gain', value: 100 },
        ];

        const vertical = calculateBars(items, 200, 100);
        expect(vertical.length).toBe(3);
        expect(vertical[0]?.height).toBe(0);
        expect(vertical[1]?.height).toBe(0);
        expect(vertical[2]?.height).toBeGreaterThan(0);
    });
});
