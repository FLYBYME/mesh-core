import type {
    Application,
    ApplicationStartResult,
    CommandDecl,
    Context,
    ViewDecl,
} from '@flybyme/mesh-web';

import { chromeApi } from '../generated/api.js';
import {
    CONSUMES,
    NEEDS,
    OPERATOR,
    type OperatorApi,
} from './contract.js';
import { createOperatorState, type OperatorStateBundle } from './state.js';
import {
    createCatalogForms,
    createFleetForms,
    createReleasesForms,
    createSitesForms,
} from './commands/forms.js';
import type { CatalogFormSignals } from './commands/parts.js';
import {
    runCatalogResolve,
    runImportRepository,
    runReleaseCatalogPart,
    runReleaseCatalogRepo,
    runSavePartDeclaration,
    selectCatalogPart,
    selectCatalogVersion,
} from './commands/parts.js';
import type { ReleasesFormSignals } from './commands/releases.js';
import {
    runCompose,
    runDeploy,
    selectRelease,
} from './commands/releases.js';
import type { SitesFormSignals } from './commands/sites.js';
import {
    createSite,
    populateSiteForm,
    saveSite,
    selectSite,
} from './commands/sites.js';
import type { FleetFormSignals } from './commands/fleet.js';
import {
    createFleetGroup,
    provisionNode,
    reconcileFleet,
    selectFleetGroup,
    selectFleetNode,
    toggleNodeGroup,
    toggleNodeService,
    updateFleetGroup,
} from './commands/fleet.js';
import { wireCommands } from './commands/wire.js';
import { renderPartsView } from './views/parts.js';
import { renderReleasesView } from './views/releases.js';
import { renderSitesView } from './views/sites.js';
import { renderFleetView } from './views/fleet.js';

export * from './contract.js';

export interface OperatorInternal {
    readonly state: OperatorStateBundle;
    readonly catalogForms: CatalogFormSignals;
    readonly releasesForms: ReleasesFormSignals;
    readonly sitesForms: SitesFormSignals;
    readonly fleetForms: FleetFormSignals;
}

export default class OperatorApp implements Application<typeof NEEDS, typeof CONSUMES, typeof OPERATOR, typeof chromeApi, OperatorInternal> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = OPERATOR;
    readonly api = chromeApi;

    readonly commands: readonly CommandDecl[] = [
        { id: 'operator.refresh', title: 'Operator: Refresh' },
        { id: 'operator.selectPart', title: 'Operator: Select Part' },
        { id: 'operator.selectRelease', title: 'Operator: Select Release' },
        { id: 'operator.selectSite', title: 'Operator: Select Site' },
        { id: 'operator.selectNode', title: 'Operator: Select Node' },
        { id: 'operator.selectGroup', title: 'Operator: Select Group' },
        { id: 'operator.runResolve', title: 'Operator: Resolve Version Range' },
        { id: 'operator.runImportRepo', title: 'Operator: Import Git Repository' },
        { id: 'operator.runSaveDeclaration', title: 'Operator: Declare Part' },
        { id: 'operator.runReleasePart', title: 'Operator: Release Part' },
        { id: 'operator.runReleaseRepo', title: 'Operator: Release Repository' },
        { id: 'operator.runDryRunCompose', title: 'Operator: Inspect Release Resolution' },
        { id: 'operator.runCommitCompose', title: 'Operator: Compose Release' },
        { id: 'operator.runDeploy', title: 'Operator: Deploy Release' },
        { id: 'operator.runCreateSite', title: 'Operator: Create Site' },
        { id: 'operator.runSaveSite', title: 'Operator: Save Site Metadata' },
        { id: 'operator.toggleSiteGrant', title: 'Operator: Toggle Site Exposure Grant' },
        { id: 'operator.toggleRawMesh', title: 'Operator: Toggle Raw Mesh JSON' },
        { id: 'operator.toggleNodeService', title: 'Operator: Toggle Node Service' },
        { id: 'operator.toggleNodeGroup', title: 'Operator: Toggle Node Group' },
        { id: 'operator.reconcileNode', title: 'Operator: Reconcile Fleet Node' },
        { id: 'operator.runProvisionNode', title: 'Operator: Provision Fleet Node' },
        { id: 'operator.runCreateGroup', title: 'Operator: Create Group' },
        { id: 'operator.runUpdateGroup', title: 'Operator: Update Group' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, OperatorInternal>[] = [
        { id: 'parts', title: 'Operator: Catalog Parts', render: (ctx) => renderPartsView(ctx.app.state, ctx.app.catalogForms) },
        { id: 'releases', title: 'Operator: Releases & Deployments', render: (ctx) => renderReleasesView(ctx.app.state, ctx.app.releasesForms) },
        { id: 'sites', title: 'Operator: Sites & Exposure', render: (ctx) => renderSitesView(ctx.app.state, ctx.app.sitesForms) },
        { id: 'fleet', title: 'Operator: Fleet & Nodes', render: (ctx) => renderFleetView(ctx.app.state, ctx.app.fleetForms) },
    ];

    async start(cx: Context<typeof NEEDS, typeof CONSUMES, typeof chromeApi>): Promise<ApplicationStartResult<OperatorApi, OperatorInternal>> {
        const state = createOperatorState(cx);
        const catalogForms = createCatalogForms(cx);
        const releasesForms = createReleasesForms(cx);
        const sitesForms = createSitesForms(cx);
        const fleetForms = createFleetForms(cx);

        wireCommands(state, catalogForms, releasesForms, sitesForms, fleetForms);

        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'parts' });
            }
        });

        const api: OperatorApi = {
            auth: state.auth,
            isSignedIn: state.isSignedIn,
            selectedPartName: state.selectedPartName,
            selectedPart: state.selectedPart,
            selectedVersionNumber: state.selectedVersionNumber,
            selectedVersion: state.selectedVersion,
            selectedReleaseHash: state.selectedReleaseHash,
            selectedRelease: state.selectedRelease,
            selectedHost: state.selectedHost,
            selectedSite: state.selectedSite,
            selectedHostname: state.selectedHostname,
            selectedNode: state.selectedNode,
            selectedGroupName: state.selectedGroupName,
            selectedGroup: state.selectedGroup,
            parts: state.parts,
            versions: state.versions,
            releases: state.releases,
            sites: state.sites,
            nodes: state.fleet,
            groups: state.groups,
            live: state.live,
            status: state.status,
            error: state.error,
            selectPart: async (name: string) => { await selectCatalogPart(state, name); },
            selectVersion: (v: string) => { selectCatalogVersion(state, v); },
            selectRelease: (h: string) => { selectRelease(state, h, releasesForms); },
            selectSite: async (host: string) => { await selectSite(state, sitesForms, host, state.selectedSite()); },
            selectNode: async (hostname: string) => { selectFleetNode(state, hostname); },
            selectGroup: (g: string) => { selectFleetGroup(state, g); },
            refresh: async () => { await state.refresh(); },
            runResolve: async () => { await runCatalogResolve(state, catalogForms); },
            runImportRepo: async () => { await runImportRepository(state, catalogForms); },
            runSaveDeclaration: async () => { await runSavePartDeclaration(state, catalogForms, state.selectedPart()); },
            runReleasePart: async () => { await runReleaseCatalogPart(state, catalogForms, state.selectedPart()); },
            runReleaseRepo: async () => { await runReleaseCatalogRepo(state, catalogForms, state.selectedPart()); },
            runCompose: async (dryRun: boolean) => { await runCompose(state, releasesForms, dryRun); },
            runDeploy: async () => {
                const host = state.selectedHost() ?? '';
                const rel = state.selectedReleaseHash() ?? '';
                await runDeploy(state, releasesForms, host, rel);
            },
            saveSite: async () => { await saveSite(state, sitesForms, state.selectedSite()); },
            resetSite: async () => { populateSiteForm(state.selectedSite(), sitesForms); },
            createSite: async (input) => { await createSite(state, sitesForms, input); },
            reconcile: async (hostname?: string) => { await reconcileFleet(state, fleetForms, hostname); },
            toggleService: async (svc: string) => { await toggleNodeService(state, fleetForms, svc); },
            toggleGroup: async (grp: string) => { await toggleNodeGroup(state, fleetForms, grp); },
            provision: async (input?: Record<string, unknown>) => { await provisionNode(state, fleetForms, input); },
            createGroup: async (name: string, desc?: string) => {
                await createFleetGroup(state, fleetForms, name, desc);
            },
            updateGroup: async (id: string, patch) => {
                await updateFleetGroup(state, fleetForms, id, patch);
            },
        };

        return { api, internal: { state, catalogForms, releasesForms, sitesForms, fleetForms } };
    }
}
