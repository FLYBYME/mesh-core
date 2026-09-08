/**
 * Pure router logic for URL hash-based navigation.
 *
 * Imports no sibling and no kernel modules.
 */

export interface ChromeWindowLike {
    readonly id: string;
    readonly owner: string;
    readonly view: string;
    readonly title: string;
}

export interface Route {
    readonly owner?: string;
    readonly view: string;
}

export function parseRoute(hash: string): Route | null {
    if (!hash) return null;
    let clean = hash;
    if (clean.startsWith('#')) clean = clean.slice(1);
    if (clean.startsWith('/')) clean = clean.slice(1);
    if (!clean) return null;

    const segments = clean.split('/').filter((s) => s.length > 0);
    const first = segments[0];
    if (first === undefined) return null;

    if (segments.length === 1) {
        return { view: first };
    }

    const owner = first;
    const view = segments.slice(1).join('/');
    return { owner, view };
}

export function formatRoute(view: string): string {
    return `#/${view}`;
}

export function findMatchingWindow<T extends ChromeWindowLike>(
    windows: readonly T[],
    route: Route,
): T | undefined {
    // 1. Direct view match (works for both #/beta and #/panel/beta)
    const byView = windows.find((w) => w.view === route.view);
    if (byView !== undefined) return byView;

    // 2. Owner match if route specifies owner
    if (route.owner !== undefined) {
        const byOwner = windows.find((w) => w.owner === route.owner && w.view === route.view);
        if (byOwner !== undefined) return byOwner;
    }

    // 3. Fallback: match by title
    const byTitle = windows.find((w) => w.title.toLowerCase() === route.view.toLowerCase());
    if (byTitle !== undefined) return byTitle;

    return undefined;
}

export class HashRouter {
    private _current: string = '';

    constructor(private readonly _win?: Window) {
        if (_win !== undefined) {
            this._current = _win.location.hash;
        }
    }

    get currentHash(): string {
        return this._win !== undefined ? this._win.location.hash : this._current;
    }

    currentRoute(): Route | null {
        return parseRoute(this.currentHash);
    }

    push(view: string): void {
        const formatted = formatRoute(view);
        if (this._current === formatted) return;
        this._current = formatted;
        if (this._win !== undefined && this._win.location.hash !== formatted) {
            this._win.history.pushState(null, '', formatted);
        }
    }

    replace(view: string): void {
        const formatted = formatRoute(view);
        this._current = formatted;
        if (this._win !== undefined && this._win.location.hash !== formatted) {
            this._win.history.replaceState(null, '', formatted);
        }
    }

    listen(onChange: (route: Route) => void): () => void {
        const win = this._win;
        if (win === undefined) return () => {};

        const handler = () => {
            const hash = win.location.hash;
            this._current = hash;
            const parsed = parseRoute(hash);
            if (parsed !== null) {
                onChange(parsed);
            }
        };

        win.addEventListener('popstate', handler);
        win.addEventListener('hashchange', handler);

        return () => {
            win.removeEventListener('popstate', handler);
            win.removeEventListener('hashchange', handler);
        };
    }
}
