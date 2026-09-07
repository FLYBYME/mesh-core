import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, mountPart } from "@flybyme/mesh-web/testing";
import FleetApp, { FLEET } from "../src/fleet/index.js";
import UiExtension from "../src/ui/index.js";
import type { NodeFindOutputItem, GroupFindOutputItem, NodeStatusOutput, NodeProvisionOutput } from "../src/generated/api.js";

const MOCK_NODES: NodeFindOutputItem[] = [
    {
        id: "node_1",
        hostname: "edge-1",
        services: ["dns"],
        groups: ["edge"],
        createdAt: "2026-09-06T00:00:00.000Z",
        updatedAt: "2026-09-06T00:00:00.000Z",
    },
    {
        id: "node_2",
        hostname: "core-1",
        services: ["builder"],
        groups: [],
        createdAt: "2026-09-06T00:00:00.000Z",
        updatedAt: "2026-09-06T00:00:00.000Z",
    },
];

const MOCK_GROUPS: GroupFindOutputItem[] = [
    {
        id: "group_1",
        name: "edge",
        services: ["dns"],
        createdAt: "2026-09-06T00:00:00.000Z",
        updatedAt: "2026-09-06T00:00:00.000Z",
    },
];

const MOCK_STATUS: NodeStatusOutput = {
    hostname: "edge-1",
    connected: true,
    peers: [],
    desiredServices: ["dns"],
    runningServices: ["api", "identity", "fleet", "supervisor"],
    provisionedServices: ["dns"],
    nodes: [
        {
            hostname: "edge-1",
            connected: true,
            desiredServices: ["dns"],
            runningServices: ["api", "identity", "fleet", "supervisor"],
            provisionedServices: ["dns"],
        },
        {
            hostname: "core-1",
            connected: true,
            desiredServices: ["builder"],
            runningServices: ["api", "identity", "fleet", "supervisor", "builder"],
            provisionedServices: ["builder"],
        },
    ],
};

describe("FleetApp", () => {
    let site: { dispose(): void; assertSingleFramework(): void } | undefined;
    let provisionCallCount = 0;
    let lastProvisionBody: Record<string, unknown> | null = null;
    let allowlistRefusal = false;

    beforeEach(() => {
        provisionCallCount = 0;
        lastProvisionBody = null;
        allowlistRefusal = false;

        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const url = String(input);
            const method = init?.method ?? "GET";

            if (url.includes("/api/nodes") && method === "GET") {
                return new Response(JSON.stringify(MOCK_NODES), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            }

            if (url.includes("/api/groups") && method === "GET") {
                return new Response(JSON.stringify(MOCK_GROUPS), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            }

            if (url.includes("/api/node/status") && method === "GET") {
                return new Response(JSON.stringify(MOCK_STATUS), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            }

            if (url.includes("/api/node/provision") && method === "POST") {
                provisionCallCount++;
                const bodyText = typeof init?.body === "string" ? init.body : "{}";
                const body = JSON.parse(bodyText);
                lastProvisionBody = body;

                if (allowlistRefusal) {
                    return new Response(
                        JSON.stringify({
                            error: "repository_not_allowed",
                            message: `Repository "${String(body.repository)}" is not in the allowlist (MESH_PROVISION_ALLOWED_REPOSITORIES).`,
                            declared: true,
                        }),
                        {
                            status: 403,
                            headers: { "content-type": "application/json" },
                        },
                    );
                }

                const output: NodeProvisionOutput = {
                    hostname: String(body.hostname),
                    name: String(body.name),
                    repository: String(body.repository),
                    ref: String(body.ref),
                    applied: true,
                    noop: false,
                    message: `Successfully provisioned "${String(body.name)}" at ref "${String(body.ref)}".`,
                };

                return new Response(JSON.stringify(output), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ error: "not_found" }), {
                status: 404,
                headers: { "content-type": "application/json" },
            });
        };
    });

    afterEach(() => {
        site?.dispose();
        cleanup();
    });

    it("boots FleetApp, lists machines, and distinguishes provisioned from running services", async () => {
        const s = await mountPart({
            parts: [
                { id: "ui", contribution: UiExtension },
                { id: "fleet", contribution: FleetApp },
            ],
        });
        site = s;

        const fleetApi = s.kernel.provided(FLEET);
        expect(fleetApi).toBeDefined();
        if (!fleetApi) throw new Error("FleetApi not provided");

        await fleetApi.refresh();
        await fleetApi.select("edge-1");

        // The list node item displays running, provisioned, and assigned numbers
        const edgeNode = fleetApi.fleet().find((n) => n.hostname === "edge-1");
        expect(edgeNode).toBeDefined();
        expect(edgeNode?.running).toEqual(["api", "identity", "fleet", "supervisor"]);
        expect(edgeNode?.provisioned).toEqual(["dns"]);
        expect(edgeNode?.services).toEqual(["dns"]);

        // DOM elements verify the distinction
        const observedProvisioned = document.querySelector(".fleet-observed-provisioned");
        const observedRunning = document.querySelector(".fleet-observed-running");

        expect(observedProvisioned?.textContent).toContain("Provisioned (can run): dns");
        expect(observedRunning?.textContent).toContain("Running (active): api, identity, fleet, supervisor");
    });

    it("renders the schema-driven provision form with fields", async () => {
        const s = await mountPart({
            parts: [
                { id: "ui", contribution: UiExtension },
                { id: "fleet", contribution: FleetApp },
            ],
        });
        site = s;

        const fleetApi = s.kernel.provided(FLEET);
        if (!fleetApi) throw new Error("FleetApi not provided");

        await fleetApi.select("edge-1");

        const form = document.querySelector(".fleet-provision-form");
        expect(form).not.toBeNull();

        // Fields from descriptor schema
        expect(document.querySelector(".input-hostname")).not.toBeNull();
        expect(document.querySelector(".input-name")).not.toBeNull();
        expect(document.querySelector(".input-repository")).not.toBeNull();
        expect(document.querySelector(".input-ref")).not.toBeNull();
        expect(document.querySelector(".input-path")).not.toBeNull();
        expect(document.querySelector(".input-dependsOn")).not.toBeNull();
        expect(document.querySelector(".input-mountKey")).not.toBeNull();

        // Pre-fills hostname from selected machine
        expect(fleetApi.provisionHostname()).toBe("edge-1");
    });

    it("strictly refuses branch names on client side before the network round trip", async () => {
        const s = await mountPart({
            parts: [
                { id: "ui", contribution: UiExtension },
                { id: "fleet", contribution: FleetApp },
            ],
        });
        site = s;

        const fleetApi = s.kernel.provided(FLEET);
        if (!fleetApi) throw new Error("FleetApi not provided");

        await fleetApi.select("edge-1");

        fleetApi.setProvisionField("name", "analytics");
        fleetApi.setProvisionField("repository", "https://github.com/FLYBYME/analytics.git");
        fleetApi.setProvisionField("ref", "main"); // Refuses main!

        expect(fleetApi.provisionFieldErrors().ref).toContain("requires a pinned commit SHA or tag, not a branch");

        // Attempt to provision
        await fleetApi.provision();

        // Must not have called the server
        expect(provisionCallCount).toBe(0);
        expect(fleetApi.provisionStatus()).toBe("error");
        expect(fleetApi.provisionError()).toContain("requires a pinned commit SHA or tag, not a branch");

        // Test other branches: master, refs/heads/...
        fleetApi.setProvisionField("ref", "refs/heads/feature-1");
        await fleetApi.provision();
        expect(provisionCallCount).toBe(0);
        expect(fleetApi.provisionStatus()).toBe("error");
    });

    it("requires confirmation naming the repository and machine before executing npm install", async () => {
        const s = await mountPart({
            parts: [
                { id: "ui", contribution: UiExtension },
                { id: "fleet", contribution: FleetApp },
            ],
        });
        site = s;

        const fleetApi = s.kernel.provided(FLEET);
        if (!fleetApi) throw new Error("FleetApi not provided");

        await fleetApi.select("edge-1");

        fleetApi.setProvisionField("name", "analytics");
        fleetApi.setProvisionField("repository", "https://github.com/FLYBYME/analytics.git");
        fleetApi.setProvisionField("ref", "v1.2.0");

        // Start provision (triggers confirmation dialog)
        const provPromise = fleetApi.provision();

        await new Promise((r) => setTimeout(r, 50));

        // Check confirmation dialog message
        const confirmMsg = document.querySelector(".mesh-confirm-message");
        expect(confirmMsg?.textContent).toContain("https://github.com/FLYBYME/analytics.git");
        expect(confirmMsg?.textContent).toContain("edge-1");

        // Click cancel button
        const cancelBtn = document.querySelector(".mesh-confirm-cancel");
        if (cancelBtn instanceof HTMLButtonElement) {
            cancelBtn.click();
        }

        await provPromise;

        // Provision was cancelled, no network call made
        expect(provisionCallCount).toBe(0);
        expect(fleetApi.provisionStatus()).toBe("idle");
    });

    it("displays clear allowlist refusal message when repository is not permitted", async () => {
        const s = await mountPart({
            parts: [
                { id: "ui", contribution: UiExtension },
                { id: "fleet", contribution: FleetApp },
            ],
        });
        site = s;

        const fleetApi = s.kernel.provided(FLEET);
        if (!fleetApi) throw new Error("FleetApi not provided");

        await fleetApi.select("edge-1");

        fleetApi.setProvisionField("name", "forbidden");
        fleetApi.setProvisionField("repository", "https://github.com/evil/untrusted.git");
        fleetApi.setProvisionField("ref", "v1.0.0");

        allowlistRefusal = true;

        const provPromise = fleetApi.provision();
        await new Promise((r) => setTimeout(r, 50));

        const confirmBtn = document.querySelector(".mesh-confirm-ok");
        if (confirmBtn instanceof HTMLButtonElement) {
            confirmBtn.click();
        }

        await provPromise;

        expect(provisionCallCount).toBe(1);
        expect(fleetApi.provisionStatus()).toBe("error");
        expect(fleetApi.provisionError()).toContain("This repository is not permitted");
        expect(fleetApi.provisionError()).toContain("MESH_PROVISION_ALLOWED_REPOSITORIES");

        const errorCard = document.querySelector(".fleet-provision-error-card");
        expect(errorCard?.textContent).toContain("This repository is not permitted");
    });

    it("successfully provisions service onto machine and updates status and result", async () => {
        const s = await mountPart({
            parts: [
                { id: "ui", contribution: UiExtension },
                { id: "fleet", contribution: FleetApp },
            ],
        });
        site = s;

        const fleetApi = s.kernel.provided(FLEET);
        if (!fleetApi) throw new Error("FleetApi not provided");

        await fleetApi.select("edge-1");

        fleetApi.setProvisionField("name", "analytics");
        fleetApi.setProvisionField("repository", "https://github.com/FLYBYME/analytics.git");
        fleetApi.setProvisionField("ref", "v1.2.0");
        fleetApi.setProvisionField("dependsOn", "dns");

        const provPromise = fleetApi.provision();
        await new Promise((r) => setTimeout(r, 50));

        const confirmBtn = document.querySelector(".mesh-confirm-ok");
        if (confirmBtn instanceof HTMLButtonElement) {
            confirmBtn.click();
        }

        await provPromise;

        expect(provisionCallCount).toBe(1);
        expect(lastProvisionBody).toEqual({
            hostname: "edge-1",
            name: "analytics",
            repository: "https://github.com/FLYBYME/analytics.git",
            ref: "v1.2.0",
            dependsOn: ["dns"],
        });

        expect(fleetApi.provisionStatus()).toBe("success");
        expect(fleetApi.provisionResult()?.applied).toBe(true);

        const successCard = document.querySelector(".fleet-provision-success-card");
        expect(successCard?.textContent).toContain("Successfully provisioned \"analytics\" at ref \"v1.2.0\" on edge-1");
    });
});
