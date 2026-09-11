/**
 * The design system does not touch the DOM -- asserted over the source.
 *
 * Separate from ui.test.ts because that file runs in a real browser, where node:fs is
 * externalised and the source cannot be read. This one runs under node.
 *
 * .spec.ts, and that is not a style choice. The browser config collects every .test.ts file
 * under test/, so a node-only file named .test.ts is picked up by both runners and fails in
 * the browser one -- which is exactly how it failed the first merge attempt. The extension is what
 * keeps them apart.
 *
 * Asserted over the text rather than by behaviour, because that is the only way it stays true. A
 * single document.createElement reintroduces the thing the rewrite deleted -- entityList.ts was
 * 211 lines of imperative DOM, a WeakMap<Element, HTMLElement>, manual header.remove() and
 * [data-status] toggles, for a sidebar with a heading, a count and three states -- and no
 * behavioural test would notice, because it would still work.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const sourceFiles = (dir: string, ext?: string): readonly string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...sourceFiles(path, ext));
        else if (!ext || entry.name.endsWith(ext)) out.push(path);
    }
    return out;
};

const tsFiles  = (): readonly string[] => sourceFiles('src/ui', '.ts');
const cssFiles = (): readonly string[] => sourceFiles('src/ui', '.css');

const offendersMatching = (pattern: RegExp): readonly string[] =>
    tsFiles().filter((path) => pattern.test(readFileSync(path, 'utf8')));

describe('no component reaches for an element', () => {
    it('calls document.createElement nowhere under src/ui', () => {
        // A call, not a mention: index.ts documents the rule in a comment, and a test that
        // failed on its own documentation would be deleted within a week.
        expect(offendersMatching(/document\s*\.\s*createElement\s*\(/)).toEqual([]);
    });

    it('keys no WeakMap on an element, which is how the old one tracked its own DOM', () => {
        expect(offendersMatching(/new\s+WeakMap\s*<\s*(?:HTML)?Element/)).toEqual([]);
    });

    it('reads no element from the document', () => {
        expect(offendersMatching(/document\s*\.\s*(?:querySelector|getElementById)\s*\(/)).toEqual([]);
    });

    // No browser global either, not just no element.
    // src/auth had a function reading globalThis.sessionStorage until it was deleted for exactly
    // this. A part reaches the browser through what the kernel hands it; a component reaches it
    // through a description. Comments are stripped first because index.ts names the rule.
    it('reads no browser global under src/ui', () => {
        const code = (path: string): string => readFileSync(path, 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '');
        const global = /(?<![\\w$.])(?:globalThis|window|document|localStorage|sessionStorage)\s*[.[]/;
        expect(tsFiles().filter((path) => global.test(code(path)))).toEqual([]);
    });

    it('has something to check, so an empty directory cannot pass', () => {
        // Without this the three tests above pass trivially the day somebody moves the folder.
        expect(tsFiles().length).toBeGreaterThan(10);
    });
});

// ---------------------------------------------------------------------------- U1: design-token enforcement

// The check scans CSS source (not computed styles) for:
//   - hex literals (#abc, #aabbcc, #aabbccdd)
//   - rgb() and hsl() colour functions in the components layer
//   - raw px values in gap, padding, and margin declarations
//
// A place where a literal is genuinely correct carries a line-comment opt-out:
//   property: value; /* ui-literal: <non-empty reason> */
// The reason must be non-empty. The check treats that annotation as explicit approval.
//
// This is a source scan, not a runtime check, because a runtime check would need a mounted
// component in a real browser and would only catch rules the tests happened to exercise.
// The scan catches every rule every component declares, regardless of whether a test covers it.

describe('css uses tokens, not literals (U1)', () => {
    // Strip lines that contain an explicit opt-out annotation.
    // The annotation is:  /* ui-literal: <non-empty reason> */  on the same line.
    // An empty reason is not accepted.
    const UI_LITERAL_RE = /\/\*\s*ui-literal:\s*\S/;

    /**
     * Blank what must not be scanned, **keeping the line count**, in two passes.
     *
     * Order matters: an opt-out *is* a comment, so opt-out lines go first or the annotation is
     * erased before it is read.
     *
     * 1. **Opt-out lines** become empty. They used to be `filter`ed out, which dropped them from the
     *    array — so every line number reported after the first opt-out was wrong, and the failure
     *    message pointed at the wrong rule. A check whose output sends you to the wrong line is a
     *    check people stop trusting.
     * 2. **Comment bodies** become spaces. Without this the scan reads prose: documenting *why*
     *    `--on-accent` must not be `#fff` failed the test for containing `#fff`, which is the check
     *    forbidding its own explanation. Newlines are preserved so a block comment does not collapse
     *    the file.
     */
    const blankForScan = (source: string): string => {
        const withoutOptOuts = source
            .split('\n')
            .map((line) => (UI_LITERAL_RE.test(line) ? '' : line))
            .join('\n');

        return withoutOptOuts.replace(
            /\/\*[\s\S]*?\*\//g,
            (comment) => comment.replace(/[^\n]/g, ' '),
        );
    };

    // Returns offending lines from CSS files (after removing opt-out lines).
    // Each result is "file:linenum  content" for a readable failure message.
    const offendingLines = (pattern: RegExp): readonly string[] => {
        const results: string[] = [];
        for (const file of cssFiles()) {
            const source = readFileSync(file, 'utf8');
            const stripped = blankForScan(source);
            const originalLines = source.split('\n');
            const strippedLines = stripped.split('\n');
            strippedLines.forEach((line, i) => {
                if (pattern.test(line)) {
                    results.push(`${file}:${i + 1}  ${(originalLines[i] ?? line).trim()}`);
                }
            });
        }
        return results;
    };

    /**
     * **CSS comments do not nest, and this file is documented heavily enough for that to matter.**
     *
     * The header explained the opt-out annotation by spelling it out inline, terminator and all. The
     * header comment therefore ended at that inner terminator, and the remainder of the sentence
     * became stray text before the first rule — where a browser read `comment.` as a selector and
     * consumed the entire `@layer ui.tokens { … }` block as its declaration body.
     *
     * So **every token was undefined on the live page**: colours, spacing, radii, all of it resolving
     * to nothing, lists rendering unstyled and stacked. The file was valid to every tool that reads
     * CSS as text — the token scan below passed, the bundler emitted it, the server served it — and
     * invalid to the only thing that parses it. Nothing in the suite could see it, which is why this
     * check is here and not a comment asking people to be careful.
     *
     * A nested opener is the detectable half: a comment opening while already inside one.
     *
     * This doc comment made the same mistake while being written, which is the argument for the
     * check rather than against it.
     */
    it('has no nested comment opener, which silently truncates the file', () => {
        const offences: string[] = [];

        for (const file of cssFiles()) {
            const source = readFileSync(file, 'utf8');
            let index = 0;
            let line = 1;

            while (index < source.length) {
                if (source.startsWith('/*', index)) {
                    const close = source.indexOf('*/', index + 2);
                    const body = source.slice(index + 2, close === -1 ? source.length : close);
                    const nested = body.indexOf('/*');
                    if (nested !== -1) {
                        const at = line + (body.slice(0, nested).match(/\n/g)?.length ?? 0);
                        offences.push(`${file}:${String(at)}  a comment opens inside a comment`);
                    }
                    if (close === -1) {
                        offences.push(`${file}:${String(line)}  a comment is never closed`);
                        break;
                    }
                    line += (source.slice(index, close).match(/\n/g)?.length ?? 0);
                    index = close + 2;
                    continue;
                }
                if (source[index] === '\n') line += 1;
                index += 1;
            }
        }

        expect(offences, offences.join('\n')).toEqual([]);
    });

    it('contains no hex colour literals', () => {
        // Matches #rgb, #rrggbb, #rrggbbaa -- but not inside a comment or opt-out.
        const hexLiteral = /#[0-9a-fA-F]{3,8}\b/;
        expect(offendingLines(hexLiteral)).toEqual([]);
    });

    it('contains no rgb() or hsl() colour functions in component rules', () => {
        // Matches rgb( and hsl( as colour functions in property values.
        // Token definitions in @layer ui.tokens use rgb(var(...)) to derive colour values from
        // channel variables -- those are the tokens, not literals. The check ignores lines in
        // the token layer by only scanning @layer ui.components content.
        const colourFn = /(?<![a-z-])(?:rgb|hsl)\s*\(/i;

        const results: string[] = [];
        for (const file of cssFiles()) {
            const full = readFileSync(file, 'utf8');
            // Extract the content of @layer ui.components by finding the block after the layer.
            const match = full.match(/@layer\s+ui\.components\s*\{([\s\S]*)/);
            const source = match?.[1] ?? full;
            const stripped = blankForScan(source);
            const lines = stripped.split('\n');
            lines.forEach((line, i) => {
                if (colourFn.test(line)) {
                    results.push(`${file} (components section) ~line ${i + 1}:  ${line.trim()}`);
                }
            });
        }
        expect(results).toEqual([]);
    });

    it('contains no raw px values in gap, padding, or margin declarations', () => {
        // Matches: gap: 8px / padding: 8px 12px / margin: 4px 0 etc.
        // Does not match: padding: var(...) or gap: 0 (zero is dimensionless).
        // Does not match layout constraints (min-height, max-width, width, height, font-size).
        const rawPxSpacing = /^\s*(?:gap|padding|margin)\s*:[^;]*\d+px/;
        expect(offendingLines(rawPxSpacing)).toEqual([]);
    });

    it('has css files to check, so a deleted directory cannot silently pass', () => {
        expect(cssFiles().length).toBeGreaterThan(0);
    });
});
