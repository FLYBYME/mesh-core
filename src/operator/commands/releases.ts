import type {
    CdnComposeInputPart,
    CdnComposeOutput,
    CdnDeployOutput,
} from '../../generated/api.js';
import type { OperatorStateBundle } from '../state.js';

export interface ReleasesFormSignals {
    readonly composeKernel: (val?: string) => string;
    readonly composeName: (val?: string) => string;
    readonly composeParts: (val?: readonly CdnComposeInputPart[]) => readonly CdnComposeInputPart[];
    readonly composePartsText: (val?: string) => string;
    readonly composeRolling: (val?: boolean) => boolean;
    readonly composeSeededFrom: (val?: string | null) => string | null;
    readonly composeStatus: (val?: 'idle' | 'composing' | 'success' | 'error') => 'idle' | 'composing' | 'success' | 'error';
    readonly composeResult: (val?: CdnComposeOutput | null) => CdnComposeOutput | null;
    readonly composeError: (val?: string | null) => string | null;
    readonly deployStatus: (val?: 'idle' | 'deploying' | 'success' | 'error') => 'idle' | 'deploying' | 'success' | 'error';
    readonly deployResult: (val?: CdnDeployOutput | null) => CdnDeployOutput | null;
    readonly deployError: (val?: string | null) => string | null;
}

export function selectRelease(
    state: OperatorStateBundle,
    hash: string,
    forms?: ReleasesFormSignals,
): void {
    state.selectedReleaseHash.set(hash);
    if (forms !== undefined) {
        forms.deployResult(null);
        forms.deployError(null);
    }
    state.updateRoute('releases', { hash });
}

export async function runCompose(
    state: OperatorStateBundle,
    forms: ReleasesFormSignals,
    dryRun: boolean,
): Promise<void> {
    forms.composeStatus('composing');
    forms.composeError(null);
    forms.composeResult(null);

    const parts = forms.composeParts().filter((p) => p.id.trim() !== '' && p.version.trim() !== '');
    if (parts.length === 0) {
        forms.composeStatus('error');
        forms.composeError('No valid parts entered. Add at least one part with an ID and version range.');
        return;
    }

    const kernel = forms.composeKernel().trim();
    if (kernel === '') {
        forms.composeStatus('error');
        forms.composeError('A kernel range is required. Select a release to seed one, or type it.');
        return;
    }

    const trimmedName = forms.composeName().trim();
    const res = await state.cx.mesh.call('cdn.compose', {
        kernel,
        parts,
        dryRun,
        rolling: forms.composeRolling(),
        ...(trimmedName !== '' ? { name: trimmedName } : {}),
    });

    if (res.ok) {
        forms.composeResult(res.value);
        forms.composeStatus('success');
        if (!dryRun) {
            await state.refresh();
            selectRelease(state, res.value.hash, forms);
        }
    } else {
        forms.composeStatus('error');
        const detail = 'detail' in res.error && typeof res.error.detail === 'string'
            ? res.error.detail : res.error.kind;
        const msg = `Composition failed (${res.error.kind}): ${detail}`;
        forms.composeError(msg);
        state.cx.notifications.error(msg);
    }
}

export async function runDeploy(
    state: OperatorStateBundle,
    forms: ReleasesFormSignals,
    host: string,
    releaseHash: string,
): Promise<void> {
    if (!host || !releaseHash) return;

    const ok = await state.cx.confirmation.ask({
        message: `Deploy release "${releaseHash}" to "${host}"? This will switch live traffic.`,
        confirmLabel: 'Deploy release',
        destructive: true,
    });
    if (!ok) return;

    forms.deployStatus('deploying');
    forms.deployError(null);
    forms.deployResult(null);

    const res = await state.cx.mesh.call('cdn.deploy', { host, release: releaseHash });
    if (res.ok) {
        forms.deployResult(res.value);
        forms.deployStatus('success');
        await state.refresh();
    } else {
        forms.deployStatus('error');
        const detail = 'detail' in res.error && typeof res.error.detail === 'string'
            ? res.error.detail : res.error.kind;
        const msg = `Deploy failed (${res.error.kind}): ${detail}`;
        forms.deployError(msg);
        state.cx.notifications.error(msg);
    }
}

export function addComposePart(forms: ReleasesFormSignals, part?: Partial<CdnComposeInputPart>): void {
    const curr = [...forms.composeParts()];
    curr.push({
        id: part?.id ?? '',
        version: part?.version ?? '^0.1.0',
        kind: part?.kind ?? 'application',
    });
    forms.composeParts(curr);
    forms.composePartsText(curr.map((p) => `${p.id}: ${p.version}`).join('\n'));
    forms.composeSeededFrom(null);
}

export function removeComposePart(forms: ReleasesFormSignals, index: number): void {
    const curr = [...forms.composeParts()];
    if (index >= 0 && index < curr.length) {
        curr.splice(index, 1);
        forms.composeParts(curr);
        forms.composePartsText(curr.map((p) => `${p.id}: ${p.version}`).join('\n'));
        forms.composeSeededFrom(null);
    }
}

export function updateComposePart(
    forms: ReleasesFormSignals,
    index: number,
    patch: Partial<CdnComposeInputPart>,
): void {
    const curr = [...forms.composeParts()];
    const target = curr[index];
    if (index >= 0 && index < curr.length && target !== undefined) {
        curr[index] = {
            id: patch.id ?? target.id,
            version: patch.version ?? target.version,
            kind: patch.kind ?? target.kind,
        };
        forms.composeParts(curr);
        forms.composePartsText(curr.map((p) => `${p.id}: ${p.version}`).join('\n'));
        forms.composeSeededFrom(null);
    }
}
