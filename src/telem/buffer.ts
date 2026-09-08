import type { TelemEventInput } from './contract.js';

const SENSITIVE_KEY_PATTERN = /password|secret|token|ticket|auth|credential|cookie/i;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeValue(value: unknown, depth = 0): unknown {
    if (depth > 2) return '[DEPTH_LIMIT]';
    if (value === null || typeof value === 'boolean' || typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        return value.slice(0, 1024);
    }
    if (Array.isArray(value)) {
        return value.slice(0, 20).map((v) => sanitizeValue(v, depth + 1));
    }
    if (isRecord(value)) {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
            if (SENSITIVE_KEY_PATTERN.test(k)) {
                out[k] = '[REDACTED]';
            } else {
                out[k] = sanitizeValue(v, depth + 1);
            }
        }
        return out;
    }
    return String(value).slice(0, 128);
}

export function sanitizeData(data: Readonly<Record<string, unknown>>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
        if (SENSITIVE_KEY_PATTERN.test(k)) {
            out[k] = '[REDACTED]';
        } else {
            out[k] = sanitizeValue(v, 0);
        }
    }
    return out;
}

export function sanitizeEvent(raw: TelemEventInput): TelemEventInput | undefined {
    if (!raw || typeof raw.type !== 'string') return undefined;

    const base = {
        type: raw.type,
        ...(typeof raw.id === 'string' && raw.id.length > 0 ? { id: raw.id.slice(0, 64) } : {}),
        ...(raw.timestamp !== undefined ? { timestamp: raw.timestamp } : {}),
        ...(raw.level !== undefined ? { level: raw.level } : {}),
    };

    switch (raw.type) {
        case 'log':
            return {
                ...base,
                type: 'log',
                ...(raw.message !== undefined ? { message: String(raw.message).slice(0, 4096) } : {}),
                ...(raw.logger !== undefined ? { logger: String(raw.logger).slice(0, 256) } : {}),
                ...(isRecord(raw.data) ? { data: sanitizeData(raw.data) } : {}),
            };
        case 'call':
            return {
                ...base,
                type: 'call',
                ...(raw.key !== undefined ? { key: String(raw.key).slice(0, 256) } : {}),
                ...(typeof raw.durationMs === 'number' && Number.isFinite(raw.durationMs) && raw.durationMs >= 0
                    ? { durationMs: Math.round(raw.durationMs) }
                    : {}),
                ...(raw.outcome === 'ok' || raw.outcome === 'error' ? { outcome: raw.outcome } : {}),
                ...(raw.errorKind !== undefined ? { errorKind: String(raw.errorKind).slice(0, 256) } : {}),
                ...(typeof raw.status === 'number' && Number.isInteger(raw.status) ? { status: raw.status } : {}),
            };
        case 'boot':
            return {
                ...base,
                type: 'boot',
                ...(raw.partId !== undefined ? { partId: String(raw.partId).slice(0, 256) } : {}),
                ...(typeof raw.order === 'number' && Number.isInteger(raw.order) ? { order: raw.order } : {}),
                ...(raw.bootStatus === 'mounted' || raw.bootStatus === 'failed' || raw.bootStatus === 'skipped'
                    ? { bootStatus: raw.bootStatus }
                    : {}),
            };
        case 'error':
            return {
                ...base,
                type: 'error',
                ...(raw.message !== undefined ? { message: String(raw.message).slice(0, 4096) } : {}),
                ...(raw.errorKind !== undefined ? { errorKind: String(raw.errorKind).slice(0, 256) } : {}),
                ...(raw.stack !== undefined ? { stack: String(raw.stack).slice(0, 8192) } : {}),
                ...(raw.filename !== undefined ? { filename: String(raw.filename).slice(0, 1024) } : {}),
                ...(typeof raw.lineno === 'number' && Number.isInteger(raw.lineno) ? { lineno: raw.lineno } : {}),
                ...(typeof raw.colno === 'number' && Number.isInteger(raw.colno) ? { colno: raw.colno } : {}),
            };
        case 'request':
            return {
                ...base,
                type: 'request',
                ...(raw.method !== undefined ? { method: String(raw.method).slice(0, 16) } : {}),
                ...(raw.host !== undefined ? { host: String(raw.host).slice(0, 256) } : {}),
                ...(raw.path !== undefined ? { path: String(raw.path).slice(0, 2048) } : {}),
            };
        default:
            return undefined;
    }
}

export interface EventBuffer {
    push(event: TelemEventInput): boolean;
    drain(maxCount?: number): readonly TelemEventInput[];
    size(): number;
    droppedCount(): number;
    recordDropped(count: number): void;
    clear(): void;
}

export function createEventBuffer(maxCapacity = 500): EventBuffer {
    const queue: TelemEventInput[] = [];
    let dropped = 0;

    return {
        push(raw: TelemEventInput): boolean {
            const sanitized = sanitizeEvent(raw);
            if (sanitized === undefined) return false;

            if (queue.length >= maxCapacity) {
                queue.shift();
                dropped++;
            }
            queue.push(sanitized);
            return true;
        },

        drain(maxCount = 100): readonly TelemEventInput[] {
            const count = Math.min(maxCount, queue.length);
            if (count === 0) return [];
            return queue.splice(0, count);
        },

        size(): number {
            return queue.length;
        },

        droppedCount(): number {
            return dropped;
        },

        recordDropped(count: number): void {
            if (count > 0) {
                dropped += count;
            }
        },

        clear(): void {
            queue.length = 0;
        },
    };
}
