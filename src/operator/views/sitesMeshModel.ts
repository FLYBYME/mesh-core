import { chromeApi } from '../../generated/api.js';
import type { SitesFormSignals } from '../commands/sites.js';
import type { OperatorStateBundle } from '../state.js';

export interface KnownContract {
    readonly key: string;
    readonly domain: string;
    readonly defaultGate: 'public' | 'user' | 'admin' | 'operator';
}

export interface ContractRowData {
    readonly key: string;
    readonly domain: string;
    readonly isGranted: boolean;
    readonly isRequired: boolean;
    readonly isUnused: boolean;
    readonly gate: 'public' | 'user' | 'admin' | 'operator';
}

function isObjectWithGate(value: unknown): value is { readonly gate: { readonly level?: unknown } } {
    if (typeof value !== 'object' || value === null) return false;
    if (!('gate' in value)) return false;
    const g = value.gate;
    return typeof g === 'object' && g !== null;
}

function getGateLevel(callObj: unknown): 'public' | 'user' | 'admin' | 'operator' {
    if (isObjectWithGate(callObj)) {
        const g = callObj.gate;
        if ('level' in g && typeof g.level === 'string') {
            if (g.level === 'user' || g.level === 'admin' || g.level === 'operator') {
                return g.level;
            }
        }
    }
    return 'public';
}

export const BUILTIN_CONTRACTS: readonly KnownContract[] = Object.entries(chromeApi.calls).map(([key, def]) => {
    const domain = key.split('.')[0] || 'mesh';
    const defaultGate = getGateLevel(def);
    return { key, domain, defaultGate };
}).sort((a, b) => a.key.localeCompare(b.key));

export function parseGrantedContracts(meshJson: string): Map<string, 'public' | 'user' | 'admin' | 'operator'> {
    const map = new Map<string, 'public' | 'user' | 'admin' | 'operator'>();
    try {
        const parsed: unknown = JSON.parse(meshJson || '[]');
        if (Array.isArray(parsed)) {
            for (const item of parsed) {
                if (typeof item === 'object' && item !== null && 'contracts' in item && Array.isArray(item.contracts)) {
                    for (const c of item.contracts) {
                        if (typeof c === 'object' && c !== null && 'key' in c && typeof c.key === 'string') {
                            const auth = ('auth' in c && (c.auth === 'user' || c.auth === 'admin' || c.auth === 'operator'))
                                ? c.auth
                                : 'public';
                            map.set(c.key, auth);
                        }
                    }
                }
            }
        }
    } catch {}
    return map;
}

export function getAllContractRows(state: OperatorStateBundle, forms: SitesFormSignals): readonly ContractRowData[] {
    const grantedMap = parseGrantedContracts(forms.formMesh());
    const site = state.sites().find((s) => s.host === state.selectedHost()) ?? null;
    const release = state.releases().find((r) => r.hash === site?.releaseHash) ?? null;
    const requiredKeys = new Set(release?.requires ?? []);
    const hasRelease = Boolean(site?.releaseHash);

    const keys = new Set<string>();
    for (const b of BUILTIN_CONTRACTS) keys.add(b.key);
    for (const g of grantedMap.keys()) keys.add(g);
    for (const r of requiredKeys) keys.add(r);

    return Array.from(keys).sort().map((key) => {
        const builtin = BUILTIN_CONTRACTS.find((b) => b.key === key);
        const domain = key.split('.')[0] || 'mesh';
        const defaultGate = builtin?.defaultGate ?? 'public';
        const isGranted = grantedMap.has(key);
        const isRequired = requiredKeys.has(key);
        const isUnused = isGranted && hasRelease && !isRequired;
        const gate = grantedMap.get(key) ?? defaultGate;
        return { key, domain, isGranted, isRequired, isUnused, gate };
    });
}
