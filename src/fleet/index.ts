import {
    computed,
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type ViewDecl,
} from "@flybyme/mesh-web";

import { chromeApi } from "../generated/api.js";
import type { NodeProvisionInput, NodeProvisionOutput, NodeStatusOutput } from "../generated/api.js";

import {
    CONSUMES,
    CORE_SERVICES,
    FLEET,
    NEEDS,
    isBranchRef,
    type FleetApi,
    type FleetNode,
} from "./contract.js";
import { renderFleetView } from "./views/fleet.js";

export * from "./contract.js";

function isAllowlistRefusal(err: object): boolean {
    if ("name" in err && err.name === "repository_not_allowed") return true;
    if ("detail" in err && typeof err.detail === "string") {
        const d = err.detail.toLowerCase();
        return d.includes("allowlist") || d.includes("repository_not_allowed");
    }
    return false;
}

/**
 * The fleet console.
 *
 * Seven machines, and until this existed the only way to know what any of them was doing was to ssh
 * in and look — which is the state `node.status` was written to end and then nothing drew it.
 *
 * **It joins two sources and keeps them apart on screen.** `node.find` gives desired state, which is
 * stored; `node.status` gives observed state, which is computed live from Registry presence and each
 * Supervisor. There is no `healthy` column anywhere in this system on purpose, and this screen is
 * why that works: health is the *difference* between the two, and showing them side by side says
 * more than any flag could.
 */
export default class FleetApp implements Application<typeof NEEDS, typeof CONSUMES, typeof FLEET, typeof chromeApi> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = FLEET;
    readonly api = chromeApi;

    readonly commands: readonly CommandDecl[] = [
        { id: "fleet.select", title: "Fleet: Select Machine" },
        { id: "fleet.toggleService", title: "Fleet: Toggle Service" },
        { id: "fleet.toggleGroup", title: "Fleet: Toggle Group" },
        { id: "fleet.reconcile", title: "Fleet: Reconcile" },
        { id: "fleet.reconcileAll", title: "Fleet: Reconcile Every Machine" },
        { id: "fleet.setProvisionField", title: "Fleet: Set Provision Field" },
        { id: "fleet.provision", title: "Fleet: Provision Service" },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, FleetApi>[] = [
        {
            id: "fleet",
            title: "Fleet",
            instances: "one",
            window: {
                defaultSize: { width: 980, height: 640 },
                minSize: { width: 520, height: 380 },
            },
            render: renderFleetView,
        },
    ];

    async start(cx: Context<typeof NEEDS, typeof CONSUMES, typeof chromeApi>): Promise<FleetApi> {
        const nodes = cx.models("node");
        const groups = cx.models("group");

        const selectedHostname = cx.state.signal<string | null>(null);
        const status = cx.state.signal<NodeStatusOutput | null>(null);
        const statusError = cx.state.signal<string | null>(null);
        const busy = cx.state.signal(false);
        const lastAction = cx.state.signal<string | null>(null);

        // Provisioning form signals
        const provisionHostname = cx.state.signal("");
        const provisionName = cx.state.signal("");
        const provisionRepository = cx.state.signal("");
        const provisionRef = cx.state.signal("");
        const provisionPath = cx.state.signal("");
        const provisionDependsOn = cx.state.signal("");
        const provisionMountKey = cx.state.signal("");
        const provisionStatus = cx.state.signal<"idle" | "provisioning" | "success" | "error">("idle");
        const provisionResult = cx.state.signal<NodeProvisionOutput | null>(null);
        const provisionError = cx.state.signal<string | null>(null);
        const provisionFieldErrors = cx.state.signal<Record<string, string>>({});

        const nodesError = cx.state.computed<string | null>(() => {
            const err = nodes.error();
            if (err === null) return null;
            const detail = "detail" in err && typeof err.detail === "string" ? err.detail : err.kind;
            return `Could not read the fleet (${err.kind}): ${detail}`;
        });

        /**
         * Desired joined to observed.
         *
         * `node.status` with no hostname returns a `nodes` summary for the whole fleet, so one call
         * covers every row — an observed lookup per machine would be seven round trips to draw one
         * table, and they would arrive at different times and make the screen flicker between
         * disagreeing states.
         */
        const fleet = (): readonly FleetNode[] => {
            const observed = new Map(
                (status()?.nodes ?? []).map((n) => [n.hostname, n]),
            );

            return nodes.rows().map((row) => {
                const seen = observed.get(row.hostname);
                const services = row.services ?? [];
                const running = seen?.runningServices ?? [];
                const provisioned = seen?.provisionedServices
                    ?? (status()?.hostname === row.hostname ? (status()?.provisionedServices ?? []) : []);

                return {
                    hostname: row.hostname,
                    services,
                    groups: row.groups ?? [],
                    connected: seen?.connected ?? false,
                    running,
                    provisioned,
                    missing: services.filter((s) => !running.includes(s)),
                    extra: running.filter((s) => !services.includes(s)),
                };
            });
        };

        const selected = (): FleetNode | null => {
            const host = selectedHostname();
            return host === null ? null : fleet().find((n) => n.hostname === host) ?? null;
        };

        /**
         * Everything anybody could be assigned.
         *
         * Gathered from what the fleet already mentions rather than from a hardcoded list, because a
         * hardcoded list goes stale the first time somebody provisions a service this console has
         * never heard of — which is exactly what `node.provision` is for.
         */
        const knownServices = (): readonly string[] => {
            const all = new Set<string>();
            for (const n of nodes.rows()) for (const s of n.services ?? []) all.add(s);
            for (const g of groups.rows()) for (const s of g.services ?? []) all.add(s);
            for (const n of status()?.nodes ?? []) {
                for (const s of n.runningServices ?? []) all.add(s);
                for (const s of n.provisionedServices ?? []) all.add(s);
            }
            const currentStatus = status();
            if (currentStatus?.provisionedServices) {
                for (const s of currentStatus.provisionedServices) all.add(s);
            }

            // Core services run because the node runs and no assignment can switch them, so
            // offering them as toggles is offering a button that cannot work. Assigning one used to
            // answer "Unknown service: api" — the Supervisor does not own them and never will.
            for (const core of CORE_SERVICES) all.delete(core);

            return [...all].sort();
        };

        const loadStatus = async (): Promise<void> => {
            const result = await cx.mesh.call("node.status", {});
            if (result.ok) {
                status.set(result.value);
                statusError.set(null);
            } else {
                const detail = "detail" in result.error && typeof result.error.detail === "string"
                    ? result.error.detail
                    : result.error.kind;
                statusError.set(`Could not read live status (${result.error.kind}): ${detail}`);
            }
        };

        const refresh = async (): Promise<void> => {
            const promises: Promise<unknown>[] = [];
            if (nodes.status() !== "idle") {
                promises.push(nodes.refetch());
            }
            if (groups.status() !== "idle") {
                promises.push(groups.refetch());
            }
            promises.push(loadStatus());
            try {
                await Promise.all(promises);
            } catch {}
        };

        const select = async (hostname: string): Promise<void> => {
            selectedHostname.set(hostname);
            provisionHostname.set(hostname);
            await loadStatus();
        };

        const setProvisionField = (field: string, value?: Json): void => {
            const val = value !== undefined && value !== null ? String(value) : "";
            switch (field) {
                case "hostname":
                    provisionHostname.set(val);
                    break;
                case "name":
                    provisionName.set(val);
                    break;
                case "repository":
                    provisionRepository.set(val);
                    break;
                case "ref":
                    provisionRef.set(val);
                    if (isBranchRef(val)) {
                        provisionFieldErrors.set({
                            ...provisionFieldErrors(),
                            ref: `node.provision requires a pinned commit SHA or tag, not a branch: "${val}". A node that follows a branch changes behaviour when somebody else pushes.`,
                        });
                    } else {
                        const next = { ...provisionFieldErrors() };
                        delete next.ref;
                        provisionFieldErrors.set(next);
                    }
                    break;
                case "path":
                    provisionPath.set(val);
                    break;
                case "dependsOn":
                    provisionDependsOn.set(val);
                    break;
                case "mountKey":
                    provisionMountKey.set(val);
                    break;
            }
        };

        const provision = async (override?: Partial<NodeProvisionInput>): Promise<void> => {
            const host = override?.hostname ?? provisionHostname().trim();
            const name = override?.name ?? provisionName().trim();
            const repository = override?.repository ?? provisionRepository().trim();
            const ref = override?.ref ?? provisionRef().trim();
            const path = override?.path ?? (provisionPath().trim() || undefined);
            const mountKey = override?.mountKey ?? (provisionMountKey().trim() || undefined);
            const rawDeps = override?.dependsOn
                ?? provisionDependsOn().split(",").map((s) => s.trim()).filter(Boolean);

            const errors: Record<string, string> = {};
            if (!host) errors.hostname = "Target machine is required.";
            if (!name) errors.name = "Service name is required.";
            if (!repository) errors.repository = "Repository URL is required.";
            if (!ref) {
                errors.ref = "Ref (commit SHA or tag) is required.";
            } else if (isBranchRef(ref)) {
                errors.ref = `node.provision requires a pinned commit SHA or tag, not a branch: "${ref}". A node that follows a branch changes behaviour when somebody else pushes.`;
            }

            if (Object.keys(errors).length > 0) {
                provisionFieldErrors.set(errors);
                provisionStatus.set("error");
                const first = errors.ref ?? errors.repository ?? errors.name ?? errors.hostname;
                provisionError.set(first ?? "Please complete all required fields.");
                return;
            }

            // Dangerous operation confirmation naming repository and machine
            const ok = await cx.confirmation.ask({
                message: `Provision repository "${repository}" onto machine "${host}"? This runs npm install on the machine.`,
                confirmLabel: "Provision",
                destructive: true,
            });
            if (!ok) return;

            busy.set(true);
            provisionStatus.set("provisioning");
            provisionError.set(null);
            provisionResult.set(null);
            provisionFieldErrors.set({});
            lastAction.set(`Provisioning "${name}" onto ${host}...`);

            try {
                const result = await cx.mesh.call("node.provision", {
                    hostname: host,
                    name,
                    repository,
                    ref,
                    ...(path ? { path } : {}),
                    ...(rawDeps.length > 0 ? { dependsOn: rawDeps } : {}),
                    ...(mountKey ? { mountKey } : {}),
                });

                if (result.ok) {
                    provisionStatus.set("success");
                    provisionResult.set(result.value);
                    lastAction.set(result.value.noop
                        ? `Service "${name}" was already provisioned at ref "${ref}" on ${host} (no-op).`
                        : `Provisioned "${name}" onto ${host} at ref "${ref}".`);
                } else {
                    provisionStatus.set("error");
                    const err = result.error;
                    const isAllowlist = isAllowlistRefusal(err);
                    const detail = "detail" in err && typeof err.detail === "string" ? err.detail : "";

                    if (isAllowlist) {
                        const msg = `This repository is not permitted: "${repository}" is not in the allowlist (MESH_PROVISION_ALLOWED_REPOSITORIES).`;
                        provisionError.set(msg);
                        lastAction.set(msg);
                        cx.notifications.error(msg);
                    } else {
                        const msg = `Provisioning failed (${err.kind}): ${detail || err.kind}`;
                        provisionError.set(msg);
                        lastAction.set(msg);
                        cx.notifications.error(msg);
                    }
                }
            } catch (e) {
                provisionStatus.set("error");
                const msg = `Provisioning error: ${e instanceof Error ? e.message : String(e)}`;
                provisionError.set(msg);
                lastAction.set(msg);
                cx.notifications.error(msg);
            } finally {
                busy.set(false);
                await refresh();
            }
        };

        /**
         * Send a desired set and apply it.
         *
         * `node.assign` reconciles as part of assigning, so there is no window in which the row says
         * one thing and the machine does another. Both fields are sent explicitly: on the server
         * absent means *unchanged*, which is right for an API and wrong for a screen where the person
         * just unticked something.
         */
        const assign = async (
            hostname: string,
            services: readonly string[],
            groupNames: readonly string[],
            what: string,
        ): Promise<void> => {
            busy.set(true);
            lastAction.set(null);
            try {
                const result = await cx.mesh.call("node.assign", {
                    hostname,
                    services: [...services],
                    groups: [...groupNames],
                });

                if (result.ok) {
                    const { started = [], stopped = [], applied } = result.value;
                    lastAction.set(applied
                        ? `${what}: started ${started.length}, stopped ${stopped.length}.`
                        : `${what}: saved. ${hostname} is not connected, so it will take effect when it returns.`);
                } else {
                    const msg = `${what} failed: ${result.error.kind}`;
                    lastAction.set(msg);
                    cx.notifications.error(msg);
                }
            } finally {
                busy.set(false);
                await refresh();
            }
        };

        const toggleService = async (service: string): Promise<void> => {
            const node = selected();
            if (node === null) return;

            const has = node.services.includes(service);
            // Removing a service stops a running process on a real machine. Ask first — this is the
            // consumer `destructive` was waiting for.
            if (has) {
                const ok = await cx.confirmation.ask({
                    message: `Stop "${service}" on ${node.hostname}?`,
                    confirmLabel: "Stop it",
                    destructive: true,
                });
                if (!ok) return;
            }

            const next = has
                ? node.services.filter((s) => s !== service)
                : [...node.services, service];

            await assign(node.hostname, next, node.groups, `${has ? "Stop" : "Start"} ${service}`);
        };

        const toggleGroup = async (group: string): Promise<void> => {
            const node = selected();
            if (node === null) return;

            const has = node.groups.includes(group);
            const next = has
                ? node.groups.filter((g) => g !== group)
                : [...node.groups, group];

            await assign(node.hostname, node.services, next, `${has ? "Leave" : "Join"} ${group}`);
        };

        /**
         * Make running match desired.
         *
         * With no hostname this touches every machine, which is why it asks first. It is also the
         * button somebody presses when something looks wrong, so it must be safe to press twice —
         * `node.reconcile` is idempotent and does not stop at the first failure.
         */
        const reconcile = async (hostname?: string): Promise<void> => {
            if (hostname === undefined) {
                const ok = await cx.confirmation.ask({
                    message: "Reconcile every machine in the fleet? Each one will start and stop "
                        + "services to match what it has been assigned.",
                    confirmLabel: "Reconcile all",
                });
                if (!ok) return;
            }

            busy.set(true);
            lastAction.set(null);
            try {
                const result = await cx.mesh.call("node.reconcile",
                    hostname === undefined ? {} : { hostname });

                if (result.ok) {
                    const rows = result.value.reconciled;
                    const failed = rows.filter((r) => r.error !== undefined);
                    const applied = rows.filter((r) => r.applied);
                    lastAction.set(failed.length === 0
                        ? `Reconciled ${String(applied.length)} of ${String(rows.length)} machine(s).`
                        : `Reconciled ${String(applied.length)}; ${String(failed.length)} failed: `
                          + failed.map((r) => `${r.hostname} (${r.error ?? "unknown"})`).join(", "));
                } else {
                    const msg = `Reconcile failed: ${result.error.kind}`;
                    lastAction.set(msg);
                    cx.notifications.error(msg);
                }
            } finally {
                busy.set(false);
                await refresh();
            }
        };

        cx.commands.implement("fleet.select", async (hostname) => { await select(String(hostname)); });
        cx.commands.implement("fleet.toggleService", async (s) => { await toggleService(String(s)); });
        cx.commands.implement("fleet.toggleGroup", async (g) => { await toggleGroup(String(g)); });
        cx.commands.implement("fleet.reconcile", async (h) => { await reconcile(String(h)); });
        cx.commands.implement("fleet.reconcileAll", async () => { await reconcile(); });
        cx.commands.implement("fleet.setProvisionField", async (f, v) => { setProvisionField(String(f), v); });
        cx.commands.implement("fleet.provision", async () => { await provision(); });

        // Observed state is not a collection, so nothing fetches it for us.
        void loadStatus();

        /**
         * **An Application opens its own window, and nothing else will.**
         */
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: "fleet" });
            }
        });

        return {
            nodes: nodes.rows,
            groups: groups.rows,
            nodesStatus: nodes.status,
            nodesError,
            live: computed(() => nodes.live() && groups.live()),
            fleet,
            selectedHostname,
            selected,
            status,
            statusError,
            knownServices,
            busy,
            lastAction,
            provisionHostname,
            provisionName,
            provisionRepository,
            provisionRef,
            provisionPath,
            provisionDependsOn,
            provisionMountKey,
            provisionStatus,
            provisionResult,
            provisionError,
            provisionFieldErrors,
            select,
            refresh,
            toggleService,
            toggleGroup,
            reconcile,
            setProvisionField,
            provision,
        };
    }
}
