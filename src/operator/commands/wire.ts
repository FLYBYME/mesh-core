import type { CatalogFormSignals } from './parts.js';
import {
    runCatalogResolve,
    runImportRepository,
    runReleaseCatalogPart,
    runReleaseCatalogRepo,
    runSavePartDeclaration,
    selectCatalogPart,
} from './parts.js';
import type { ReleasesFormSignals } from './releases.js';
import {
    addComposePart,
    removeComposePart,
    runCompose,
    runDeploy,
    selectRelease,
    updateComposePart,
} from './releases.js';
import type { SitesFormSignals } from './sites.js';
import {
    createSite,
    saveSite,
    selectSite,
    toggleContractGrant,
} from './sites.js';
import type { FleetFormSignals } from './fleet.js';
import {
    createFleetGroup,
    provisionNode,
    reconcileFleet,
    selectFleetGroup,
    selectFleetNode,
    toggleNodeGroup,
    toggleNodeService,
    updateFleetGroup,
} from './fleet.js';
import type { OperatorStateBundle } from '../state.js';

export function wireCommands(
    state: OperatorStateBundle,
    catalogForms: CatalogFormSignals,
    releasesForms: ReleasesFormSignals,
    sitesForms: SitesFormSignals,
    fleetForms: FleetFormSignals,
): void {
    const cx = state.cx;

    // Navigation & Common
    cx.commands.implement('operator.refresh', async () => { await state.refresh(); });

    // Parts & Builder
    cx.commands.implement('operator.selectPart', async (name) => { await selectCatalogPart(state, String(name)); });
    cx.commands.implement('operator.setSearch', async (val) => { catalogForms.searchQuery(String(val ?? '')); });
    cx.commands.implement('operator.setResolveKernel', async (val) => { catalogForms.resolveKernel(String(val ?? '')); });
    cx.commands.implement('operator.setResolvePartName', async (val) => { catalogForms.resolvePartName(String(val ?? '')); });
    cx.commands.implement('operator.setResolvePartRange', async (val) => { catalogForms.resolvePartRange(String(val ?? '')); });
    cx.commands.implement('operator.runResolve', async () => { await runCatalogResolve(state, catalogForms); });
    cx.commands.implement('operator.setImportRepoUrl', async (val) => { catalogForms.importRepoUrl(String(val ?? '')); });
    cx.commands.implement('operator.setImportRepoRef', async (val) => { catalogForms.importRepoRef(String(val ?? '')); });
    cx.commands.implement('operator.runImportRepo', async () => { await runImportRepository(state, catalogForms); });
    cx.commands.implement('operator.setDeclarationEntry', async (val) => { catalogForms.declarationEntry(String(val ?? '')); });
    cx.commands.implement('operator.setDeclarationBranch', async (val) => { catalogForms.declarationBranch(String(val ?? '')); });
    cx.commands.implement('operator.runSaveDeclaration', async () => {
        await runSavePartDeclaration(state, catalogForms, state.selectedPart());
    });
    cx.commands.implement('operator.runReleasePart', async () => {
        await runReleaseCatalogPart(state, catalogForms, state.selectedPart());
    });
    cx.commands.implement('operator.runReleaseRepo', async () => {
        await runReleaseCatalogRepo(state, catalogForms, state.selectedPart());
    });

    // Releases & CDN
    cx.commands.implement('operator.selectRelease', async (hash) => { selectRelease(state, String(hash), releasesForms); });
    cx.commands.implement('operator.setComposeName', async (val) => { releasesForms.composeName(String(val ?? '')); });
    cx.commands.implement('operator.setComposeKernel', async (val) => { releasesForms.composeKernel(String(val ?? '')); });
    cx.commands.implement('operator.setComposeRolling', async (val) => { releasesForms.composeRolling(Boolean(val)); });
    cx.commands.implement('operator.addComposePart', async () => { addComposePart(releasesForms); });
    cx.commands.implement('operator.removeComposePart', async (idx) => { removeComposePart(releasesForms, Number(idx)); });
    cx.commands.implement('operator.updateComposePartId', async (idx, val) => {
        updateComposePart(releasesForms, Number(idx), { id: String(val ?? '') });
    });
    cx.commands.implement('operator.updateComposePartVersion', async (idx, val) => {
        updateComposePart(releasesForms, Number(idx), { version: String(val ?? '') });
    });
    cx.commands.implement('operator.updateComposePartKind', async (idx, val) => {
        updateComposePart(releasesForms, Number(idx), { kind: val === 'extension' ? 'extension' : 'application' });
    });
    cx.commands.implement('operator.runDryRunCompose', async () => { await runCompose(state, releasesForms, true); });
    cx.commands.implement('operator.runCommitCompose', async () => { await runCompose(state, releasesForms, false); });
    cx.commands.implement('operator.runDeploy', async (host, hash) => {
        const h = typeof host === 'string' && host ? host : (state.selectedHost() ?? '');
        const rel = typeof hash === 'string' && hash ? hash : (state.selectedReleaseHash() ?? '');
        await runDeploy(state, releasesForms, h, rel);
    });

    // Sites
    cx.commands.implement('operator.selectSite', async (host) => {
        await selectSite(state, sitesForms, String(host), state.selectedSite());
    });
    cx.commands.implement('operator.setSiteTitle', async (val) => { sitesForms.formTitle(String(val ?? '')); });
    cx.commands.implement('operator.setSiteDescription', async (val) => { sitesForms.formDescription(String(val ?? '')); });
    cx.commands.implement('operator.setSiteIndexable', async (val) => { sitesForms.formIndexable(Boolean(val)); });
    cx.commands.implement('operator.setNewSiteHost', async (val) => { sitesForms.newSiteHost(String(val ?? '')); });
    cx.commands.implement('operator.setNewSiteTitle', async (val) => { sitesForms.newSiteTitle(String(val ?? '')); });
    cx.commands.implement('operator.setNewSiteDescription', async (val) => { sitesForms.newSiteDescription(String(val ?? '')); });
    cx.commands.implement('operator.runCreateSite', async () => {
        await createSite(state, sitesForms, {
            host: sitesForms.newSiteHost(),
            title: sitesForms.newSiteTitle(),
            description: sitesForms.newSiteDescription(),
        });
    });
    cx.commands.implement('operator.runSaveSite', async () => { await saveSite(state, sitesForms, state.selectedSite()); });
    cx.commands.implement('operator.toggleSiteGrant', async (key) => { toggleContractGrant(sitesForms, String(key)); });
    cx.commands.implement('operator.toggleRawMesh', async () => { sitesForms.showRawMesh(!sitesForms.showRawMesh()); });
    cx.commands.implement('operator.setFormMesh', async (val) => { sitesForms.formMesh(String(val ?? '')); });
    cx.commands.implement('operator.setMeshSearch', async (val) => { sitesForms.meshSearch(String(val ?? '')); });

    // Fleet
    cx.commands.implement('operator.selectNode', async (hostname) => { selectFleetNode(state, String(hostname)); });
    cx.commands.implement('operator.selectGroup', async (name) => { selectFleetGroup(state, String(name)); });
    cx.commands.implement('operator.toggleNodeService', async (svc) => { await toggleNodeService(state, fleetForms, String(svc)); });
    cx.commands.implement('operator.toggleNodeGroup', async (grp) => { await toggleNodeGroup(state, fleetForms, String(grp)); });
    cx.commands.implement('operator.reconcileNode', async (host) => {
        await reconcileFleet(state, fleetForms, typeof host === 'string' ? host : undefined);
    });
    cx.commands.implement('operator.setProvisionHostname', async (val) => { fleetForms.provisionHostname(String(val ?? '')); });
    cx.commands.implement('operator.setProvisionName', async (val) => { fleetForms.provisionName(String(val ?? '')); });
    cx.commands.implement('operator.setProvisionRepository', async (val) => { fleetForms.provisionRepository(String(val ?? '')); });
    cx.commands.implement('operator.setProvisionRef', async (val) => { fleetForms.provisionRef(String(val ?? '')); });
    cx.commands.implement('operator.setProvisionPath', async (val) => { fleetForms.provisionPath(String(val ?? '')); });
    cx.commands.implement('operator.setProvisionDependsOn', async (val) => { fleetForms.provisionDependsOn(String(val ?? '')); });
    cx.commands.implement('operator.setProvisionMountKey', async (val) => { fleetForms.provisionMountKey(String(val ?? '')); });
    cx.commands.implement('operator.runProvisionNode', async () => { await provisionNode(state, fleetForms); });
    cx.commands.implement('operator.setNewGroupName', async (val) => { fleetForms.newGroupName(String(val ?? '')); });
    cx.commands.implement('operator.setNewGroupDescription', async (val) => { fleetForms.newGroupDescription(String(val ?? '')); });
    cx.commands.implement('operator.runCreateGroup', async () => { await createFleetGroup(state, fleetForms); });
    cx.commands.implement('operator.runUpdateGroup', async (id) => { await updateFleetGroup(state, fleetForms, String(id)); });
}
