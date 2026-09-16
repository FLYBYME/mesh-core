/**
 * Built-in presets for StudioApp.
 */

import type { StudioPreset } from './contract.js';

export const SPRINT_METRICS_PRESET: StudioPreset = {
    id: 'sprint',
    title: 'Sprint Burndown & Tasks',
    description: 'Track team velocity, remaining points, and task distributions.',
    data: {
        title: 'Sprint 42 Burndown',
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [
            {
                name: 'Remaining Points',
                data: [100, 88, 74, 52, 38, 20, 5],
                color: 'var(--ui-color-primary, #3b82f6)',
            },
            {
                name: 'Ideal Burndown',
                data: [100, 83, 67, 50, 33, 17, 0],
                color: 'var(--ui-text-muted, #94a3b8)',
            },
        ],
        donut: [
            { label: 'Done', value: 42, color: '#10b981' },
            { label: 'In Progress', value: 28, color: '#3b82f6' },
            { label: 'Review', value: 16, color: '#f59e0b' },
            { label: 'To Do', value: 14, color: '#64748b' },
        ],
        bars: [
            { label: 'Frontend', value: 38, color: '#6366f1' },
            { label: 'Backend', value: 44, color: '#3b82f6' },
            { label: 'Infra', value: 18, color: '#06b6d4' },
            { label: 'QA', value: 12, color: '#10b981' },
        ],
    },
};

export const API_TELEMETRY_PRESET: StudioPreset = {
    id: 'telemetry',
    title: 'API Gateway Telemetry',
    description: 'Real-time HTTP request latencies and endpoint traffic volume.',
    data: {
        title: 'Gateway Latency (ms)',
        categories: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
        series: [
            {
                name: 'p99 Latency',
                data: [120, 115, 140, 210, 195, 130],
                color: '#ef4444',
            },
            {
                name: 'p50 Latency',
                data: [35, 32, 45, 68, 62, 40],
                color: '#3b82f6',
            },
        ],
        donut: [
            { label: '200 OK', value: 92, color: '#10b981' },
            { label: '4xx Client', value: 6, color: '#f59e0b' },
            { label: '5xx Server', value: 2, color: '#ef4444' },
        ],
        bars: [
            { label: '/auth', value: 45, color: '#8b5cf6' },
            { label: '/cards', value: 85, color: '#3b82f6' },
            { label: '/stream', value: 60, color: '#06b6d4' },
            { label: '/sync', value: 30, color: '#10b981' },
        ],
    },
};

export const ALL_PRESETS: readonly StudioPreset[] = [
    SPRINT_METRICS_PRESET,
    API_TELEMETRY_PRESET,
];
