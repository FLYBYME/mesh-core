import type { SiteFindOutputItem, SiteFindOutputItemMeshItem } from '../../generated/api.js';
import type { OperatorStateBundle } from '../state.js';

export interface SitesFormSignals {
    readonly formTitle: (val?: string) => string;
    readonly formDescription: (val?: string) => string;
    readonly formIndexable: (val?: boolean) => boolean;
    readonly formTheme: (val?: string) => string;
    readonly formPolicy: (val?: string) => string;
    readonly formMesh: (val?: string) => string;
    readonly deployReleaseInput: (val?: string) => string;
    readonly meshFilter: (val?: 'all' | 'granted' | 'required' | 'unused') => 'all' | 'granted' | 'required' | 'unused';
    readonly meshSearch: (val?: string) => string;
    readonly showRawMesh: (val?: boolean) => boolean;
    readonly busy: (val?: boolean) => boolean;
    readonly lastAction: (val?: string | null) => string | null;
    readonly lastError: (val?: string | null) => string | null;
    readonly newSiteHost: (val?: string) => string;
    readonly newSiteTitle: (val?: string) => string;
    readonly newSiteDescription: (val?: string) => string;
}

export function populateSiteForm(s: SiteFindOutputItem | null, forms: SitesFormSignals): void {
    if (s === null) {
        forms.formTitle('');
        forms.formDescription('');
        forms.formIndexable(true);
        forms.formTheme('{}');
        forms.formPolicy('{}');
        forms.formMesh('[]');
    } else {
        forms.formTitle(s.title ?? '');
        forms.formDescription(s.description ?? '');
        forms.formIndexable(s.indexable ?? true);
        forms.formTheme(JSON.stringify(s.theme ?? {}, null, 2));
        forms.formPolicy(JSON.stringify(s.policy ?? {}, null, 2));
        forms.formMesh(JSON.stringify(s.mesh ?? [], null, 2));
    }
    forms.deployReleaseInput('');
    forms.meshFilter('all');
    forms.meshSearch('');
    forms.showRawMesh(false);
}

export function isSiteFormDirty(site: SiteFindOutputItem | null, forms: SitesFormSignals): boolean {
    if (site === null) return false;
    const initialTitle = site.title ?? '';
    const initialDesc = site.description ?? '';
    const initialIdx = site.indexable ?? true;
    const initialTheme = JSON.stringify(site.theme ?? {}, null, 2);
    const initialPolicy = JSON.stringify(site.policy ?? {}, null, 2);
    const initialMesh = JSON.stringify(site.mesh ?? [], null, 2);

    return forms.formTitle() !== initialTitle
        || forms.formDescription() !== initialDesc
        || forms.formIndexable() !== initialIdx
        || forms.formTheme() !== initialTheme
        || forms.formPolicy() !== initialPolicy
        || forms.formMesh() !== initialMesh;
}

export async function selectSite(
    state: OperatorStateBundle,
    forms: SitesFormSignals,
    host: string,
    currentSite: SiteFindOutputItem | null,
): Promise<void> {
    if (state.selectedHost() === host) return;
    if (isSiteFormDirty(currentSite, forms)) {
        const ok = await state.cx.confirmation.ask({
            message: 'Discard unsaved changes to this site?',
            confirmLabel: 'Discard',
            destructive: true,
        });
        if (!ok) return;
    }
    state.selectedHost.set(host);
    state.updateRoute('sites', { host });
}

function parseStringRecord(raw: string): Record<string, string> {
    if (!raw.trim()) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Expected a JSON object');
    }
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
        result[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return result;
}

export async function saveSite(
    state: OperatorStateBundle,
    forms: SitesFormSignals,
    site: SiteFindOutputItem | null,
): Promise<void> {
    if (site === null) return;

    let theme: Record<string, string>;
    let policy: Record<string, string>;
    try {
        theme = parseStringRecord(forms.formTheme());
        policy = parseStringRecord(forms.formPolicy());
    } catch (error) {
        const msg = `Theme and policy must be JSON objects: ${error instanceof Error ? error.message : String(error)}`;
        forms.lastError(msg);
        state.cx.notifications.error(msg);
        return;
    }

    const ok = await state.cx.confirmation.ask({
        message: `Apply changes to site "${site.host}"?`,
        confirmLabel: 'Save changes',
    });
    if (!ok) return;

    forms.busy(true);
    forms.lastError(null);
    try {
        const res = await state.cx.mesh.call('cdn.site_edit', {
            host: site.host,
            title: forms.formTitle(),
            description: forms.formDescription(),
            indexable: forms.formIndexable(),
            theme,
            policy,
        });

        if (res.ok) {
            forms.lastAction(`Saved changes to ${site.host}.`);
            await state.refresh();
        } else {
            const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                ? res.error.detail : res.error.kind;
            const msg = `Could not save ${site.host} (${res.error.kind}): ${detail}`;
            forms.lastError(msg);
            state.cx.notifications.error(msg);
        }
    } finally {
        forms.busy(false);
    }
}

export async function createSite(
    state: OperatorStateBundle,
    forms: SitesFormSignals,
    input: { host: string; title?: string; description?: string },
): Promise<void> {
    const host = input.host.trim();
    if (!host) {
        const msg = 'Site host is required.';
        forms.lastError(msg);
        state.cx.notifications.error(msg);
        return;
    }

    forms.busy(true);
    forms.lastError(null);
    try {
        const res = await state.cx.mesh.call('site.create', {
            host,
            application: 'operator',
            api: 'default',
            mesh: [],
            theme: {},
            policy: {},
            ...(input.title ? { title: input.title } : {}),
            ...(input.description ? { description: input.description } : {}),
        });

        if (res.ok) {
            forms.lastAction(`Successfully created site "${host}".`);
            await state.refresh();
            state.selectedHost.set(host);
            state.updateRoute('sites', { host });
        } else {
            const detail = 'detail' in res.error && typeof res.error.detail === 'string'
                ? res.error.detail : res.error.kind;
            const msg = `Could not create site ${host} (${res.error.kind}): ${detail}`;
            forms.lastError(msg);
            state.cx.notifications.error(msg);
        }
    } finally {
        forms.busy(false);
    }
}

export function toggleContractGrant(forms: SitesFormSignals, key: string): void {
    let list: SiteFindOutputItemMeshItem[] = [];
    try {
        const parsed = JSON.parse(forms.formMesh() || '[]');
        if (Array.isArray(parsed)) list = JSON.parse(JSON.stringify(parsed));
    } catch {
        list = [];
    }

    let found = false;
    for (let i = 0; i < list.length; i++) {
        const pkgItem = list[i];
        if (!pkgItem) continue;
        const contracts = (pkgItem.contracts ?? []).filter((c) => {
            if (c.key === key) {
                found = true;
                return false;
            }
            return true;
        });
        list[i] = { ...pkgItem, contracts };
    }
    list = list.filter((p) => (p.contracts && p.contracts.length > 0) || (p.events && p.events.length > 0));

    if (!found) {
        const pkgName = key.split('.')[0] || 'mesh-core';
        let targetPkg = list.find((p) => p.package === pkgName);
        if (!targetPkg) {
            targetPkg = { package: pkgName, version: '*', contracts: [] };
            list.push(targetPkg);
        }
        const publicAuth: 'public' = 'public';
        const updatedContracts = [...(targetPkg.contracts ?? []), { key, auth: publicAuth }];
        const idx = list.indexOf(targetPkg);
        list[idx] = { ...targetPkg, contracts: updatedContracts };
    }

    forms.formMesh(JSON.stringify(list, null, 2));
}

export function setContractGrantGate(
    forms: SitesFormSignals,
    key: string,
    gate: 'public' | 'user' | 'admin' | 'operator',
): void {
    let list: SiteFindOutputItemMeshItem[] = [];
    try {
        const parsed = JSON.parse(forms.formMesh() || '[]');
        if (Array.isArray(parsed)) list = JSON.parse(JSON.stringify(parsed));
    } catch {
        list = [];
    }
    let found = false;
    for (let i = 0; i < list.length; i++) {
        const pkgItem = list[i];
        if (!pkgItem) continue;
        const contracts = (pkgItem.contracts ?? []).map((c) => {
            if (c.key === key) {
                found = true;
                return { ...c, auth: gate };
            }
            return c;
        });
        list[i] = { ...pkgItem, contracts };
    }
    if (!found) {
        const pkgName = key.split('.')[0] || 'mesh-core';
        let targetPkg = list.find((p) => p.package === pkgName);
        if (!targetPkg) {
            targetPkg = { package: pkgName, version: '*', contracts: [] };
            list.push(targetPkg);
        }
        const updatedContracts = [...(targetPkg.contracts ?? []), { key, auth: gate }];
        const idx = list.indexOf(targetPkg);
        list[idx] = { ...targetPkg, contracts: updatedContracts };
    }
    forms.formMesh(JSON.stringify(list, null, 2));
}
