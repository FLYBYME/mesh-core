/**
 * Browser integration tests for CodeEditor.
 *
 * Runs in a real Chromium browser via vitest.browser.config.ts.
 * Verifies:
 * - DOM layout: gutter, textarea, active markers.
 * - Keyboard mechanics: Tab indentation, scroll synchronization.
 * - Controller attachment and imperative operations (revealLine, formatDocument, setPosition).
 * - ComponentDefinition apply updates (content, readOnly, language).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@flybyme/mesh-web/testing';
import type { Json } from '@flybyme/mesh-web';

import {
    createCodeEditorController,
    CodeEditorDriver,
    createEditorDom,
} from '../src/CodeEditor/index.js';

afterEach(() => {
    cleanup();
    for (const el of document.querySelectorAll('.mesh-code-editor')) {
        el.remove();
    }
});

describe('createEditorDom in real browser', () => {
    it('creates container with gutter and textarea matching initial line count', () => {
        const dom = createEditorDom();
        document.body.appendChild(dom.element);

        dom.updateContent('line 1\nline 2\nline 3');
        const gutterLines = dom.element.querySelectorAll('.mesh-editor-gutter-line');
        expect(gutterLines.length).toBe(3);
        expect(gutterLines[0]?.textContent).toBe('1');
        expect(gutterLines[1]?.textContent).toBe('2');
        expect(gutterLines[2]?.textContent).toBe('3');

        dom.dispose();
    });

    it('handles Tab key by inserting 2 spaces without blur', () => {
        const dom = createEditorDom();
        document.body.appendChild(dom.element);
        const textarea = dom.element.querySelector('textarea')!;

        textarea.value = 'hello';
        textarea.selectionStart = textarea.selectionEnd = 5;

        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));

        expect(textarea.value).toBe('hello  ');
        expect(textarea.selectionStart).toBe(7);

        dom.dispose();
    });

    it('synchronizes scroll between textarea and gutter', () => {
        const dom = createEditorDom();
        document.body.appendChild(dom.element);
        const textarea = dom.element.querySelector('textarea')!;
        const gutter = dom.element.querySelector('.mesh-editor-gutter')!;

        // Add 50 lines to make it scrollable
        const content = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join('\n');
        dom.updateContent(content);

        textarea.scrollTop = 120;
        textarea.dispatchEvent(new Event('scroll'));

        expect(gutter.scrollTop).toBe(120);

        dom.dispose();
    });

    it('formats document by trimming trailing spaces', async () => {
        const dom = createEditorDom();
        document.body.appendChild(dom.element);
        const textarea = dom.element.querySelector('textarea')!;

        dom.updateContent('const a = 1;   \nconst b = 2;  ');
        await dom.handle.formatDocument();

        expect(textarea.value).toBe('const a = 1;\nconst b = 2;\n');

        dom.dispose();
    });

    it('tracks position and selection accurately via handle', () => {
        const dom = createEditorDom();
        document.body.appendChild(dom.element);

        dom.updateContent('line 1\nline 2\nline 3');

        dom.handle.setPosition({ line: 2, column: 4 });
        expect(dom.handle.getPosition()).toEqual({ line: 2, column: 4 });

        dom.handle.setSelection({
            start: { line: 1, column: 1 },
            end: { line: 1, column: 5 },
        });
        expect(dom.handle.getSelection()).toEqual({
            start: { line: 1, column: 1 },
            end: { line: 1, column: 5 },
        });

        dom.dispose();
    });

    it('renders diagnostic markers in the gutter', () => {
        const dom = createEditorDom();
        document.body.appendChild(dom.element);

        dom.updateContent('line 1\nline 2\nline 3');
        dom.updateMarkers([
            {
                range: { start: { line: 2, column: 1 }, end: { line: 2, column: 5 } },
                message: 'Syntax error',
                severity: 'error',
            },
        ]);

        const gutterLines = dom.element.querySelectorAll('.mesh-editor-gutter-line');
        expect(gutterLines[1]?.getAttribute('data-has-marker')).toBe('error');

        dom.dispose();
    });
});

describe('CodeEditorDriver integration', () => {
    it('attaches controller at creation and responds to apply()', () => {
        const controller = createCodeEditorController();
        const el = CodeEditorDriver.create({
            controller: controller as unknown as Json,
        });
        document.body.appendChild(el);

        expect(controller.isAttached).toBe(true);

        // Apply content update
        CodeEditorDriver.apply?.(el, 'content', 'alpha\nbeta');
        expect(controller.getValue()).toBe('alpha\nbeta');

        // Apply readOnly update
        CodeEditorDriver.apply?.(el, 'readOnly', true);
        const textarea = el.querySelector('textarea')!;
        expect(textarea.readOnly).toBe(true);

        // Apply language update
        CodeEditorDriver.apply?.(el, 'language', 'json');
        expect(el.getAttribute('data-language')).toBe('json');
    });

    it('defines spaceIsTextInput: true so space typing does not trigger activate intent', () => {
        expect(CodeEditorDriver.spaceIsTextInput).toBe(true);
    });
});
