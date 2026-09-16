/**
 * Handle and Controller interfaces for CodeEditor.
 *
 * Implements the Inverted Controller pattern: application logic interacts with
 * CodeEditorHandle (a pure TypeScript interface) without ever importing or touching
 * real DOM elements or editor engine instances.
 */

import type { CodeEditorCursorEvent, TextEdit, TextPosition, TextRange } from './types.js';

export interface CodeEditorHandle {
    /** Scroll editor so line is centered in view. */
    revealLine(line: number): void;

    /** Format the current document buffer. */
    formatDocument(): Promise<void>;

    /** Focus the editor input. */
    focus(): void;

    /** Get the current active cursor position (1-indexed). */
    getPosition(): TextPosition;

    /** Set the active cursor position (1-indexed). */
    setPosition(position: TextPosition): void;

    /** Get the current text selection, if any. */
    getSelection(): TextRange | undefined;

    /** Set the active text selection range. */
    setSelection(range: TextRange): void;

    /** Apply text edits to the document buffer. */
    applyEdits(edits: readonly TextEdit[]): void;

    /** Read the entire document buffer text. */
    getValue(): string;

    /** Replace the entire document buffer text. */
    setValue(value: string): void;

    /** Subscribe to cursor movements and selection changes. Returns unsubscribe function. */
    onCursorMove(listener: (event: CodeEditorCursorEvent) => void): () => void;
}

export interface CodeEditorController extends CodeEditorHandle {
    /** Whether an active DOM editor instance is currently mounted and attached. */
    readonly isAttached: boolean;

    /** The underlying active handle, if attached. */
    readonly handle: CodeEditorHandle | undefined;

    /** Internal: called by the driver when mounted. */
    _attach(handle: CodeEditorHandle): void;

    /** Internal: called by the driver when unmounted. */
    _detach(): void;
}
