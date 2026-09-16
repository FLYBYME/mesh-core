/**
 * Coordinate projection and mathematical scaling for charts.
 *
 * Completely pure math. Zero DOM dependencies.
 */

export function linearScale(
    domain: readonly [number, number],
    range: readonly [number, number],
): (val: number) => number {
    const [d0, d1] = domain;
    const [r0, r1] = range;
    const dSpan = d1 - d0;
    const rSpan = r1 - r0;

    if (Math.abs(dSpan) < Number.EPSILON) {
        const mid = (r0 + r1) / 2;
        return () => mid;
    }

    return (val: number) => {
        const normalized = (val - d0) / dSpan;
        return r0 + normalized * rSpan;
    };
}

export function niceTicks(min: number, max: number, count = 5): number[] {
    if (min === max) return [min];
    if (min > max) [min, max] = [max, min];

    const span = max - min;
    const rawStep = span / Math.max(1, count);
    const power = Math.floor(Math.log10(rawStep));
    const fraction = rawStep / Math.pow(10, power);

    let niceFraction: number;
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;

    const step = niceFraction * Math.pow(10, power);
    const start = Math.floor(min / step) * step;
    const end = Math.ceil(max / step) * step;

    const ticks: number[] = [];
    for (let cur = start; cur <= end + step * 0.5; cur += step) {
        // Round to eliminate floating point inaccuracies
        const precision = Math.max(0, -power);
        const rounded = Number(cur.toFixed(precision));
        ticks.push(rounded);
    }
    return ticks;
}

export function formatCompact(value: number): string {
    if (Math.abs(value) >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    if (Number.isInteger(value)) {
        return String(value);
    }
    return value.toFixed(2).replace(/\.00$/, '');
}
