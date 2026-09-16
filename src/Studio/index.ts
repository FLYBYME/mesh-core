/**
 * StudioApp: An interactive data and code studio demonstrating the synergy
 * between the CodeEditor and Charts subsystems in @flybyme/mesh-core.
 */

import {
    needs,
    type Application,
    type Context,
    type ViewDecl,
} from '@flybyme/mesh-web';

import { CodeEditorDriver, createCodeEditorController } from '../CodeEditor/index.js';
import { ChartDriver } from '../Charts/index.js';
import type { EditorMarker } from '../CodeEditor/contract/types.js';
import type { StudioData, StudioInternal } from './contract.js';
import { ALL_PRESETS, SPRINT_METRICS_PRESET } from './presets.js';
import { renderStudio } from './view.js';
import './styles/studio.css';

export * from './contract.js';
export * from './presets.js';

const NEEDS = needs('state', 'log', 'windows');

export class StudioApp implements Application<typeof NEEDS, readonly [], undefined, undefined, StudioInternal> {
    readonly needs = NEEDS;
    readonly consumes = [] as const;

    /**
     * Declares the required subsystem drivers so the kernel registers both
     * 'CodeEditor' and 'ChartSurface' into the component vocabulary at boot.
     */
    readonly components = [CodeEditorDriver, ChartDriver] as const;

    readonly views: readonly ViewDecl<Record<string, never>, StudioInternal>[] = [
        {
            id: 'main',
            title: 'Data Studio',
            render: renderStudio,
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<{ internal: StudioInternal }> {
        const activePresetId = cx.state.signal<string>(SPRINT_METRICS_PRESET.id);
        const initialJson = JSON.stringify(SPRINT_METRICS_PRESET.data, null, 2);
        const rawCode = cx.state.signal<string>(initialJson);
        const parsedData = cx.state.signal<StudioData>(SPRINT_METRICS_PRESET.data);
        const markers = cx.state.signal<readonly EditorMarker[]>([]);
        const status = cx.state.signal<{ isError: boolean; message: string }>({
            isError: false,
            message: 'Synchronized · Ready',
        });
        const chartType = cx.state.signal<'area' | 'line'>('area');
        const editorController = createCodeEditorController();

        function parseAndValidate(code: string): void {
            try {
                const parsed = JSON.parse(code) as StudioData;
                if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.series)) {
                    throw new Error('JSON must contain a "series" array.');
                }
                markers.set([]);
                status.set({ isError: false, message: 'Valid JSON · Synchronized' });
                parsedData.set(parsed);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);

                // Compute line and column from character position if available
                let line = 1;
                let column = 1;
                const match = /at position (\d+)/i.exec(message);
                if (match && match[1]) {
                    const pos = parseInt(match[1], 10);
                    const prefix = code.slice(0, pos);
                    const lines = prefix.split('\n');
                    line = lines.length;
                    column = (lines[lines.length - 1]?.length ?? 0) + 1;
                }

                markers.set([
                    {
                        range: {
                            start: { line, column },
                            end: { line, column: column + 5 },
                        },
                        message,
                        severity: 'error',
                    },
                ]);
                status.set({ isError: true, message: `Syntax: ${message}` });
            }
        }

        const internal: StudioInternal = {
            activePresetId,
            rawCode,
            parsedData,
            markers,
            status,
            chartType,
            editorController,

            selectPreset(id: string) {
                const found = ALL_PRESETS.find((p) => p.id === id);
                if (!found) return;
                activePresetId.set(found.id);
                const code = JSON.stringify(found.data, null, 2);
                rawCode.set(code);
                parseAndValidate(code);
                cx.log.info(`Switched to preset "${found.title}"`);
            },

            updateCode(content: string) {
                rawCode.set(content);
                parseAndValidate(content);
            },

            formatCode() {
                try {
                    const current = JSON.parse(rawCode());
                    const formatted = JSON.stringify(current, null, 2);
                    rawCode.set(formatted);
                    parseAndValidate(formatted);
                } catch {
                    // Cannot format invalid JSON
                }
            },

            addPoint() {
                const current = parsedData();
                const series0 = current.series[0];
                if (!series0) return;

                const lastVal = series0.data[series0.data.length - 1] ?? 50;
                const nextVal = Math.max(5, Math.round(lastVal + (Math.random() * 30 - 15)));
                const nextCat = `T+${series0.data.length + 1}`;

                const updated: StudioData = {
                    ...current,
                    categories: [...current.categories, nextCat],
                    series: [
                        {
                            ...series0,
                            data: [...series0.data, nextVal],
                        },
                        ...current.series.slice(1),
                    ],
                };

                const formatted = JSON.stringify(updated, null, 2);
                rawCode.set(formatted);
                parsedData.set(updated);
                markers.set([]);
                status.set({ isError: false, message: `Added point (${nextCat}, ${nextVal})` });
            },

            toggleChartType() {
                chartType.set(chartType() === 'area' ? 'line' : 'area');
            },
        };

        cx.windows.open({ view: 'main' });

        return { internal };
    }
}

export default StudioApp;
