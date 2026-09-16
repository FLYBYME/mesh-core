/**
 * Source assertion and controller lifecycle tests for CodeEditor.
 *
 * Runs under Node (.spec.ts) to verify architectural isolation:
 * - contract/, controller/, and ui/ contain ZERO DOM calls.
 * - Only driver/ interacts with browser elements.
 * - createCodeEditorController() behaves safely in detached, attached, and detached-again states.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import type { CodeEditorCursorEvent, CodeEditorHandle } from '../src/CodeEditor/contract/index.js';
import { createCodeEditorController } from '../src/CodeEditor/controller/index.js';

const sourceFiles = (dir: string, ext?: string): readonly string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...sourceFiles(path, ext));
        else if (!ext || entry.name.endsWith(ext)) out.push(path);
    }
    return out;
};

const stripComments = (content: string): string =>
    content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('CodeEditor architectural isolation', () => {
    const nonDriverTsFiles = [
        ...sourceFiles('src/CodeEditor/contract', '.ts'),
        ...sourceFiles('src/CodeEditor/controller', '.ts'),
        ...sourceFiles('src/CodeEditor/ui', '.ts'),
    ];

    it('contains files to verify', () => {
        expect(nonDriverTsFiles.length).toBeGreaterThan(3);
    });

    it('calls document.createElement nowhere in contract, controller, or ui', () => {
        const offenders = nonDriverTsFiles.filter((p) =>
            /document\s*\.\s*createElement/.test(stripComments(readFileSync(p, 'utf8'))),
        );
        expect(offenders).toEqual([]);
    });

    it('accesses no browser globals (document, window, localStorage) in contract, controller, or ui', () => {
        const globalRe = /(?<![\w$.])(?:globalThis|window|document|localStorage|sessionStorage)\s*[.[]/;
        const offenders = nonDriverTsFiles.filter((p) =>
            globalRe.test(stripComments(readFileSync(p, 'utf8'))),
        );
        expect(offenders).toEqual([]);
    });
});

describe('CodeEditorController headless lifecycle', () => {
    it('initializes in detached state with safe fallbacks', async () => {
        const controller = createCodeEditorController();

        expect(controller.isAttached).toBe(false);
        expect(controller.handle).toBeUndefined();
        expect(controller.getValue()).toBe('');
        expect(controller.getPosition()).toEqual({ line: 1, column: 1 });
        expect(controller.getSelection()).toBeUndefined();

        // Must safely no-op without throwing
        expect(() => controller.revealLine(100)).not.toThrow();
        expect(() => controller.focus()).not.toThrow();
        expect(() => controller.setPosition({ line: 5, column: 10 })).not.toThrow();
        expect(() => controller.setValue('foo')).not.toThrow();
        await expect(controller.formatDocument()).resolves.toBeUndefined();
    });

    it('delegates to handle when attached, then safely un-wires when detached', async () => {
        const controller = createCodeEditorController();

        const mockHandle: CodeEditorHandle = {
            revealLine: vi.fn(),
            formatDocument: vi.fn().mockResolvedValue(undefined),
            focus: vi.fn(),
            getPosition: vi.fn().mockReturnValue({ line: 42, column: 7 }),
            setPosition: vi.fn(),
            getSelection: vi.fn().mockReturnValue({
                start: { line: 1, column: 1 },
                end: { line: 2, column: 5 },
            }),
            setSelection: vi.fn(),
            applyEdits: vi.fn(),
            getValue: vi.fn().mockReturnValue('hello mesh'),
            setValue: vi.fn(),
            onCursorMove: vi.fn().mockReturnValue(() => {}),
        };

        controller._attach(mockHandle);
        expect(controller.isAttached).toBe(true);
        expect(controller.handle).toBe(mockHandle);

        controller.revealLine(100);
        expect(mockHandle.revealLine).toHaveBeenCalledWith(100);

        controller.focus();
        expect(mockHandle.focus).toHaveBeenCalledTimes(1);

        expect(controller.getPosition()).toEqual({ line: 42, column: 7 });
        expect(controller.getValue()).toBe('hello mesh');

        await controller.formatDocument();
        expect(mockHandle.formatDocument).toHaveBeenCalledTimes(1);

        // Detach
        controller._detach();
        expect(controller.isAttached).toBe(false);
        expect(controller.handle).toBeUndefined();

        // Subsequent calls must no-op and not call previous handle
        controller.revealLine(200);
        expect(mockHandle.revealLine).toHaveBeenCalledTimes(1); // not called again
    });

    it('forwards onCursorMove from handle to registered listeners', () => {
        const controller = createCodeEditorController();
        const listener = vi.fn();
        const unsubscribe = controller.onCursorMove(listener);

        let handleCallback: ((e: CodeEditorCursorEvent) => void) | undefined;
        const mockHandle: CodeEditorHandle = {
            revealLine: vi.fn(),
            formatDocument: vi.fn().mockResolvedValue(undefined),
            focus: vi.fn(),
            getPosition: vi.fn().mockReturnValue({ line: 1, column: 1 }),
            setPosition: vi.fn(),
            getSelection: vi.fn(),
            setSelection: vi.fn(),
            applyEdits: vi.fn(),
            getValue: vi.fn().mockReturnValue(''),
            setValue: vi.fn(),
            onCursorMove: vi.fn((cb) => {
                handleCallback = cb;
                return () => {};
            }),
        };

        controller._attach(mockHandle);
        expect(mockHandle.onCursorMove).toHaveBeenCalledTimes(1);

        // Simulate cursor move from handle
        const event: CodeEditorCursorEvent = { position: { line: 10, column: 4 } };
        handleCallback?.(event);
        expect(listener).toHaveBeenCalledWith(event);

        // Unsubscribe
        unsubscribe();
        handleCallback?.({ position: { line: 11, column: 1 } });
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

describe('CodeEditor declarative composite source verification', () => {
    it('verifies CodeEditor enforces mandatory on registrar', () => {
        const source = readFileSync('src/CodeEditor/ui/CodeEditor.ts', 'utf8');
        expect(source).toContain("typeof props.on !== 'function'");
        expect(source).toContain("CodeEditor requires an \"on\" registrar");
    });

    it('verifies CodeEditor generates pure element node with component CodeEditor', () => {
        const source = readFileSync('src/CodeEditor/ui/CodeEditor.ts', 'utf8');
        expect(source).toContain("element('CodeEditor',");
    });
});
