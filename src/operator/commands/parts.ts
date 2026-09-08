import type {
    BuilderImportRepoOutput,
    BuilderReleasePartOutput,
    BuilderReleaseRepoOutput,
    CatalogDeclareOutput,
    CatalogResolveOutput,
    PartFindOutputItem,
} from '../../generated/api.js';
import type { OperatorStateBundle } from '../state.js';

export interface CatalogFormSignals {
    readonly searchQuery: (val?: string) => string;
    readonly kindFilter: (val?: 'all' | 'kernel' | 'application' | 'extension') => 'all' | 'kernel' | 'application' | 'extension';
    readonly resolveKernel: (val?: string) => string;
    readonly resolvePartName: (val?: string) => string;
    readonly resolvePartRange: (val?: string) => string;
    readonly resolveStatus: (val?: 'idle' | 'resolving' | 'success' | 'error') => 'idle' | 'resolving' | 'success' | 'error';
    readonly resolveResult: (val?: CatalogResolveOutput | null) => CatalogResolveOutput | null;
    readonly resolveError: (val?: string | null) => string | null;
    readonly importRepoUrl: (val?: string) => string;
    readonly importRepoRef: (val?: string) => string;
    readonly importRepoSubdirectory: (val?: string) => string;
    readonly importStatus: (val?: 'idle' | 'importing' | 'success' | 'error') => 'idle' | 'importing' | 'success' | 'error';
    readonly importResult: (val?: BuilderImportRepoOutput | null) => BuilderImportRepoOutput | null;
    readonly importError: (val?: string | null) => string | null;
    readonly declarationEntry: (val?: string) => string;
    readonly declarationBranch: (val?: string) => string;
    readonly declarationKernel: (val?: string) => string;
    readonly declarationRequires: (val?: string) => string;
    readonly declarationSubdirectory: (val?: string) => string;
    readonly declarationStatus: (val?: 'idle' | 'saving' | 'success' | 'error') => 'idle' | 'saving' | 'success' | 'error';
    readonly declarationResult: (val?: CatalogDeclareOutput | null) => CatalogDeclareOutput | null;
    readonly declarationError: (val?: string | null) => string | null;
    readonly partReleaseBump: (val?: 'patch' | 'minor' | 'major') => 'patch' | 'minor' | 'major';
    readonly partReleaseStatus: (val?: 'idle' | 'releasing' | 'success' | 'error') => 'idle' | 'releasing' | 'success' | 'error';
    readonly partReleaseResult: (val?: BuilderReleasePartOutput | null) => BuilderReleasePartOutput | null;
    readonly partReleaseError: (val?: string | null) => string | null;
    readonly repoReleaseBump: (val?: 'patch' | 'minor' | 'major') => 'patch' | 'minor' | 'major';
    readonly repoReleaseStatus: (val?: 'idle' | 'releasing' | 'success' | 'error') => 'idle' | 'releasing' | 'success' | 'error';
    readonly repoReleaseResult: (val?: BuilderReleaseRepoOutput | null) => BuilderReleaseRepoOutput | null;
    readonly repoReleaseError: (val?: string | null) => string | null;
}

export async function selectCatalogPart(
    state: OperatorStateBundle,
    name: string,
): Promise<void> {
    state.selectedPartName.set(name);
    state.updateRoute('parts', { name });
}

export function selectCatalogVersion(
    state: OperatorStateBundle,
    version: string,
): void {
    state.selectedVersionNumber.set(version);
}

export async function runCatalogResolve(
    state: OperatorStateBundle,
    forms: CatalogFormSignals,
): Promise<void> {
    forms.resolveStatus('resolving');
    forms.resolveError(null);
    forms.resolveResult(null);

    const pName = forms.resolvePartName().trim();
    const pRange = forms.resolvePartRange().trim();
    const kRange = forms.resolveKernel().trim();

    if (pName === '') {
        forms.resolveStatus('error');
        forms.resolveError('Part name cannot be empty.');
        return;
    }

    const res = await state.cx.mesh.call('catalog.resolve', {
        kernel: kRange === '' ? '^0.11' : kRange,
        parts: [{ name: pName, version: pRange === '' ? '*' : pRange }],
    });

    if (res.ok) {
        forms.resolveResult(res.value);
        forms.resolveStatus('success');
    } else {
        forms.resolveStatus('error');
        const detail = 'detail' in res.error && typeof res.error.detail === 'string'
            ? res.error.detail : res.error.kind;
        const msg = `Resolution failed (${res.error.kind}): ${detail}`;
        forms.resolveError(msg);
        state.cx.notifications.error(msg);
    }
}

export async function runImportRepository(
    state: OperatorStateBundle,
    forms: CatalogFormSignals,
): Promise<void> {
    if (forms.importStatus() === 'importing') return;
    const repo = forms.importRepoUrl().trim();
    if (repo === '') {
        forms.importStatus('error');
        forms.importError('Repository URL cannot be empty.');
        return;
    }

    forms.importStatus('importing');
    forms.importError(null);
    forms.importResult(null);

    const refVal = forms.importRepoRef().trim();
    const subVal = forms.importRepoSubdirectory().trim();

    const res = await state.cx.mesh.call('builder.import_repo', {
        repository: repo,
        ...(refVal !== '' ? { ref: refVal } : {}),
        ...(subVal !== '' ? { subdirectory: subVal } : {}),
    });

    if (res.ok) {
        forms.importResult(res.value);
        forms.importStatus('success');
        if (res.value.parts.length > 0) {
            const first = res.value.parts[0];
            if (first !== undefined && state.selectedPartName() === null) {
                await selectCatalogPart(state, first.name);
            }
        }
        await state.refresh();
    } else {
        forms.importStatus('error');
        const detail = 'detail' in res.error && typeof res.error.detail === 'string'
            ? res.error.detail : res.error.kind;
        const msg = `Import failed (${res.error.kind}): ${detail}`;
        forms.importError(msg);
        state.cx.notifications.error(msg);
    }
}

export async function runSavePartDeclaration(
    state: OperatorStateBundle,
    forms: CatalogFormSignals,
    part: PartFindOutputItem | null,
): Promise<void> {
    if (forms.declarationStatus() === 'saving') return;
    if (part === null) {
        forms.declarationStatus('error');
        forms.declarationError('No part selected.');
        return;
    }

    const entry = forms.declarationEntry().trim();
    if (entry === '') {
        forms.declarationStatus('error');
        forms.declarationError('Source entry cannot be empty.');
        return;
    }

    forms.declarationStatus('saving');
    forms.declarationError(null);
    forms.declarationResult(null);

    const branch = forms.declarationBranch().trim() || 'HEAD';
    const kernel = forms.declarationKernel().trim();
    const rawReq = forms.declarationRequires().trim();
    const requires = rawReq === '' ? [] : rawReq.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    const sub = forms.declarationSubdirectory().trim();

    const res = await state.cx.mesh.call('catalog.declare', {
        name: part.name,
        kind: part.kind,
        repository: part.repository,
        declaration: {
            entry,
            branch,
            ...(kernel !== '' ? { kernel } : {}),
            requires,
            ...(sub !== '' ? { subdirectory: sub } : {}),
        },
        ...(part.description ? { description: part.description } : {}),
        ...(part.homepage ? { homepage: part.homepage } : {}),
        ...(part.license ? { license: part.license } : {}),
        ...(part.keywords && part.keywords.length > 0 ? { keywords: part.keywords } : {}),
    });

    if (res.ok) {
        forms.declarationResult(res.value);
        forms.declarationStatus('success');
        await state.refresh();
    } else {
        forms.declarationStatus('error');
        const detail = 'detail' in res.error && typeof res.error.detail === 'string'
            ? res.error.detail : res.error.kind;
        const msg = `Failed to save declaration (${res.error.kind}): ${detail}`;
        forms.declarationError(msg);
        state.cx.notifications.error(msg);
    }
}

export async function runReleaseCatalogPart(
    state: OperatorStateBundle,
    forms: CatalogFormSignals,
    part: PartFindOutputItem | null,
): Promise<void> {
    if (forms.partReleaseStatus() === 'releasing') return;
    if (part === null) return;

    const bump = forms.partReleaseBump();
    const ok = await state.cx.confirmation.ask({
        message: `Release part "${part.name}" with ${bump} bump? This will pull, mint the next version, publish, and build its artifact.`,
        confirmLabel: `Release ${part.name}`,
        destructive: true,
    });
    if (!ok) return;

    forms.partReleaseStatus('releasing');
    forms.partReleaseError(null);
    forms.partReleaseResult(null);

    const res = await state.cx.mesh.call('builder.release_part', {
        part: part.name,
        bump,
    });

    if (res.ok) {
        forms.partReleaseResult(res.value);
        forms.partReleaseStatus('success');
        await state.refresh();
    } else {
        forms.partReleaseStatus('error');
        const detail = 'detail' in res.error && typeof res.error.detail === 'string'
            ? res.error.detail : res.error.kind;
        const msg = `Release failed (${res.error.kind}): ${detail}`;
        forms.partReleaseError(msg);
        state.cx.notifications.error(msg);
    }
}

export async function runReleaseCatalogRepo(
    state: OperatorStateBundle,
    forms: CatalogFormSignals,
    part: PartFindOutputItem | null,
): Promise<void> {
    if (forms.repoReleaseStatus() === 'releasing') return;
    const repo = part?.repository ?? forms.importRepoUrl().trim();
    if (!repo) {
        forms.repoReleaseStatus('error');
        const msg = 'No repository specified. Select a part or enter a repository URL.';
        forms.repoReleaseError(msg);
        state.cx.notifications.error(msg);
        return;
    }

    const bump = forms.repoReleaseBump();
    const ok = await state.cx.confirmation.ask({
        message: `Release all parts declared by repository "${repo}" with ${bump} bump? This will build kernels first, then all other parts.`,
        confirmLabel: 'Release All Parts',
        destructive: true,
    });
    if (!ok) return;

    forms.repoReleaseStatus('releasing');
    forms.repoReleaseError(null);
    forms.repoReleaseResult(null);

    const res = await state.cx.mesh.call('builder.release_repo', {
        repository: repo,
        bump,
    });

    if (res.ok) {
        forms.repoReleaseResult(res.value);
        forms.repoReleaseStatus('success');
        await state.refresh();
    } else {
        forms.repoReleaseStatus('error');
        const detail = 'detail' in res.error && typeof res.error.detail === 'string'
            ? res.error.detail : res.error.kind;
        const msg = `Repository release failed (${res.error.kind}): ${detail}`;
        forms.repoReleaseError(msg);
        state.cx.notifications.error(msg);
    }
}
