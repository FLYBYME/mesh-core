import type { TelemIngestInput } from './contract.js';

export interface TransportOptions {
    readonly endpoint: string;
    readonly isClosing?: boolean | undefined;
    readonly sendBeacon?: ((url: string, data: BodyInit) => boolean) | undefined;
    readonly fetch?: ((url: string, init?: RequestInit) => Promise<Response>) | undefined;
}

export async function sendTelemetryBatch(
    payload: TelemIngestInput,
    options: TransportOptions,
): Promise<boolean> {
    const json = JSON.stringify(payload);
    const endpoint = options.endpoint;

    if (options.isClosing) {
        // Tab closing / unload path: prioritize sendBeacon to survive tab destruction
        const beaconFn = options.sendBeacon
            ?? (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function'
                ? navigator.sendBeacon.bind(navigator)
                : undefined);

        if (beaconFn !== undefined) {
            try {
                const blob = typeof Blob !== 'undefined'
                    ? new Blob([json], { type: 'application/json' })
                    : json;
                const enqueued = beaconFn(endpoint, blob);
                if (enqueued) return true;
            } catch {
                // sendBeacon may throw if payload exceeds beacon quota; fallback to fetch keepalive
            }
        }

        // Fallback: fetch with keepalive: true
        const fetchFn = options.fetch
            ?? (typeof globalThis.fetch === 'function' ? globalThis.fetch : undefined);

        if (fetchFn !== undefined) {
            try {
                const res = await fetchFn(endpoint, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: json,
                    keepalive: true,
                });
                return res.ok;
            } catch {
                return false;
            }
        }
        return false;
    }

    // Normal foreground flush
    const fetchFn = options.fetch
        ?? (typeof globalThis.fetch === 'function' ? globalThis.fetch : undefined);

    if (fetchFn === undefined) return false;

    try {
        const res = await fetchFn(endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: json,
        });
        return res.ok;
    } catch {
        return false;
    }
}
