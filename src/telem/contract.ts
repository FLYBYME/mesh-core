import {
    consumes,
    needs,
    provider,
    type Context,
    type ProviderToken,
} from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- types matching mesh-serve schema

export type TelemLevel = 'debug' | 'info' | 'warn' | 'error';
export type TelemType = 'log' | 'call' | 'boot' | 'error' | 'request';
export type BootStatus = 'mounted' | 'failed' | 'skipped';

export interface TelemEventInput {
    readonly id?: string | undefined;
    readonly timestamp?: number | string | Date | undefined;
    readonly type: TelemType;
    readonly level?: TelemLevel | undefined;

    // --- log (from createLogBuffer or console)
    readonly message?: string | undefined;
    readonly logger?: string | undefined;
    readonly data?: Readonly<Record<string, unknown>> | undefined;

    // --- call (contract invocation: keys and outcomes, NEVER inputs or credentials)
    readonly key?: string | undefined;
    readonly durationMs?: number | undefined;
    readonly outcome?: 'ok' | 'error' | undefined;
    readonly errorKind?: string | undefined;
    readonly status?: number | undefined;

    // --- boot (part mounting phase)
    readonly partId?: string | undefined;
    readonly order?: number | undefined;
    readonly bootStatus?: BootStatus | undefined;

    // --- error (unhandled error or rejection)
    readonly stack?: string | undefined;
    readonly filename?: string | undefined;
    readonly lineno?: number | undefined;
    readonly colno?: number | undefined;

    // --- request (HTTP serving on CDN or API)
    readonly method?: string | undefined;
    readonly host?: string | undefined;
    readonly path?: string | undefined;
}

export interface TelemIngestInput {
    readonly sessionId: string;
    readonly host?: string | undefined;
    readonly events: readonly TelemEventInput[];
}

export interface TelemIngestOutput {
    readonly accepted: number;
    readonly dropped: number;
}

// ---------------------------------------------------------------------------- options and API

export interface LogBufferLike {
    readonly length: number;
    readonly capacity: number;
    readonly dropped: number;
    readonly [index: number]: {
        readonly level: TelemLevel;
        readonly source: string;
        readonly message: string;
        readonly data?: unknown;
    };
    subscribe(listener: () => void): () => void;
}

export interface TelemOptions {
    readonly endpoint?: string | undefined;
    readonly sessionId?: string | undefined;
    readonly host?: string | undefined;
    readonly logs?: LogBufferLike | undefined;
    readonly maxBatchSize?: number | undefined;
    readonly maxBufferSize?: number | undefined;
    readonly flushIntervalMs?: number | undefined;
    readonly sendBeacon?: ((url: string, data: BodyInit) => boolean) | undefined;
    readonly fetch?: ((url: string, init?: RequestInit) => Promise<Response>) | undefined;
    readonly now?: (() => number) | undefined;
    readonly generateId?: (() => string) | undefined;
}

export interface CallTelemetry {
    readonly key: string;
    readonly durationMs?: number | undefined;
    readonly outcome: 'ok' | 'error';
    readonly errorKind?: string | undefined;
    readonly status?: number | undefined;
}

export interface BootTelemetry {
    readonly partId: string;
    readonly order?: number | undefined;
    readonly bootStatus: BootStatus;
}

export interface ErrorTelemetry {
    readonly message: string;
    readonly errorKind?: string | undefined;
    readonly stack?: string | undefined;
    readonly filename?: string | undefined;
    readonly lineno?: number | undefined;
    readonly colno?: number | undefined;
}

export interface TelemApi {
    readonly sessionId: string;
    recordCall(call: CallTelemetry): void;
    recordBoot(boot: BootTelemetry): void;
    recordError(error: ErrorTelemetry): void;
    recordEvent(event: TelemEventInput): void;
    flush(): Promise<void>;
    bufferSize(): number;
    droppedCount(): number;
}

export const TELEM: ProviderToken<TelemApi> = provider<TelemApi>('telem');

export const NEEDS = needs('http');
export const CONSUMES = consumes();

export type TelemContext = Context<typeof NEEDS, typeof CONSUMES>;
