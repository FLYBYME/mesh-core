import { describe, expect, it } from 'vitest';

import descriptor from '../descriptor.json';
import { formatRoute, parseRoute, type Route } from '../src/nav/router.js';
import { CONSUMED_ACTIONS, OPERATOR_VIEWS, OPERATOR_STATES } from '../src/operator/contract.js';

declare global {
    interface ImportMeta {
        readonly glob: <T = unknown>(
            pattern: string,
            options?: { query?: string; import?: string; eager?: boolean },
        ) => Record<string, T>;
    }
}

const OWNED_DOMAINS = new Set([
    'part',
    'partVersion',
    'release',
    'site',
    'node',
    'group',
    'builder',
    'catalog',
    'cdn',
]);

const operatorFiles = import.meta.glob<string>('../src/operator/**/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
});

describe('Operator spec conformance (spec/apps/operator.md §8)', () => {
    it('consumes every action the API exposes on its collections and domains', () => {
        const calls = descriptor.calls;

        const exposedOwnedCalls = calls.filter((c) => {
            if (!OWNED_DOMAINS.has(c.domain)) return false;
            if (c.gate?.level === 'internal') return false;
            return true;
        });

        const consumedSet = new Set<string>(CONSUMED_ACTIONS);
        const missing: string[] = [];

        for (const call of exposedOwnedCalls) {
            if (!consumedSet.has(call.key)) {
                missing.push(call.key);
            }
        }

        expect(
            missing,
            `The API exposes actions on collections this app owns that operator does not consume: ${missing.join(', ')}`,
        ).toEqual([]);
    });

    it('round-trips all routes defined in spec §7', () => {
        const routes: readonly Route[] = [
            { owner: 'operator', view: 'parts', params: {} },
            { owner: 'operator', view: 'parts', params: { name: 'mesh-web' } },
            { owner: 'operator', view: 'parts', params: { name: '@flybyme/mesh-web' } }, // contains '/'
            { owner: 'operator', view: 'releases', params: {} },
            { owner: 'operator', view: 'releases', params: { hash: 'sha256:abc123def' } },
            { owner: 'operator', view: 'sites', params: {} },
            { owner: 'operator', view: 'sites', params: { host: 'console.localhost' } },
            { owner: 'operator', view: 'fleet', params: {} },
            { owner: 'operator', view: 'fleet', params: { hostname: 'node-1' } },
            { owner: 'operator', view: 'fleet', params: { group: 'genesis' } },
        ];

        for (const r of routes) {
            const formatted = formatRoute(r);
            const parsed = parseRoute(formatted);
            expect(parsed).toEqual(r);
        }
    });

    it('defines all four views and all five states per spec §2 and §6', () => {
        expect(OPERATOR_VIEWS).toEqual(['parts', 'releases', 'sites', 'fleet']);
        expect(OPERATOR_STATES).toEqual(['loading', 'empty', 'unauthenticated', 'refused', 'error']);
    });

    it('satisfies structural file length limits', () => {
        const filePaths = Object.keys(operatorFiles);
        expect(filePaths.length, 'Operator must have source files').toBeGreaterThan(0);

        for (const [path, content] of Object.entries(operatorFiles)) {
            if (typeof content !== 'string') continue;
            const lines = content.split('\n').length;
            if (path.endsWith('/src/operator/index.ts')) {
                expect(
                    lines,
                    `src/operator/index.ts must be under 250 lines (currently ${lines})`,
                ).toBeLessThan(250);
            } else {
                expect(
                    lines,
                    `${path} must be under 300 lines (currently ${lines})`,
                ).toBeLessThan(300);
            }
        }
    });
});
