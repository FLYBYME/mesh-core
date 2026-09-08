/**
 * The telem Extension.
 *
 * Collects from the page (logs, contract calls, boot status, unhandled errors)
 * and POSTs batched telemetry to `telem.ingest`.
 *
 * ## Invariants
 *
 * - Activate must not throw, ever, whatever it finds.
 * - Must not block boot — no awaiting a POST during activation.
 * - Failing endpoint degrades to dropping events, never retrying forever or growing buffers without bound.
 * - The last batch survives tab closing: flushes on `visibilitychange` and uses `navigator.sendBeacon`.
 * - Privacy: Call keys and outcomes only, never inputs, arguments, credentials, or form bodies.
 */

import {
    type Extension,
} from '@flybyme/mesh-web';

import {
    CONSUMES,
    NEEDS,
    TELEM,
    type BootTelemetry,
    type CallTelemetry,
    type ErrorTelemetry,
    type LogBufferLike,
    type TelemApi,
    type TelemContext,
    type TelemEventInput,
    type TelemOptions,
} from './contract.js';
import { createEventBuffer, type EventBuffer } from './buffer.js';
import { sendTelemetryBatch } from './transport.js';

export * from './contract.js';
export { createEventBuffer, sanitizeData, sanitizeEvent } from './buffer.js';

const DEFAULT_ENDPOINT = '/api/telem/ingest';
const DEFAULT_FLUSH_INTERVAL_MS = 5000;
const DEFAULT_MAX_BATCH_SIZE = 100;
const DEFAULT_MAX_BUFFER_SIZE = 500;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function generateSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const rand = Math.random().toString(36).slice(2, 10);
    const time = Date.now().toString(36);
    return `session_${time}_${rand}`;
}

export class TelemExtension implements Extension<typeof NEEDS, typeof CONSUMES, typeof TELEM> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = TELEM;

    readonly #options: TelemOptions;

    constructor(options: TelemOptions = {}) {
        this.#options = options;
    }

    activate(cx: TelemContext): TelemApi {
        try {
            return this.#safeActivate(cx);
        } catch {
            // Fail closed and silent: activate must never throw
            const fallbackSessionId = this.#options.sessionId ?? 'fallback_session';
            return {
                sessionId: fallbackSessionId,
                recordCall: () => {},
                recordBoot: () => {},
                recordError: () => {},
                recordEvent: () => {},
                flush: async () => {},
                bufferSize: () => 0,
                droppedCount: () => 0,
            };
        }
    }

    #safeActivate(cx: TelemContext): TelemApi {
        const sessionId = this.#options.sessionId ?? (this.#options.generateId?.() ?? generateSessionId());
        const endpoint = this.#options.endpoint ?? DEFAULT_ENDPOINT;
        const maxBatchSize = Math.min(this.#options.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE, 100);
        const maxBufferSize = this.#options.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE;
        const flushIntervalMs = this.#options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
        const now = this.#options.now ?? Date.now;

        const host = this.#options.host
            ?? (typeof location !== 'undefined' && location.hostname ? location.hostname : undefined);

        const buffer: EventBuffer = createEventBuffer(maxBufferSize);

        let isFlushing = false;
        let timer: ReturnType<typeof setInterval> | undefined;
        let lastLogCursor = 0;

        const doFlush = async (isClosing = false): Promise<void> => {
            if (isFlushing && !isClosing) return;
            isFlushing = true;

            try {
                // Drain up to maxBatchSize
                const events = buffer.drain(maxBatchSize);
                if (events.length === 0) return;

                const payload = {
                    sessionId,
                    ...(host ? { host } : {}),
                    events,
                };

                await sendTelemetryBatch(payload, {
                    endpoint,
                    isClosing,
                    sendBeacon: this.#options.sendBeacon,
                    fetch: this.#options.fetch,
                });
                // If sendTelemetryBatch fails, events are already drained and dropped:
                // a failing endpoint degrades to dropping events, not to retrying forever.
            } catch {
                // Never rethrow
            } finally {
                isFlushing = false;
            }
        };

        const enqueue = (event: TelemEventInput): void => {
            buffer.push({
                ...event,
                timestamp: event.timestamp ?? now(),
            });

            // Immediate flush if buffer fills a full batch
            if (buffer.size() >= maxBatchSize) {
                void doFlush(false);
            }
        };

        // 1. Logs: createLogBuffer integration
        const logs: LogBufferLike | undefined = this.#options.logs;
        let logUnsubscribe: (() => void) | undefined;

        if (logs !== undefined && typeof logs.subscribe === 'function') {
            const pullLogs = (): void => {
                const len = logs.length;
                while (lastLogCursor < len) {
                    const entry = logs[lastLogCursor];
                    lastLogCursor++;
                    if (!entry) continue;

                    const dataObj = isRecord(entry.data)
                        ? entry.data
                        : entry.data !== undefined
                            ? { value: entry.data }
                            : undefined;

                    enqueue({
                        type: 'log',
                        level: entry.level,
                        logger: entry.source,
                        message: entry.message,
                        ...(dataObj ? { data: dataObj } : {}),
                    });
                }
            };

            // Pull initial logs recorded during boot before activation
            pullLogs();
            logUnsubscribe = logs.subscribe(pullLogs);
        }

        // 2. Unhandled errors & rejections
        const errorHandler = (event: ErrorEvent): void => {
            const errObj = event.error instanceof Error ? event.error : undefined;
            enqueue({
                type: 'error',
                level: 'error',
                message: event.message || (errObj ? errObj.message : 'Unknown error'),
                errorKind: errObj?.name ?? 'Error',
                stack: errObj?.stack,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
            });
        };

        const rejectionHandler = (event: PromiseRejectionEvent): void => {
            const reason = event.reason;
            const errObj = reason instanceof Error ? reason : undefined;
            enqueue({
                type: 'error',
                level: 'error',
                message: errObj?.message ?? (typeof reason === 'string' ? reason : 'Unhandled Promise Rejection'),
                errorKind: errObj?.name ?? 'UnhandledRejection',
                stack: errObj?.stack,
            });
        };

        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('error', errorHandler);
            window.addEventListener('unhandledrejection', rejectionHandler);
        }

        // 3. Page visibility & tab close: last batch survives tab closing
        const visibilityHandler = (): void => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                void doFlush(true);
            }
        };

        const pagehideHandler = (): void => {
            void doFlush(true);
        };

        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
            document.addEventListener('visibilitychange', visibilityHandler);
        }
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('pagehide', pagehideHandler);
        }

        // 4. Background debounce timer
        if (flushIntervalMs > 0 && typeof setInterval === 'function') {
            timer = setInterval(() => {
                if (buffer.size() > 0) {
                    void doFlush(false);
                }
            }, flushIntervalMs);
        }

        // Cleanup on dispose
        cx.onDispose(() => {
            if (timer !== undefined) {
                clearInterval(timer);
                timer = undefined;
            }
            if (logUnsubscribe !== undefined) {
                logUnsubscribe();
                logUnsubscribe = undefined;
            }
            if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
                window.removeEventListener('error', errorHandler);
                window.removeEventListener('unhandledrejection', rejectionHandler);
                window.removeEventListener('pagehide', pagehideHandler);
            }
            if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
                document.removeEventListener('visibilitychange', visibilityHandler);
            }
            void doFlush(true);
        });

        const api: TelemApi = {
            sessionId,

            recordCall(call: CallTelemetry): void {
                enqueue({
                    type: 'call',
                    level: call.outcome === 'ok' ? 'info' : 'error',
                    key: call.key,
                    durationMs: call.durationMs,
                    outcome: call.outcome,
                    errorKind: call.errorKind,
                    status: call.status,
                });
            },

            recordBoot(boot: BootTelemetry): void {
                enqueue({
                    type: 'boot',
                    level: boot.bootStatus === 'failed' ? 'error' : 'info',
                    partId: boot.partId,
                    order: boot.order,
                    bootStatus: boot.bootStatus,
                });
            },

            recordError(error: ErrorTelemetry): void {
                enqueue({
                    type: 'error',
                    level: 'error',
                    message: error.message,
                    errorKind: error.errorKind,
                    stack: error.stack,
                    filename: error.filename,
                    lineno: error.lineno,
                    colno: error.colno,
                });
            },

            recordEvent(event: TelemEventInput): void {
                enqueue(event);
            },

            async flush(): Promise<void> {
                await doFlush(false);
            },

            bufferSize(): number {
                return buffer.size();
            },

            droppedCount(): number {
                return buffer.droppedCount();
            },
        };

        return api;
    }
}

export default TelemExtension;
