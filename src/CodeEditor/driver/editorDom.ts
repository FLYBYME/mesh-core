/**
 * Real DOM engine for CodeEditor.
 *
 * Mounts the physical HTML elements:
 * - Line numbers gutter
 * - Scrollable input surface
 * - Diagnostic marker indicators
 *
 * Implements keyboard mechanics (Tab indentation, scroll synchronization)
 * and event translation into Mesh Intents.
 */

import type { CodeEditorHandle } from '../contract/handle.js';
import type { CodeEditorCursorEvent, EditorMarker, TextEdit, TextPosition, TextRange } from '../contract/types.js';

export interface EditorDomInstance {
    readonly element: HTMLElement;
    readonly handle: CodeEditorHandle;
    updateContent(content: string): void;
    updateLanguage(language: string | undefined): void;
    updateReadOnly(readOnly: boolean): void;
    updateLineNumbers(show: boolean): void;
    updateMarkers(markers: readonly EditorMarker[] | undefined): void;
    dispose(): void;
}

export function indexToPosition(text: string, index: number): TextPosition {
    const clamped = Math.max(0, Math.min(index, text.length));
    const lines = text.slice(0, clamped).split('\n');
    const line = lines.length;
    const lastLine = lines[lines.length - 1];
    const column = (lastLine !== undefined ? lastLine.length : 0) + 1;
    return { line, column };
}

export function positionToIndex(text: string, pos: TextPosition): number {
    const lines = text.split('\n');
    let idx = 0;
    const targetLine = Math.max(1, pos.line);

    for (let i = 0; i < lines.length; i++) {
        const lineContent = lines[i] ?? '';
        if (i + 1 < targetLine) {
            idx += lineContent.length + 1; // +1 for \n
        } else if (i + 1 === targetLine) {
            const colOffset = Math.max(0, Math.min(pos.column - 1, lineContent.length));
            idx += colOffset;
            return idx;
        }
    }
    return Math.min(idx, text.length);
}

export function createEditorDom(): EditorDomInstance {
    const container = document.createElement('div');
    container.className = 'mesh-code-editor';

    const gutter = document.createElement('div');
    gutter.className = 'mesh-editor-gutter';
    gutter.setAttribute('aria-hidden', 'true');

    const area = document.createElement('div');
    area.className = 'mesh-editor-area';

    const textarea = document.createElement('textarea');
    textarea.className = 'mesh-editor-textarea';
    textarea.setAttribute('spellcheck', 'false');
    textarea.setAttribute('autocapitalize', 'off');
    textarea.setAttribute('autocomplete', 'off');
    textarea.setAttribute('autocorrect', 'off');
    textarea.wrap = 'off';

    area.appendChild(textarea);
    container.appendChild(gutter);
    container.appendChild(area);

    let currentMarkers: readonly EditorMarker[] = [];
    let showLineNumbers = true;
    const cursorListeners = new Set<(event: CodeEditorCursorEvent) => void>();

    const renderGutter = () => {
        if (!showLineNumbers) {
            gutter.style.display = 'none';
            return;
        }
        gutter.style.display = '';
        const lines = textarea.value.split('\n');
        const count = Math.max(1, lines.length);

        // Marker map by line
        const markerMap = new Map<number, 'error' | 'warning'>();
        for (const m of currentMarkers) {
            const l = m.range.start.line;
            const existing = markerMap.get(l);
            if (m.severity === 'error') {
                markerMap.set(l, 'error');
            } else if (m.severity === 'warning' && existing !== 'error') {
                markerMap.set(l, 'warning');
            }
        }

        const frag = document.createDocumentFragment();
        for (let i = 1; i <= count; i++) {
            const row = document.createElement('div');
            row.className = 'mesh-editor-gutter-line';
            row.textContent = String(i);
            const marker = markerMap.get(i);
            if (marker !== undefined) {
                row.setAttribute('data-has-marker', marker);
            }
            frag.appendChild(row);
        }
        gutter.replaceChildren(frag);
    };

    renderGutter();

    // Scroll synchronization
    const onScroll = () => {
        gutter.scrollTop = textarea.scrollTop;
    };
    textarea.addEventListener('scroll', onScroll, { passive: true });

    // Tab key handling
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const val = textarea.value;
            const indent = '  '; // 2 spaces standard

            textarea.value = val.substring(0, start) + indent + val.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + indent.length;

            renderGutter();
            notifyCursorListeners();
        }
    };
    textarea.addEventListener('keydown', onKeyDown);

    const getCursorEvent = (): CodeEditorCursorEvent => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;
        const pos = indexToPosition(val, start);
        const sel = start !== end ? {
            start: pos,
            end: indexToPosition(val, end),
        } : undefined;

        return {
            position: pos,
            ...(sel !== undefined ? { selection: sel } : {}),
        };
    };

    const notifyCursorListeners = () => {
        const event = getCursorEvent();
        for (const listener of cursorListeners) {
            listener(event);
        }
    };

    const onInput = () => {
        renderGutter();
        notifyCursorListeners();
    };
    textarea.addEventListener('input', onInput);

    const onSelectionOrCursor = () => {
        notifyCursorListeners();
    };
    textarea.addEventListener('keyup', onSelectionOrCursor);
    textarea.addEventListener('pointerup', onSelectionOrCursor);

    const handle: CodeEditorHandle = {
        revealLine(line: number): void {
            const lines = textarea.value.split('\n');
            const clamped = Math.max(1, Math.min(line, lines.length));
            const lineHeight = 19.5; // ~13px * 1.5 line-height
            const targetScroll = Math.max(0, (clamped - 1) * lineHeight - (area.clientHeight / 2));
            textarea.scrollTop = targetScroll;
            gutter.scrollTop = targetScroll;
        },

        async formatDocument(): Promise<void> {
            const raw = textarea.value;
            const formatted = raw
                .split('\n')
                .map((l) => l.trimEnd())
                .join('\n')
                .trimEnd() + '\n';

            if (formatted !== raw) {
                const prevStart = textarea.selectionStart;
                textarea.value = formatted;
                textarea.selectionStart = textarea.selectionEnd = Math.min(prevStart, formatted.length);
                renderGutter();
                // Dispatch input event so intent bindings pick up the new value
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        },

        focus(): void {
            textarea.focus();
        },

        getPosition(): TextPosition {
            return indexToPosition(textarea.value, textarea.selectionStart);
        },

        setPosition(position: TextPosition): void {
            const idx = positionToIndex(textarea.value, position);
            textarea.setSelectionRange(idx, idx);
            notifyCursorListeners();
        },

        getSelection(): TextRange | undefined {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            if (start === end) return undefined;
            return {
                start: indexToPosition(textarea.value, start),
                end: indexToPosition(textarea.value, end),
            };
        },

        setSelection(range: TextRange): void {
            const startIdx = positionToIndex(textarea.value, range.start);
            const endIdx = positionToIndex(textarea.value, range.end);
            textarea.setSelectionRange(startIdx, endIdx);
            notifyCursorListeners();
        },

        applyEdits(edits: readonly TextEdit[]): void {
            let val = textarea.value;
            const sorted = [...edits].sort((a, b) => {
                const aIdx = positionToIndex(val, a.range.start);
                const bIdx = positionToIndex(val, b.range.start);
                return bIdx - aIdx;
            });

            for (const edit of sorted) {
                const startIdx = positionToIndex(val, edit.range.start);
                const endIdx = positionToIndex(val, edit.range.end);
                val = val.substring(0, startIdx) + edit.text + val.substring(endIdx);
            }

            textarea.value = val;
            renderGutter();
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        },

        getValue(): string {
            return textarea.value;
        },

        setValue(value: string): void {
            if (textarea.value !== value) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = value;
                textarea.selectionStart = Math.min(start, value.length);
                textarea.selectionEnd = Math.min(end, value.length);
                renderGutter();
            }
        },

        onCursorMove(listener: (event: CodeEditorCursorEvent) => void): () => void {
            cursorListeners.add(listener);
            return () => {
                cursorListeners.delete(listener);
            };
        },
    };

    // Define 'value' property on container so mesh-web's valueOf(el) extracts textarea.value
    Object.defineProperty(container, 'value', {
        get(): string {
            return textarea.value;
        },
        set(v: string) {
            handle.setValue(v);
        },
        configurable: true,
    });

    return {
        element: container,
        handle,
        updateContent(content: string): void {
            handle.setValue(content);
        },
        updateLanguage(language: string | undefined): void {
            if (language !== undefined) {
                container.setAttribute('data-language', language);
            } else {
                container.removeAttribute('data-language');
            }
        },
        updateReadOnly(readOnly: boolean): void {
            textarea.readOnly = readOnly;
            container.setAttribute('data-readonly', String(readOnly));
        },
        updateLineNumbers(show: boolean): void {
            showLineNumbers = show;
            renderGutter();
        },
        updateMarkers(markers: readonly EditorMarker[] | undefined): void {
            currentMarkers = markers ?? [];
            renderGutter();
        },
        dispose(): void {
            textarea.removeEventListener('scroll', onScroll);
            textarea.removeEventListener('keydown', onKeyDown);
            textarea.removeEventListener('input', onInput);
            textarea.removeEventListener('keyup', onSelectionOrCursor);
            textarea.removeEventListener('pointerup', onSelectionOrCursor);
            cursorListeners.clear();
        },
    };
}
