/**
 * Pure router logic for URL hash-based navigation.
 *
 * Imports no sibling and no kernel modules.
 */

import type { Json } from '@flybyme/mesh-web';

export interface ChromeWindowLike {
    readonly id: string;
    readonly owner: string;
    readonly view: string;
    readonly title: string;
}

export interface Route {
    readonly owner?: string;
    readonly view: string;
    readonly params?: Readonly<Record<string, Json>>;
}

export function parseRoute(hash: string): Route | null {
    if (!hash) return null;
    let clean = hash;
    if (clean.startsWith('#')) clean = clean.slice(1);
    if (clean.startsWith('/')) clean = clean.slice(1);
    if (!clean) return null;

    const [pathPart = '', queryPart] = clean.split('?');
    const segments = pathPart.split('/').filter((s) => s.length > 0);
    const first = segments[0];
    if (first === undefined) return null;

    const params: Record<string, Json> = {};
    if (queryPart !== undefined && queryPart.length > 0) {
        const sp = new URLSearchParams(queryPart);
        for (const [key, val] of sp.entries()) {
            params[key] = val;
        }
    }

    if (segments.length === 1) {
        return { view: first, params };
    }

    const owner = first;
    const view = segments.slice(1).join('/');
    return { owner, view, params };
}

export function formatRoute(
    routeOrView: Route | string,
    maybeParams?: Readonly<Record<string, Json>>,
): string {
    let owner: string | undefined;
    let view: string;
    let params: Readonly<Record<string, Json>> | undefined;

    if (typeof routeOrView === 'string') {
        if (routeOrView.includes('?')) {
            const parsed = parseRoute(routeOrView);
            if (parsed !== null) {
                owner = parsed.owner;
                view = parsed.view;
                params = { ...parsed.params, ...maybeParams };
            } else {
                let clean = routeOrView;
                if (clean.startsWith('#')) clean = clean.slice(1);
                if (clean.startsWith('/')) clean = clean.slice(1);
                const [pathPart = ''] = clean.split('?');
                const segments = pathPart.split('/').filter((s) => s.length > 0);
                if (segments.length > 1) {
                    owner = segments[0];
                    view = segments.slice(1).join('/');
                } else {
                    view = segments[0] ?? '';
                }
                params = maybeParams;
            }
        } else {
            let clean = routeOrView;
            if (clean.startsWith('#')) clean = clean.slice(1);
            if (clean.startsWith('/')) clean = clean.slice(1);
            const segments = clean.split('/').filter((s) => s.length > 0);
            if (segments.length > 1) {
                owner = segments[0];
                view = segments.slice(1).join('/');
            } else {
                view = segments[0] ?? '';
            }
            params = maybeParams;
        }
    } else {
        owner = routeOrView.owner;
        view = routeOrView.view;
        params = routeOrView.params ?? maybeParams;
    }

    const path = owner !== undefined ? `#/${owner}/${view}` : `#/${view}`;
    if (params !== undefined && Object.keys(params).length > 0) {
        const sp = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null) {
                sp.set(k, String(v));
            }
        }
        const qs = sp.toString();
        if (qs) {
            return `${path}?${qs}`;
        }
    }
    return path;
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

    push(routeOrView: Route | string, params?: Readonly<Record<string, Json>>): void {
        const formatted = formatRoute(routeOrView, params);
        if (this._current === formatted) return;
        this._current = formatted;
        if (this._win !== undefined && this._win.location.hash !== formatted) {
            this._win.history.pushState(null, '', formatted);
        }
    }

    replace(routeOrView: Route | string, params?: Readonly<Record<string, Json>>): void {
        const formatted = formatRoute(routeOrView, params);
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
