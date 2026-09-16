/**
 * Controller implementation for CodeEditor.
 *
 * Provides the headless application-side handle. Completely decoupled from DOM:
 * safe to construct, pass into views, and test in Node/Vitest without browser mocks.
 */

import type { CodeEditorController, CodeEditorHandle } from '../contract/handle.js';
import type { CodeEditorCursorEvent, TextEdit, TextPosition, TextRange } from '../contract/types.js';

export function createCodeEditorController(): CodeEditorController {
    let attached: CodeEditorHandle | undefined;
    const cursorListeners = new Set<(event: CodeEditorCursorEvent) => void>();

    return {
        get isAttached(): boolean {
            return attached !== undefined;
        },

        get handle(): CodeEditorHandle | undefined {
            return attached;
        },

        _attach(handle: CodeEditorHandle): void {
            attached = handle;
            // Forward handle's cursor moves to any registered controller listeners
            handle.onCursorMove((event) => {
                for (const listener of cursorListeners) {
                    listener(event);
                }
            });
        },

        _detach(): void {
            attached = undefined;
        },

        revealLine(line: number): void {
            attached?.revealLine(line);
        },

        async formatDocument(): Promise<void> {
            if (attached !== undefined) {
                await attached.formatDocument();
            }
        },

        focus(): void {
            attached?.focus();
        },

        getPosition(): TextPosition {
            return attached?.getPosition() ?? { line: 1, column: 1 };
        },

        setPosition(position: TextPosition): void {
            attached?.setPosition(position);
        },

        getSelection(): TextRange | undefined {
            return attached?.getSelection();
        },

        setSelection(range: TextRange): void {
            attached?.setSelection(range);
        },

        applyEdits(edits: readonly TextEdit[]): void {
            attached?.applyEdits(edits);
        },

        getValue(): string {
            return attached?.getValue() ?? '';
        },

        setValue(value: string): void {
            attached?.setValue(value);
        },

        onCursorMove(listener: (event: CodeEditorCursorEvent) => void): () => void {
            cursorListeners.add(listener);
            return () => {
                cursorListeners.delete(listener);
            };
        },
    };
}
