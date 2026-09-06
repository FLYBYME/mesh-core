// GENERATED FILE — do not edit.
//
// Emitted from chrome's mesh.json by `mesh-serve client`.
// Exposure: sha256:5c9617cccad0f34fc0bcaebfeb2ba4eb
//
// Regenerate rather than editing. The exposure hash above is checked at run time against
// the one the API reports, so a hand-edited client is a client that lies about a surface
// nobody can verify.

import { call, defineApi } from '@flybyme/mesh-web';

export interface CatalogResolveInputPart {
    readonly name: string;
    /** A range, or * for any */
    readonly version: string;
}

export interface CatalogResolveInput {
    /** A range, e.g. ^0.2 */
    readonly kernel: string;
    readonly parts: readonly CatalogResolveInputPart[];
}

export interface CatalogResolveOutputKernel {
    readonly name: string;
    readonly version: string;
    readonly commit: string;
}

export interface CatalogResolveOutputPart {
    readonly name: string;
    readonly version: string;
    readonly commit: string;
}

export interface CatalogResolveOutputUnsatisfiedItem {
    readonly name: string;
    readonly wanted: string;
    readonly reason: string;
}

export interface CatalogResolveOutput {
    readonly kernel: CatalogResolveOutputKernel;
    readonly parts: readonly CatalogResolveOutputPart[];
    readonly unsatisfied: readonly CatalogResolveOutputUnsatisfiedItem[];
}

export interface CdnComposeInputPart {
    readonly kind: "application" | "extension";
    readonly id: string;
    readonly version: string;
}

export interface CdnComposeInput {
    /** A range, e.g. ^0.3 */
    readonly kernel: string;
    readonly parts: readonly CdnComposeInputPart[];
    readonly policy?: Readonly<Record<string, string>>;
    /** A label for people. Never an identity. */
    readonly name?: string;
    readonly dryRun?: boolean;
}

export interface CdnComposeOutputKernel {
    readonly version: string;
    readonly digest: string;
}

export interface CdnComposeOutputProblem {
    readonly kind: string;
    readonly message: string;
}

export interface CdnComposeOutput {
    readonly hash: string;
    readonly kernel: CdnComposeOutputKernel;
    readonly parts: Readonly<Record<string, {
    readonly version: string;
    readonly digest: string;
}>>;
    readonly existed: boolean;
    readonly problems: readonly CdnComposeOutputProblem[];
}

export interface CdnDeployInput {
    readonly host: string;
    /** → release.hash */
    readonly release: string;
}

export interface CdnDeployOutput {
    readonly host: string;
    readonly release: string;
    readonly changed: boolean;
    readonly unusedGrants: readonly string[];
}

export interface IdentityTicketIssueInput {
    readonly email: string;
    readonly password: string;
    readonly via?: string;
}

export interface IdentityTicketIssueOutput {
    readonly token: string;
    readonly userId: string;
    readonly expiresAt: number;
}

export interface IdentityWhoamiOutputOrganization {
    readonly organizationId: string;
    readonly name: string;
    readonly roleKey: string;
}

export interface IdentityWhoamiOutput {
    readonly userId: string;
    readonly email: string;
    readonly displayName: string;
    readonly roles: readonly string[];
    readonly organizations: readonly IdentityWhoamiOutputOrganization[];
}

export interface PartCountInput {
    /** Search text. */
    readonly search?: string;
    /** Fields for search. */
    readonly searchFields?: string | readonly string[];
    /** Query object. */
    readonly query?: Readonly<Record<string, unknown>>;
}

export interface PartFindInput {
    /** Max count of rows. */
    readonly limit?: number;
    /** Number of skipped rows. */
    readonly offset?: number;
    /** Fields to return. */
    readonly fields?: string | readonly string[];
    /** Sorted fields. Use '-' prefix for descending. */
    readonly sort?: string | readonly string[];
    /** Search text. */
    readonly search?: string;
    /** Fields for search. */
    readonly searchFields?: string | readonly string[];
    /** Query object. */
    readonly query?: Readonly<Record<string, unknown>>;
    /** Populated fields. */
    readonly populate?: string | readonly string[];
}

export interface PartFindOutputItem {
    readonly name: string;
    readonly kind: "kernel" | "application" | "extension";
    readonly repository: string;
    readonly publisher: string;
    readonly description?: string;
    readonly homepage?: string;
    readonly license?: string;
    readonly keywords?: readonly string[];
    readonly icon?: string;
    readonly id: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface PartGetInput {
    readonly id: string;
    /** Fields to return. */
    readonly fields?: string | readonly string[];
    /** Populated fields. */
    readonly populate?: string | readonly string[];
}

export interface PartGetOutput {
    readonly name: string;
    readonly kind: "kernel" | "application" | "extension";
    readonly repository: string;
    readonly publisher: string;
    readonly description?: string;
    readonly homepage?: string;
    readonly license?: string;
    readonly keywords?: readonly string[];
    readonly icon?: string;
    readonly id: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface PartVersionCountInput {
    /** Search text. */
    readonly search?: string;
    /** Fields for search. */
    readonly searchFields?: string | readonly string[];
    /** Query object. */
    readonly query?: Readonly<Record<string, unknown>>;
}

export interface PartVersionFindInput {
    /** Max count of rows. */
    readonly limit?: number;
    /** Number of skipped rows. */
    readonly offset?: number;
    /** Fields to return. */
    readonly fields?: string | readonly string[];
    /** Sorted fields. Use '-' prefix for descending. */
    readonly sort?: string | readonly string[];
    /** Search text. */
    readonly search?: string;
    /** Fields for search. */
    readonly searchFields?: string | readonly string[];
    /** Query object. */
    readonly query?: Readonly<Record<string, unknown>>;
    /** Populated fields. */
    readonly populate?: string | readonly string[];
}

export interface PartVersionFindOutputItemRequiredPart {
    readonly id: string;
    readonly version: string;
    readonly optional?: boolean;
}

export interface PartVersionFindOutputItemCapabilities {
    readonly needs?: readonly string[];
    readonly provides?: readonly string[];
}

export interface PartVersionFindOutputItem {
    readonly partName: string;
    readonly version: string;
    readonly commit: string;
    readonly repository?: string;
    readonly changelog?: string;
    readonly entry: string;
    readonly subdirectory?: string;
    readonly kernel?: string;
    readonly requires?: readonly string[];
    readonly requiredParts?: readonly PartVersionFindOutputItemRequiredPart[];
    readonly capabilities: PartVersionFindOutputItemCapabilities;
    readonly state: "declared" | "built" | "gone";
    readonly artifactDigest?: string;
    readonly publishedAt: string;
    readonly id: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface PartVersionGetInput {
    readonly id: string;
    /** Fields to return. */
    readonly fields?: string | readonly string[];
    /** Populated fields. */
    readonly populate?: string | readonly string[];
}

export interface PartVersionGetOutputRequiredPart {
    readonly id: string;
    readonly version: string;
    readonly optional?: boolean;
}

export interface PartVersionGetOutputCapabilities {
    readonly needs?: readonly string[];
    readonly provides?: readonly string[];
}

export interface PartVersionGetOutput {
    readonly partName: string;
    readonly version: string;
    readonly commit: string;
    readonly repository?: string;
    readonly changelog?: string;
    readonly entry: string;
    readonly subdirectory?: string;
    readonly kernel?: string;
    readonly requires?: readonly string[];
    readonly requiredParts?: readonly PartVersionGetOutputRequiredPart[];
    readonly capabilities: PartVersionGetOutputCapabilities;
    readonly state: "declared" | "built" | "gone";
    readonly artifactDigest?: string;
    readonly publishedAt: string;
    readonly id: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface ReleaseCountInput {
    /** Search text. */
    readonly search?: string;
    /** Fields for search. */
    readonly searchFields?: string | readonly string[];
    /** Query object. */
    readonly query?: Readonly<Record<string, unknown>>;
}

export interface ReleaseFindInput {
    /** Max count of rows. */
    readonly limit?: number;
    /** Number of skipped rows. */
    readonly offset?: number;
    /** Fields to return. */
    readonly fields?: string | readonly string[];
    /** Sorted fields. Use '-' prefix for descending. */
    readonly sort?: string | readonly string[];
    /** Search text. */
    readonly search?: string;
    /** Fields for search. */
    readonly searchFields?: string | readonly string[];
    /** Query object. */
    readonly query?: Readonly<Record<string, unknown>>;
    /** Populated fields. */
    readonly populate?: string | readonly string[];
}

export interface ReleaseFindOutputItemKernel {
    readonly version: string;
    readonly digest: string;
}

export interface ReleaseFindOutputItem {
    readonly hash: string;
    readonly name?: string;
    readonly tenantId: string;
    readonly kernel: ReleaseFindOutputItemKernel;
    readonly parts: Readonly<Record<string, {
    readonly version: string;
    readonly digest: string;
}>>;
    readonly requires?: readonly string[];
    readonly policy?: Readonly<Record<string, string>>;
    readonly exposure?: string;
    readonly composedAt: string;
    readonly id: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface ReleaseGetInput {
    readonly id: string;
    /** Fields to return. */
    readonly fields?: string | readonly string[];
    /** Populated fields. */
    readonly populate?: string | readonly string[];
}

export interface ReleaseGetOutputKernel {
    readonly version: string;
    readonly digest: string;
}

export interface ReleaseGetOutput {
    readonly hash: string;
    readonly name?: string;
    readonly tenantId: string;
    readonly kernel: ReleaseGetOutputKernel;
    readonly parts: Readonly<Record<string, {
    readonly version: string;
    readonly digest: string;
}>>;
    readonly requires?: readonly string[];
    readonly policy?: Readonly<Record<string, string>>;
    readonly exposure?: string;
    readonly composedAt: string;
    readonly id: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface SiteCountInput {
    /** Search text. */
    readonly search?: string;
    /** Fields for search. */
    readonly searchFields?: string | readonly string[];
    /** Query object. */
    readonly query?: Readonly<Record<string, unknown>>;
}

export interface SiteFindInput {
    /** Max count of rows. */
    readonly limit?: number;
    /** Number of skipped rows. */
    readonly offset?: number;
    /** Fields to return. */
    readonly fields?: string | readonly string[];
    /** Sorted fields. Use '-' prefix for descending. */
    readonly sort?: string | readonly string[];
    /** Search text. */
    readonly search?: string;
    /** Fields for search. */
    readonly searchFields?: string | readonly string[];
    /** Query object. */
    readonly query?: Readonly<Record<string, unknown>>;
    /** Populated fields. */
    readonly populate?: string | readonly string[];
}

export interface SiteFindOutputItemMeshItem {
    readonly package: string;
    readonly version: string;
    readonly contracts: readonly ({
    readonly key: string;
    readonly auth: "public" | "user" | "admin";
} | {
    readonly key: string;
    readonly permission: string;
})[];
    readonly events?: readonly ({
    readonly key: string;
    readonly auth: "public" | "user" | "admin";
} | {
    readonly key: string;
    readonly permission: string;
})[];
}

export interface SiteFindOutputItem {
    readonly host: string;
    readonly application: string;
    readonly tenantId: string;
    readonly api: string;
    readonly releaseHash?: string;
    readonly mesh: readonly SiteFindOutputItemMeshItem[];
    readonly theme: Readonly<Record<string, string>>;
    readonly policy: Readonly<Record<string, string>>;
    readonly title?: string;
    readonly description?: string;
    readonly canonical?: string;
    readonly image?: string;
    readonly indexable?: boolean;
    readonly id: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface SiteGetInput {
    readonly id: string;
    /** Fields to return. */
    readonly fields?: string | readonly string[];
    /** Populated fields. */
    readonly populate?: string | readonly string[];
}

export interface SiteGetOutputMeshItem {
    readonly package: string;
    readonly version: string;
    readonly contracts: readonly ({
    readonly key: string;
    readonly auth: "public" | "user" | "admin";
} | {
    readonly key: string;
    readonly permission: string;
})[];
    readonly events?: readonly ({
    readonly key: string;
    readonly auth: "public" | "user" | "admin";
} | {
    readonly key: string;
    readonly permission: string;
})[];
}

export interface SiteGetOutput {
    readonly host: string;
    readonly application: string;
    readonly tenantId: string;
    readonly api: string;
    readonly releaseHash?: string;
    readonly mesh: readonly SiteGetOutputMeshItem[];
    readonly theme: Readonly<Record<string, string>>;
    readonly policy: Readonly<Record<string, string>>;
    readonly title?: string;
    readonly description?: string;
    readonly canonical?: string;
    readonly image?: string;
    readonly indexable?: boolean;
    readonly id: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export const chromeApi = defineApi({
    id: "chrome",
    exposure: "sha256:5c9617cccad0f34fc0bcaebfeb2ba4eb",
    base: "/api",
    calls: {
        /**
         * Resolve version requirements against published versions.
         *
         * POST /catalog/resolve — auth: public
         */
        "catalog.resolve": call<CatalogResolveInput, CatalogResolveOutput, never>("POST", "/catalog/resolve"),
        /**
         * Resolve version requirements into a release, and record what holds together.
         *
         * POST /releases — auth: public, destructive
         */
        "cdn.compose": call<CdnComposeInput, CdnComposeOutput, never>("POST", "/releases"),
        /**
         * Point a hostname at a release.
         *
         * POST /sites/:host/deploy — auth: public, destructive
         */
        "cdn.deploy": call<CdnDeployInput, CdnDeployOutput, never>("POST", "/sites/:host/deploy"),
        /**
         * Exchange credentials for an opaque ticket.
         *
         * POST /identity/ticket — auth: public, destructive
         */
        "identity.ticket_issue": call<IdentityTicketIssueInput, IdentityTicketIssueOutput, never>("POST", "/identity/ticket"),
        /**
         * Who the caller is, and which organizations they belong to.
         *
         * GET /identity/whoami — auth: public
         */
        "identity.whoami": call<void, IdentityWhoamiOutput, never>("GET", "/identity/whoami"),
        /**
         * Get the number of parts by query.
         *
         * GET /parts/count — auth: public
         */
        "part.count": call<PartCountInput, number, never>("GET", "/parts/count"),
        /**
         * Find parts by query.
         *
         * GET /parts — auth: public
         */
        "part.find": call<PartFindInput, readonly PartFindOutputItem[], never>("GET", "/parts"),
        /**
         * Get a specific part by ID.
         *
         * GET /parts/:id — auth: public
         */
        "part.get": call<PartGetInput, PartGetOutput, never>("GET", "/parts/:id"),
        /**
         * Get the number of part-versions by query.
         *
         * GET /part-versions/count — auth: public
         */
        "partVersion.count": call<PartVersionCountInput, number, never>("GET", "/part-versions/count"),
        /**
         * Find part-versions by query.
         *
         * GET /part-versions — auth: public
         */
        "partVersion.find": call<PartVersionFindInput, readonly PartVersionFindOutputItem[], never>("GET", "/part-versions"),
        /**
         * Get a specific partVersion by ID.
         *
         * GET /part-versions/:id — auth: public
         */
        "partVersion.get": call<PartVersionGetInput, PartVersionGetOutput, never>("GET", "/part-versions/:id"),
        /**
         * Get the number of releases by query.
         *
         * GET /releases/count — auth: public
         */
        "release.count": call<ReleaseCountInput, number, never>("GET", "/releases/count"),
        /**
         * Find releases by query.
         *
         * GET /releases — auth: public
         */
        "release.find": call<ReleaseFindInput, readonly ReleaseFindOutputItem[], never>("GET", "/releases"),
        /**
         * Get a specific release by ID.
         *
         * GET /releases/:id — auth: public
         */
        "release.get": call<ReleaseGetInput, ReleaseGetOutput, never>("GET", "/releases/:id"),
        /**
         * Get the number of sites by query.
         *
         * GET /sites/count — auth: public
         */
        "site.count": call<SiteCountInput, number, never>("GET", "/sites/count"),
        /**
         * Find sites by query.
         *
         * GET /sites — auth: public
         */
        "site.find": call<SiteFindInput, readonly SiteFindOutputItem[], never>("GET", "/sites"),
        /**
         * Get a specific site by ID.
         *
         * GET /sites/:id — auth: public
         */
        "site.get": call<SiteGetInput, SiteGetOutput, never>("GET", "/sites/:id"),
    },
});
