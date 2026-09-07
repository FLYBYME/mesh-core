import {
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type ViewDecl,
} from '@flybyme/mesh-web';

import { chromeApi, type SiteFindOutputItem } from '../generated/api.js';
import {
    CONSUMES,
    NEEDS,
    SITES,
    type SitesApi,
} from './contract.js';
import { renderSitesView } from './views/sites.js';

export * from './contract.js';

/**
 * The site editor console application.
 *
 * Reads via `cx.models('site')`, writes targeting `site.create` and `site.update` (or `cdn.site_edit`),
 * explicitly excluding `releaseHash`.
 *
 * Direct site metadata writes (`theme`, `policy`, `title`, `description`, `indexable`, `mesh`) are
 * currently internal on the server (FLYBYME/mesh-serve#5) to keep release deployment and site
 * editing cleanly separated. Form controls are visibly disabled until those writes are exposed.
 *
 * Release deployment via `cdn.deploy` is active and asks for confirmation before switching live traffic.
 */
export default class SitesApp implements Application<typeof NEEDS, typeof CONSUMES, typeof SITES, typeof chromeApi> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = SITES;
    readonly api = chromeApi;

    readonly commands: readonly CommandDecl[] = [
        { id: 'sites.refresh', title: 'Sites: Refresh' },
        { id: 'sites.select', title: 'Sites: Select Site' },
        { id: 'sites.setField', title: 'Sites: Set Form Field' },
        { id: 'sites.save', title: 'Sites: Save Site' },
        { id: 'sites.reset', title: 'Sites: Reset Form' },
        { id: 'sites.setDeployReleaseInput', title: 'Sites: Set Deploy Release Input' },
        { id: 'sites.deploySelected', title: 'Sites: Deploy Release to Selected Site' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, SitesApi>[] = [
        {
            id: 'sites',
            title: 'Site Editor',
            instances: 'one',
            defaultSize: { width: 980, height: 640 },
            minSize: { width: 520, height: 380 },
            render: renderSitesView,
        },
    ];

    async start(cx: Context<typeof NEEDS, typeof CONSUMES, typeof chromeApi>): Promise<SitesApi> {
        const sites = cx.models('site');

        const selectedHost = cx.state.signal<string | null>(null);
        const formTitle = cx.state.signal<string>('');
        const formDescription = cx.state.signal<string>('');
        const formIndexable = cx.state.signal<boolean>(true);
        const formTheme = cx.state.signal<string>('{}');
        const formPolicy = cx.state.signal<string>('{}');
        const formMesh = cx.state.signal<string>('[]');
        const deployReleaseInput = cx.state.signal<string>('');

        const busy = cx.state.signal<boolean>(false);
        const lastAction = cx.state.signal<string | null>(null);
        const lastError = cx.state.signal<string | null>(null);

        /**
         * The writes exist now: `site.create` and `cdn.site_edit`.
         *
         * They arrived as a **separate contract** rather than an exposed `site.update`, because
         * `defineCrud` has no way to omit a field from a generated update and an exposed one would
         * carry `releaseHash` — a deploy with none of `cdn.deploy`'s checks, reachable by anybody
         * allowed to change a title. A contract that simply does not have the field cannot be
         * argued into writing it.
         *
         * So the separation this console was built around is now enforced by the server rather than
         * by this screen declining to offer a button.
         */
        const writeSupported = cx.state.signal<boolean>(true);

        const sitesError = cx.state.computed<string | null>(() => {
            const err = sites.error();
            if (err === null) return null;
            const detail = 'detail' in err && typeof err.detail === 'string' ? err.detail : err.kind;
            return `Could not read sites (${err.kind}): ${detail}`;
        });

        const selectedSite = (): SiteFindOutputItem | null => {
            const host = selectedHost();
            if (host === null) return null;
            return sites.rows().find((s) => s.host === host) ?? null;
        };

        const populateForm = (s: SiteFindOutputItem | null): void => {
            if (s === null) {
                formTitle.set('');
                formDescription.set('');
                formIndexable.set(true);
                formTheme.set('{}');
                formPolicy.set('{}');
                formMesh.set('[]');
            } else {
                formTitle.set(s.title ?? '');
                formDescription.set(s.description ?? '');
                formIndexable.set(s.indexable ?? true);
                formTheme.set(JSON.stringify(s.theme ?? {}, null, 2));
                formPolicy.set(JSON.stringify(s.policy ?? {}, null, 2));
                formMesh.set(JSON.stringify(s.mesh ?? [], null, 2));
            }
            deployReleaseInput.set('');
        };

        const isDirty = (): boolean => {
            const s = selectedSite();
            if (s === null) return false;
            const initialTitle = s.title ?? '';
            const initialDescription = s.description ?? '';
            const initialIndexable = s.indexable ?? true;
            const initialTheme = JSON.stringify(s.theme ?? {}, null, 2);
            const initialPolicy = JSON.stringify(s.policy ?? {}, null, 2);
            const initialMesh = JSON.stringify(s.mesh ?? [], null, 2);

            return formTitle() !== initialTitle
                || formDescription() !== initialDescription
                || formIndexable() !== initialIndexable
                || formTheme() !== initialTheme
                || formPolicy() !== initialPolicy
                || formMesh() !== initialMesh;
        };

        const select = async (host: string): Promise<void> => {
            if (selectedHost() === host) return;
            if (isDirty()) {
                const ok = await cx.confirmation.ask({
                    message: 'Discard unsaved changes to this site?',
                    confirmLabel: 'Discard',
                    destructive: true,
                });
                if (!ok) return;
            }
            selectedHost.set(host);
            populateForm(selectedSite());
            lastAction.set(null);
            lastError.set(null);
        };

        const refresh = async (): Promise<void> => {
            await sites.refetch();
            const current = selectedSite();
            if (current !== null && !isDirty()) {
                populateForm(current);
            }
        };

        const setField = (field: string, value?: Json): void => {
            let resolvedValue = value;
            if (resolvedValue === undefined && typeof document !== 'undefined') {
                const el = document.querySelector(`.input-${field}`);
                if (el instanceof HTMLInputElement) {
                    resolvedValue = el.type === 'checkbox' ? el.checked : el.value;
                } else if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
                    resolvedValue = el.value;
                }
            }

            if (field === 'title') {
                formTitle.set(typeof resolvedValue === 'string' ? resolvedValue : String(resolvedValue ?? ''));
            } else if (field === 'description') {
                formDescription.set(typeof resolvedValue === 'string' ? resolvedValue : String(resolvedValue ?? ''));
            } else if (field === 'indexable') {
                formIndexable.set(Boolean(resolvedValue));
            } else if (field === 'theme') {
                formTheme.set(typeof resolvedValue === 'string' ? resolvedValue : String(resolvedValue ?? ''));
            } else if (field === 'policy') {
                formPolicy.set(typeof resolvedValue === 'string' ? resolvedValue : String(resolvedValue ?? ''));
            } else if (field === 'mesh') {
                formMesh.set(typeof resolvedValue === 'string' ? resolvedValue : String(resolvedValue ?? ''));
            }
        };

        const reset = async (): Promise<void> => {
            if (isDirty()) {
                const ok = await cx.confirmation.ask({
                    message: 'Reset all fields to their saved values?',
                    confirmLabel: 'Reset',
                    destructive: true,
                });
                if (!ok) return;
            }
            populateForm(selectedSite());
            lastAction.set(null);
            lastError.set(null);
        };

        const save = async (): Promise<void> => {
            const site = selectedSite();
            if (site === null) return;

            if (!writeSupported()) {
                lastError.set('Saving site metadata is not available on this server.');
                return;
            }

            /**
             * The two JSON fields are parsed **before** anything is asked or sent.
             *
             * `theme` and `policy` are free-form records typed into a textarea, so they are the one
             * place a person can produce something the contract will reject. Failing here names the
             * field; failing after the confirmation would ask somebody to approve a save that was
             * never going to happen.
             */
            let theme: Record<string, string>;
            let policy: Record<string, string>;
            try {
                theme = JSON.parse(formTheme() || '{}') as Record<string, string>;
                policy = JSON.parse(formPolicy() || '{}') as Record<string, string>;
            } catch (error) {
                lastError.set(`Theme and policy must be JSON objects: ${
                    error instanceof Error ? error.message : String(error)}`);
                return;
            }

            const ok = await cx.confirmation.ask({
                message: `Apply changes to site "${site.host}"?`,
                confirmLabel: 'Save changes',
            });
            if (!ok) return;

            busy.set(true);
            lastError.set(null);
            try {
                /**
                 * `cdn.site_edit`, not `site.update`.
                 *
                 * The edit contract has no `releaseHash` field at all, so this screen cannot deploy
                 * by accident — which is why the server grew a second contract rather than exposing
                 * the generated update. Deploying is the separate action below.
                 */
                const result = await cx.mesh.call('cdn.site_edit', {
                    host: site.host,
                    title: formTitle(),
                    description: formDescription(),
                    indexable: formIndexable(),
                    theme,
                    policy,
                });

                if (result.ok) {
                    lastAction.set(`Saved changes to ${site.host}.`);
                } else {
                    const detail = 'detail' in result.error && typeof result.error.detail === 'string'
                        ? result.error.detail
                        : result.error.kind;
                    lastError.set(`Could not save ${site.host} (${result.error.kind}): ${detail}`);
                }
            } finally {
                busy.set(false);
                await sites.refetch();
            }
        };

        const deploy = async (host: string, releaseHash: string): Promise<void> => {
            if (!host || !releaseHash) {
                lastError.set('Both host and release hash are required for deployment.');
                return;
            }

            const ok = await cx.confirmation.ask({
                message: `Deploy release "${releaseHash}" to "${host}"? This will switch live traffic.`,
                confirmLabel: 'Deploy release',
                destructive: true,
            });
            if (!ok) return;

            busy.set(true);
            lastError.set(null);
            try {
                const result = await cx.mesh.call('cdn.deploy', { host, release: releaseHash });
                if (result.ok) {
                    lastAction.set(`Successfully deployed ${releaseHash} to ${host}.`);
                    deployReleaseInput.set('');
                    await sites.refetch();
                } else {
                    const detail = 'detail' in result.error && typeof result.error.detail === 'string'
                        ? result.error.detail
                        : result.error.kind;
                    lastError.set(`Deployment failed (${result.error.kind}): ${detail}`);
                }
            } finally {
                busy.set(false);
            }
        };

        cx.commands.implement('sites.refresh', refresh);
        cx.commands.implement('sites.select', async (hostVal?: Json) => {
            if (typeof hostVal === 'string') await select(hostVal);
        });
        cx.commands.implement('sites.setField', (fieldVal?: Json, val?: Json) => {
            if (typeof fieldVal === 'string') setField(fieldVal, val);
        });
        cx.commands.implement('sites.save', save);
        cx.commands.implement('sites.reset', reset);
        cx.commands.implement('sites.setDeployReleaseInput', (val?: Json) => {
            if (typeof val === 'string') {
                deployReleaseInput.set(val);
            } else if (typeof document !== 'undefined') {
                const el = document.querySelector('.input-deploy-release-hash');
                if (el instanceof HTMLInputElement) {
                    deployReleaseInput.set(el.value);
                }
            }
        });
        cx.commands.implement('sites.deploySelected', async () => {
            const host = selectedHost();
            const rel = deployReleaseInput();
            if (host !== null) {
                await deploy(host, rel);
            }
        });

        try {
            await sites.refetch();
        } catch {
            // Error captured in sites.error()
        }

        // Autostart window: An Application opens its own window
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'sites' });
            }
        });

        return {
            sites: sites.rows,
            sitesStatus: sites.status,
            sitesError,
            selectedHost,
            selectedSite,
            formTitle,
            formDescription,
            formIndexable,
            formTheme,
            formPolicy,
            formMesh,
            deployReleaseInput,
            isDirty,
            writeSupported,
            busy,
            lastAction,
            lastError,
            select,
            refresh,
            setField,
            save,
            reset,
            deploy,
        };
    }
}
