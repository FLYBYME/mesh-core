/**
 * The telem Extension, in a real browser.
 *
 * Verifies the five safety and correctness invariants:
 * 1. activate must not throw, ever, whatever it finds
 * 2. it must not block boot — no awaiting a POST during activation
 * 3. a failing endpoint degrades to dropping events, not to retrying forever or growing buffers
 * 4. tab closing flush via visibilitychange and navigator.sendBeacon
 * 5. privacy: call keys and outcomes only, never inputs, arguments, or credentials
 */

import { describe, expect, it, afterEach } from 'vitest';
import { mountPart } from '@flybyme/mesh-web/testing';
import { createLogBuffer } from '@flybyme/mesh-web';
import TelemExtension, {
    TELEM,
    sanitizeData,
    type TelemContext,
    type TelemIngestInput,
} from '../src/telem/index.js';

let site: { dispose(): void } | undefined;
afterEach(() => {
    site?.dispose();
    site = undefined;
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseIngestPayload(body: BodyInit | null | undefined): TelemIngestInput | undefined {
    if (!body) return undefined;
    const parsed: unknown = JSON.parse(String(body));
    if (!isRecord(parsed)) return undefined;
    if (typeof parsed.sessionId !== 'string') return undefined;
    const rawEvents = parsed.events;
    if (!Array.isArray(rawEvents)) return undefined;
    return {
        sessionId: parsed.sessionId,
        ...(typeof parsed.host === 'string' ? { host: parsed.host } : {}),
        events: rawEvents,
    };
}

function createMockContext(): TelemContext {
    return {
        id: 'telem',
        onDispose: () => {},
        use: () => { throw new Error('No consumable providers declared'); },
        http: {
            request: async () => ({ ok: true, status: 200, body: undefined }),
            get: async () => ({ ok: true, status: 200, body: undefined }),
            post: async () => ({ ok: true, status: 200, body: undefined }),
        },
    };
}

describe('the telem Extension', () => {
    it('activates and provides TELEM via mountPart', async () => {
        const s = await mountPart({
            parts: [{ id: 'telem', contribution: TelemExtension }],
        });
        site = s;

        const telem = s.kernel.provided(TELEM);
        expect(telem).toBeDefined();
        expect(typeof telem?.sessionId).toBe('string');
        expect(telem?.sessionId.length).toBeGreaterThan(0);
    });

    it('declares needs(http) in its manifest', async () => {
        const ext = new TelemExtension();
        expect(ext.needs).toContain('http');
    });

    it('activate must not throw, ever, whatever options it finds', async () => {
        const brokenOptions = {
            endpoint: 'invalid://endpoint',
            logs: {
                get length(): number {
                    throw new Error('Exploding logs property');
                },
                capacity: 100,
                dropped: 0,
                subscribe: () => {
                    throw new Error('Exploding subscribe');
                },
            },
        };

        const s = await mountPart({
            parts: [{
                id: 'telem',
                contribution: TelemExtension,
                options: brokenOptions,
            }],
        });
        site = s;

        const telem = s.kernel.provided(TELEM);
        expect(telem).toBeDefined();
    });

    it('must not block boot — activation completes synchronously without waiting for network', async () => {
        let postCompleted = false;

        const hangingFetch = async (): Promise<Response> => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            postCompleted = true;
            return new Response('{"accepted":1,"dropped":0}', { status: 200 });
        };

        const startTime = Date.now();
        const s = await mountPart({
            parts: [{
                id: 'telem',
                contribution: TelemExtension,
                options: {
                    fetch: hangingFetch,
                    flushIntervalMs: 0,
                },
            }],
        });
        site = s;

        // Boot should finish immediately, not waiting 500ms
        const bootDuration = Date.now() - startTime;
        expect(bootDuration).toBeLessThan(400);

        const telem = s.kernel.provided(TELEM);
        expect(telem).toBeDefined();
        expect(postCompleted).toBe(false);
    });

    it('a failing endpoint degrades to dropping events without unbounded buffer growth', async () => {
        let attempts = 0;
        const failingFetch = async (): Promise<Response> => {
            attempts++;
            // 404 simulates telem.ingest missing from site mesh list
            return new Response('{"error":"not_found"}', { status: 404 });
        };

        const ext = new TelemExtension({
            fetch: failingFetch,
            maxBufferSize: 50,
            maxBatchSize: 100,
            flushIntervalMs: 0,
        });

        const api = ext.activate(createMockContext());

        // Push 60 events (exceeding maxBufferSize of 50)
        for (let i = 0; i < 60; i++) {
            api.recordCall({
                key: `call.${i}`,
                outcome: 'ok',
                durationMs: 10,
            });
        }

        // Buffer was capped at 50, so 10 were dropped on insertion
        expect(api.droppedCount()).toBe(10);
        expect(api.bufferSize()).toBe(50);

        // Explicit flush sends one batch of 50 and drops it due to 404 failure
        await api.flush();
        expect(attempts).toBe(1);
        expect(api.bufferSize()).toBe(0);
        expect(api.droppedCount()).toBe(60);

        // Subsequent flush has nothing to retry — no infinite retry loops
        await api.flush();
        expect(attempts).toBe(1);
    });

    it('the last batch survives tab closing: flushes on visibilitychange and uses navigator.sendBeacon', async () => {
        let beaconUrl: string | undefined;
        let beaconPayload: string | undefined;

        const mockSendBeacon = (url: string, data: BodyInit): boolean => {
            beaconUrl = url;
            if (typeof data === 'string') {
                beaconPayload = data;
            } else if (data instanceof Blob) {
                beaconPayload = 'blob_received';
            }
            return true;
        };

        const s = await mountPart({
            parts: [{
                id: 'telem',
                contribution: TelemExtension,
                options: {
                    endpoint: '/api/telem/ingest',
                    sendBeacon: mockSendBeacon,
                    flushIntervalMs: 0,
                },
            }],
        });
        site = s;

        const telem = s.kernel.provided(TELEM);
        expect(telem).toBeDefined();

        telem?.recordCall({
            key: 'release.find',
            outcome: 'ok',
            durationMs: 42,
        });

        expect(telem?.bufferSize()).toBe(1);

        // Simulate tab hiding / closing via visibilitychange
        Object.defineProperty(document, 'visibilityState', {
            value: 'hidden',
            configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));

        // Wait a microtick
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(beaconUrl).toBe('/api/telem/ingest');
        expect(beaconPayload).toBeDefined();
        expect(telem?.bufferSize()).toBe(0);

        // Reset visibilityState
        Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            configurable: true,
        });
    });

    it('falls back to fetch with keepalive when sendBeacon is unavailable during tab closing', async () => {
        let fetchUrl: string | undefined;
        let fetchInit: RequestInit | undefined;

        const mockFetch = async (url: string, init?: RequestInit): Promise<Response> => {
            fetchUrl = url;
            fetchInit = init;
            return new Response('{"accepted":1,"dropped":0}', { status: 200 });
        };

        const s = await mountPart({
            parts: [{
                id: 'telem',
                contribution: TelemExtension,
                options: {
                    endpoint: '/api/telem/ingest',
                    sendBeacon: null,
                    fetch: mockFetch,
                    flushIntervalMs: 0,
                },
            }],
        });
        site = s;

        const telem = s.kernel.provided(TELEM);
        telem?.recordCall({
            key: 'catalog.resolve',
            outcome: 'ok',
            durationMs: 12,
        });

        // Simulate pagehide
        window.dispatchEvent(new Event('pagehide'));
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(fetchUrl).toBe('/api/telem/ingest');
        expect(fetchInit?.keepalive).toBe(true);
        expect(telem?.bufferSize()).toBe(0);
    });

    it('collects logs from createLogBuffer including initial logs', async () => {
        const logs = createLogBuffer();
        logs.push({ level: 'info', source: 'kernel', message: 'boot start' });
        logs.push({ level: 'warn', source: 'auth', message: 'ticket expired' });

        const sentBatches: TelemIngestInput[] = [];
        const mockFetch = async (_url: string, init?: RequestInit): Promise<Response> => {
            const payload = parseIngestPayload(init?.body);
            if (payload !== undefined) {
                sentBatches.push(payload);
            }
            return new Response('{"accepted":2,"dropped":0}', { status: 200 });
        };

        const s = await mountPart({
            parts: [{
                id: 'telem',
                contribution: TelemExtension,
                options: {
                    logs,
                    fetch: mockFetch,
                    flushIntervalMs: 0,
                },
            }],
        });
        site = s;

        const telem = s.kernel.provided(TELEM);
        expect(telem).toBeDefined();

        // Initial logs should be queued
        expect(telem?.bufferSize()).toBe(2);

        // Push another log
        logs.push({ level: 'error', source: 'fleet', message: 'node unreachable' });
        expect(telem?.bufferSize()).toBe(3);

        await telem?.flush();
        expect(sentBatches).toHaveLength(1);
        const batch0 = sentBatches[0];
        expect(batch0).toBeDefined();
        if (!batch0) return;

        expect(batch0.events).toHaveLength(3);
        expect(batch0.events[0]).toMatchObject({
            type: 'log',
            level: 'info',
            logger: 'kernel',
            message: 'boot start',
        });
        expect(batch0.events[1]).toMatchObject({
            type: 'log',
            level: 'warn',
            logger: 'auth',
            message: 'ticket expired',
        });
        expect(batch0.events[2]).toMatchObject({
            type: 'log',
            level: 'error',
            logger: 'fleet',
            message: 'node unreachable',
        });
    });

    it('collects unhandled errors and rejections from window', async () => {
        const sentBatches: TelemIngestInput[] = [];
        const mockFetch = async (_url: string, init?: RequestInit): Promise<Response> => {
            const payload = parseIngestPayload(init?.body);
            if (payload !== undefined) {
                sentBatches.push(payload);
            }
            return new Response('{"accepted":2,"dropped":0}', { status: 200 });
        };

        const s = await mountPart({
            parts: [{
                id: 'telem',
                contribution: TelemExtension,
                options: {
                    fetch: mockFetch,
                    flushIntervalMs: 0,
                },
            }],
        });
        site = s;

        const telem = s.kernel.provided(TELEM);

        // Dispatch window error
        const errorEv = new ErrorEvent('error', {
            message: 'Uncaught TypeError: something failed',
            filename: 'bundle.js',
            lineno: 42,
            colno: 10,
            error: new TypeError('something failed'),
        });
        window.dispatchEvent(errorEv);

        // Dispatch unhandled rejection
        const rejectionEv = new CustomEvent('unhandledrejection', {
            detail: {
                reason: new Error('Network timeout'),
            },
        });
        Object.defineProperty(rejectionEv, 'reason', { value: new Error('Network timeout') });
        window.dispatchEvent(rejectionEv);

        expect(telem?.bufferSize()).toBe(2);

        await telem?.flush();
        expect(sentBatches).toHaveLength(1);
        const batch0 = sentBatches[0];
        expect(batch0).toBeDefined();
        if (!batch0) return;

        expect(batch0.events[0]).toMatchObject({
            type: 'error',
            level: 'error',
            message: 'Uncaught TypeError: something failed',
            filename: 'bundle.js',
            lineno: 42,
            colno: 10,
        });
        expect(batch0.events[1]).toMatchObject({
            type: 'error',
            level: 'error',
            message: 'Network timeout',
        });
    });

    it('respects privacy invariants: records call key and outcome only, never arguments or credentials', async () => {
        const sentBatches: TelemIngestInput[] = [];
        const mockFetch = async (_url: string, init?: RequestInit): Promise<Response> => {
            const payload = parseIngestPayload(init?.body);
            if (payload !== undefined) {
                sentBatches.push(payload);
            }
            return new Response('{"accepted":1,"dropped":0}', { status: 200 });
        };

        const s = await mountPart({
            parts: [{
                id: 'telem',
                contribution: TelemExtension,
                options: {
                    fetch: mockFetch,
                    flushIntervalMs: 0,
                },
            }],
        });
        site = s;

        const telem = s.kernel.provided(TELEM);
        telem?.recordCall({
            key: 'identity.ticket_issue',
            outcome: 'error',
            durationMs: 85,
            errorKind: 'unauthorized',
            status: 401,
        });

        await telem?.flush();
        expect(sentBatches).toHaveLength(1);
        const batch0 = sentBatches[0];
        expect(batch0).toBeDefined();
        if (!batch0) return;

        const event = batch0.events[0];
        expect(event).toBeDefined();
        if (!event) return;

        expect(event).toMatchObject({
            type: 'call',
            key: 'identity.ticket_issue',
            outcome: 'error',
            durationMs: 85,
            errorKind: 'unauthorized',
            status: 401,
        });

        // Ensure NO input/argument/password/ticket fields exist in the payload
        const record: Record<string, unknown> = { ...event };
        expect(record.arguments).toBeUndefined();
        expect(record.input).toBeUndefined();
        expect(record.password).toBeUndefined();
        expect(record.ticket).toBeUndefined();
        expect(record.token).toBeUndefined();
    });

    it('redacts sensitive keys from log data', () => {
        const sanitized = sanitizeData({
            user: 'alice',
            password: 'supersecretpassword',
            sessionToken: 'xyz123',
            authHeader: 'Bearer abc',
            count: 5,
        });

        expect(sanitized.user).toBe('alice');
        expect(sanitized.count).toBe(5);
        expect(sanitized.password).toBe('[REDACTED]');
        expect(sanitized.sessionToken).toBe('[REDACTED]');
        expect(sanitized.authHeader).toBe('[REDACTED]');
    });

    it('enforces maximum 100 events per batch according to server schema', async () => {
        const sentBatches: TelemIngestInput[] = [];
        const mockFetch = async (_url: string, init?: RequestInit): Promise<Response> => {
            const payload = parseIngestPayload(init?.body);
            if (payload !== undefined) {
                sentBatches.push(payload);
            }
            return new Response('{"accepted":100,"dropped":0}', { status: 200 });
        };

        const ext = new TelemExtension({
            fetch: mockFetch,
            maxBatchSize: 100,
            flushIntervalMs: 0,
        });

        const api = ext.activate(createMockContext());

        // Push 150 events
        for (let i = 0; i < 150; i++) {
            api.recordCall({
                key: `test.call.${i}`,
                outcome: 'ok',
            });
        }

        // Flush first batch
        await api.flush();
        expect(sentBatches).toHaveLength(1);
        const batch0 = sentBatches[0];
        expect(batch0).toBeDefined();
        if (!batch0) return;
        expect(batch0.events.length).toBe(100);

        // Flush remaining batch
        await api.flush();
        expect(sentBatches).toHaveLength(2);
        const batch1 = sentBatches[1];
        expect(batch1).toBeDefined();
        if (!batch1) return;
        expect(batch1.events.length).toBe(50);
    });

    it('maintains a stable sessionId across multiple flushes', async () => {
        const sentBatches: TelemIngestInput[] = [];
        const mockFetch = async (_url: string, init?: RequestInit): Promise<Response> => {
            const payload = parseIngestPayload(init?.body);
            if (payload !== undefined) {
                sentBatches.push(payload);
            }
            return new Response('{"accepted":1,"dropped":0}', { status: 200 });
        };

        const ext = new TelemExtension({
            fetch: mockFetch,
            flushIntervalMs: 0,
        });

        const api = ext.activate(createMockContext());

        api.recordCall({ key: 'call1', outcome: 'ok' });
        await api.flush();

        api.recordCall({ key: 'call2', outcome: 'ok' });
        await api.flush();

        expect(sentBatches).toHaveLength(2);
        const batch0 = sentBatches[0];
        const batch1 = sentBatches[1];
        expect(batch0).toBeDefined();
        expect(batch1).toBeDefined();
        if (!batch0 || !batch1) return;

        expect(batch0.sessionId).toBe(api.sessionId);
        expect(batch1.sessionId).toBe(api.sessionId);
    });
});
