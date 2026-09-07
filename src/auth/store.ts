import type { TicketStore } from './contract.js';

/**
 * `sessionStorage`, scoped to the tab.
 *
 * Offered rather than assumed. `localStorage` is deliberately not the default: it outlives the tab
 * and is readable by every script on the origin, which is a longer life than a ticket wants.
 */
export function sessionTicketStore(key = 'mesh-web/ticket'): TicketStore {
    return {
        read: () => {
            try { return globalThis.sessionStorage?.getItem(key) ?? undefined; } catch { return undefined; }
        },
        write: (token) => {
            try { globalThis.sessionStorage?.setItem(key, token); } catch { /* a private window; not fatal */ }
        },
        clear: () => {
            try { globalThis.sessionStorage?.removeItem(key); } catch { /* as above */ }
        },
    };
}
