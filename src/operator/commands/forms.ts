import type { Context } from '@flybyme/mesh-web';
import type { chromeApi } from '../../generated/api.js';
import type { CONSUMES, NEEDS } from '../contract.js';
import type { FleetFormSignals } from './fleet.js';
import type { CatalogFormSignals } from './parts.js';
import type { ReleasesFormSignals } from './releases.js';
import type { SitesFormSignals } from './sites.js';

export function createCatalogForms(
    cx: Context<typeof NEEDS, typeof CONSUMES, typeof chromeApi>,
): CatalogFormSignals {
    return {
        searchQuery: cx.state.signal(''),
        kindFilter: cx.state.signal('all'),
        resolveKernel: cx.state.signal(''),
        resolvePartName: cx.state.signal(''),
        resolvePartRange: cx.state.signal(''),
        resolveStatus: cx.state.signal('idle'),
        resolveResult: cx.state.signal(null),
        resolveError: cx.state.signal(null),
        importRepoUrl: cx.state.signal(''),
        importRepoRef: cx.state.signal(''),
        importRepoSubdirectory: cx.state.signal(''),
        importStatus: cx.state.signal('idle'),
        importResult: cx.state.signal(null),
        importError: cx.state.signal(null),
        declarationEntry: cx.state.signal(''),
        declarationBranch: cx.state.signal(''),
        declarationKernel: cx.state.signal(''),
        declarationRequires: cx.state.signal(''),
        declarationSubdirectory: cx.state.signal(''),
        declarationStatus: cx.state.signal('idle'),
        declarationResult: cx.state.signal(null),
        declarationError: cx.state.signal(null),
        partReleaseBump: cx.state.signal('patch'),
        partReleaseStatus: cx.state.signal('idle'),
        partReleaseResult: cx.state.signal(null),
        partReleaseError: cx.state.signal(null),
        repoReleaseBump: cx.state.signal('patch'),
        repoReleaseStatus: cx.state.signal('idle'),
        repoReleaseResult: cx.state.signal(null),
        repoReleaseError: cx.state.signal(null),
    };
}

export function createReleasesForms(
    cx: Context<typeof NEEDS, typeof CONSUMES, typeof chromeApi>,
): ReleasesFormSignals {
    return {
        composeName: cx.state.signal(''),
        composeKernel: cx.state.signal(''),
        composeParts: cx.state.signal([]),
        composePartsText: cx.state.signal(''),
        composeRolling: cx.state.signal(false),
        composeSeededFrom: cx.state.signal(null),
        composeStatus: cx.state.signal('idle'),
        composeResult: cx.state.signal(null),
        composeError: cx.state.signal(null),
        deployStatus: cx.state.signal('idle'),
        deployResult: cx.state.signal(null),
        deployError: cx.state.signal(null),
    };
}

export function createSitesForms(
    cx: Context<typeof NEEDS, typeof CONSUMES, typeof chromeApi>,
): SitesFormSignals {
    return {
        formTitle: cx.state.signal(''),
        formDescription: cx.state.signal(''),
        formIndexable: cx.state.signal(true),
        formTheme: cx.state.signal('{}'),
        formPolicy: cx.state.signal('{}'),
        formMesh: cx.state.signal('[]'),
        deployReleaseInput: cx.state.signal(''),
        meshFilter: cx.state.signal('all'),
        meshSearch: cx.state.signal(''),
        showRawMesh: cx.state.signal(false),
        busy: cx.state.signal(false),
        lastAction: cx.state.signal(null),
        lastError: cx.state.signal(null),
        newSiteHost: cx.state.signal(''),
        newSiteTitle: cx.state.signal(''),
        newSiteDescription: cx.state.signal(''),
    };
}

export function createFleetForms(
    cx: Context<typeof NEEDS, typeof CONSUMES, typeof chromeApi>,
): FleetFormSignals {
    return {
        busy: cx.state.signal(false),
        lastAction: cx.state.signal(null),
        provisionHostname: cx.state.signal(''),
        provisionName: cx.state.signal(''),
        provisionRepository: cx.state.signal(''),
        provisionRef: cx.state.signal(''),
        provisionPath: cx.state.signal(''),
        provisionDependsOn: cx.state.signal(''),
        provisionMountKey: cx.state.signal(''),
        provisionStatus: cx.state.signal('idle'),
        provisionResult: cx.state.signal(null),
        provisionError: cx.state.signal(null),
        provisionFieldErrors: cx.state.signal({}),
        newGroupName: cx.state.signal(''),
        newGroupDescription: cx.state.signal(''),
        newGroupServices: cx.state.signal(''),
        editGroupDescription: cx.state.signal(''),
        editGroupServices: cx.state.signal(''),
    };
}
