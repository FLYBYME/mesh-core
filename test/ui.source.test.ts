/**
 * **The design system does not touch the DOM — asserted over the source.**
 *
 * Separate from `ui.test.ts` because that file runs in a real browser, where `node:fs` is
 * externalised and the source cannot be read. This one runs under node.
 *
 * Asserted over the text rather than by behaviour, because that is the only way it stays true. A
 * single `document.createElement` reintroduces the thing the rewrite deleted — `entityList.ts` was
 * 211 lines of imperative DOM, a `WeakMap<Element, HTMLElement>`, manual `header.remove()` and
 * `[data-status]` toggles, for a sidebar with a heading, a count and three states — and no
 * behavioural test would notice, because it would still work.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const sourceFiles = (dir: string): readonly string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...sourceFiles(path));
        else if (entry.name.endsWith('.ts')) out.push(path);
    }
    return out;
};

const offendersMatching = (pattern: RegExp): readonly string[] =>
    sourceFiles('src/ui').filter((path) => pattern.test(readFileSync(path, 'utf8')));

describe('no component reaches for an element', () => {
    it('calls document.createElement nowhere under src/ui', () => {
        // A call, not a mention: `index.ts` documents the rule in a comment, and a test that
        // failed on its own documentation would be deleted within a week.
        expect(offendersMatching(/document\s*\.\s*createElement\s*\(/)).toEqual([]);
    });

    it('keys no WeakMap on an element, which is how the old one tracked its own DOM', () => {
        expect(offendersMatching(/new\s+WeakMap\s*<\s*(?:HTML)?Element/)).toEqual([]);
    });

    it('reads no element from the document', () => {
        expect(offendersMatching(/document\s*\.\s*(?:querySelector|getElementById)\s*\(/)).toEqual([]);
    });

    it('has something to check, so an empty directory cannot pass', () => {
        // Without this the three tests above pass trivially the day somebody moves the folder.
        expect(sourceFiles('src/ui').length).toBeGreaterThan(10);
    });
});
