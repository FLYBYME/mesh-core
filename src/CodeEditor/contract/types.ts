/**
 * Type contracts for CodeEditor.
 *
 * Defines the public interfaces for the editor subsystem: props, markers, positions,
 * ranges, and intent event payloads.
 *
 * Strict isolation: zero DOM imports.
 */

import type { Json, Reactive, Registrar } from '@flybyme/mesh-web';
import type { CodeEditorController } from './handle.js';

export interface TextPosition {
    readonly line: number;
    readonly column: number;
}

export interface TextRange {
    readonly start: TextPosition;
    readonly end: TextPosition;
}

export interface TextEdit {
    readonly range: TextRange;
    readonly text: string;
}

export type EditorMarkerSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface EditorMarker {
    readonly range: TextRange;
    readonly message: string;
    readonly severity?: EditorMarkerSeverity | undefined;
    readonly source?: string | undefined;
}

export interface CodeEditorCursorEvent {
    readonly position: TextPosition;
    readonly selection?: TextRange | undefined;
}

export interface CodeEditorProps {
    readonly content: Reactive<string>;
    readonly language?: Reactive<string> | undefined;
    readonly readOnly?: Reactive<boolean> | undefined;
    readonly lineNumbers?: Reactive<boolean> | undefined;
    readonly markers?: Reactive<readonly EditorMarker[]> | undefined;
    readonly controller?: CodeEditorController | undefined;
    /**
     * Required per mesh-core rules: handler registration must stay visible at the call site
     * and handlers must be disposed with the view.
     */
    readonly on: Registrar;
    readonly onChange?: ((content: string) => void) | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly style?: Reactive<Json> | undefined;
}
