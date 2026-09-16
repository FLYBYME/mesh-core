/**
 * StudioApp types and contracts.
 *
 * Studio is a dual-pane live data and code visualization environment
 * demonstrating the synergy between CodeEditor and Native SVG Charts.
 */

import type { EditorMarker } from '../CodeEditor/contract/types.js';
import type { CodeEditorController } from '../CodeEditor/contract/handle.js';
import type { Signal } from '@flybyme/mesh-web';

export interface StudioSeries {
    readonly name: string;
    readonly data: readonly number[];
    readonly color?: string;
}

export interface StudioSlice {
    readonly label: string;
    readonly value: number;
    readonly color?: string;
}

export interface StudioBarItem {
    readonly label: string;
    readonly value: number;
    readonly color?: string;
}

export interface StudioData {
    readonly title: string;
    readonly categories: readonly string[];
    readonly series: readonly StudioSeries[];
    readonly donut: readonly StudioSlice[];
    readonly bars: readonly StudioBarItem[];
}

export interface StudioPreset {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly data: StudioData;
}

export interface StudioInternal {
    readonly activePresetId: Signal<string>;
    readonly rawCode: Signal<string>;
    readonly parsedData: Signal<StudioData>;
    readonly markers: Signal<readonly EditorMarker[]>;
    readonly status: Signal<{ isError: boolean; message: string }>;
    readonly chartType: Signal<'area' | 'line'>;
    readonly editorController: CodeEditorController;

    selectPreset(id: string): void;
    updateCode(content: string): void;
    formatCode(): void;
    addPoint(): void;
    toggleChartType(): void;
}
