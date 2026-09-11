/**
 * **A list with twenty items has to scroll, not grow.**
 *
 * Reported from a running flowboard: *"I like the list view better, it's easier to view stuff, but it
 * does not show right when the list has 20+ items."*
 *
 * The cause was one missing property. A flex item's default `min-height` is `auto`, which means it
 * **will not shrink below its content** — so `overflow-y: auto` on `.ui-entity-list-items` never
 * engaged, and the list grew to whatever height its rows wanted and pushed through the bottom of
 * whatever contained it. `.ui-table-rows` had it worse: the table clips with `overflow: hidden` for
 * its rounded corners and had no scroll area at all, so rows past the fold were **silently dropped**.
 * A list that overflows at least looks wrong; a table that loses its last rows looks finished.
 *
 * Both were invisible at the size everything is built and tested at. Every existing test renders a
 * handful of rows, which is precisely the range where the bug does not show — so the number in this
 * file is the test. Thirty items, in a container with a real height.
 *
 * ## Why this asserts against class names rather than a mounted app
 *
 * `ui.css`'s class names are interface — surfdns freeze gate **V0** lists them as part of what
 * mesh-core promises, and a screen writing `class: 'ui-action-card-submit'` is depending on them.
 * What is under test is the stylesheet's contract for that markup, so the markup is written out
 * directly. Mounting an application would test the renderer as well and make a failure ambiguous.
 */

import { afterEach, describe, expect, it } from 'vitest';

import '../src/ui/ui.css';

const CONTAINER_HEIGHT = 240;
const ITEMS = 30;

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const el of mounted.splice(0)) el.remove();
});

/** A parent with a real height, which is the situation a view is given by a window or a page. */
function bounded(): HTMLElement {
    const host = document.createElement('div');
    host.style.height = `${String(CONTAINER_HEIGHT)}px`;
    host.style.display = 'flex';
    host.style.flexDirection = 'column';
    document.body.append(host);
    mounted.push(host);
    return host;
}

const rows = (className: string, count: number): string =>
    Array.from({ length: count }, (_, i) => `<div class="${className}">row ${String(i)}</div>`).join('');

describe('a long list scrolls inside its container', () => {
    it('keeps the list within the height it was given', () => {
        const host = bounded();
        host.innerHTML = `
            <div class="ui-entity-list">
                <div class="ui-entity-list-header"><h2 class="ui-entity-list-title">Cards</h2></div>
                <div class="ui-entity-list-items">${rows('ui-entity-item', ITEMS)}</div>
            </div>`;

        const list = host.querySelector('.ui-entity-list') as HTMLElement;
        const items = host.querySelector('.ui-entity-list-items') as HTMLElement;

        // The bug: the list grew to its content and overflowed the parent. One pixel of tolerance,
        // because a border is allowed to round.
        expect(list.getBoundingClientRect().height).toBeLessThanOrEqual(CONTAINER_HEIGHT + 1);

        // And the rows are reachable rather than clipped: there is more content than shown, and the
        // element that holds it can be scrolled.
        expect(items.scrollHeight).toBeGreaterThan(items.clientHeight);
    });

    it('still shows every row when there are few', () => {
        // The fix must not turn a short list into a short scroll area with dead space under it.
        const host = bounded();
        host.innerHTML = `
            <div class="ui-entity-list">
                <div class="ui-entity-list-items">${rows('ui-entity-item', 2)}</div>
            </div>`;

        const items = host.querySelector('.ui-entity-list-items') as HTMLElement;
        expect(items.scrollHeight).toBeLessThanOrEqual(items.clientHeight + 1);
    });
});

describe('a long table scrolls rather than dropping rows', () => {
    it('does not clip the rows past the fold', () => {
        // Worse than the list's version: `.ui-table` clips with overflow:hidden for its rounded
        // corners, so without a scroll area the last rows were gone with no scrollbar to say so.
        const host = bounded();
        host.innerHTML = `
            <div class="ui-table">
                <div class="ui-table-header"><span class="ui-table-header-cell">Release</span></div>
                <div class="ui-table-rows">${rows('ui-table-row', ITEMS)}</div>
            </div>`;

        const table = host.querySelector('.ui-table') as HTMLElement;
        const rowsEl = host.querySelector('.ui-table-rows') as HTMLElement;
        const last = host.querySelector('.ui-table-row:last-child') as HTMLElement;

        expect(table.getBoundingClientRect().height).toBeLessThanOrEqual(CONTAINER_HEIGHT + 1);

        /**
         * **The assertion that catches it, and the first one I wrote did not.**
         *
         * `scrollHeight > clientHeight` passed with the fix reverted, because a rows element that
         * simply grows has scrollHeight equal to clientHeight and the table clips the overflow — so
         * the numbers agreed while the rows were being thrown away.
         *
         * What actually fails is *reaching the last row*. Scroll to the bottom and ask whether it is
         * inside the table. With a scroll area it is; without one `scrollTop` stays 0, the row sits
         * below the clipped edge, and there is nothing a person can do about it.
         */
        rowsEl.scrollTop = rowsEl.scrollHeight;
        expect(rowsEl.scrollTop).toBeGreaterThan(0);
        expect(last.getBoundingClientRect().bottom)
            .toBeLessThanOrEqual(table.getBoundingClientRect().bottom + 1);

        // The header stays put rather than scrolling away with the rows.
        const header = host.querySelector('.ui-table-header') as HTMLElement;
        expect(header.getBoundingClientRect().top).toBeLessThan(rowsEl.getBoundingClientRect().top + 1);
    });
});
