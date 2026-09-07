import {
    element,
    text,
    when,
    type Node as Described,
} from "@flybyme/mesh-web";

import { renderForm } from "../../ui/views/schemaForm.js";
import { PROVISION_FORM_SCHEMA, type FleetApi } from "../contract.js";

export function renderProvisionCard(app: FleetApi): Described {
    return element("Card", {
        props: {
            class: "fleet-provision-card",
            style: {
                padding: "16px",
                background: "var(--chrome, #161b22)",
                border: "1px solid var(--edge, #30363d)",
                borderRadius: "6px",
            },
        },
        children: [
            element("Row", {
                props: {
                    style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
                },
                children: [
                    element("Heading", {
                        props: { level: 2, style: { margin: "0", fontSize: "15px" } },
                        children: [text("Provision Service (node.provision)")],
                    }),
                    element("Badge", {
                        props: {
                            style: {
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: "rgba(56, 139, 253, 0.15)",
                                color: "#58a6ff",
                                border: "1px solid rgba(56, 139, 253, 0.3)",
                            },
                        },
                        children: [text("Operator Only")],
                    }),
                ],
            }),
            element("Text", {
                props: {
                    style: {
                        fontSize: "12px",
                        color: "var(--ink-dim, #8b949e)",
                        display: "block",
                        marginBottom: "14px",
                        lineHeight: "1.4",
                    },
                },
                children: [
                    text(
                        "Acquires a service repository at a pinned ref and installs dependencies with npm. " +
                        "This makes the service switch exist on the machine so it becomes assignable. It does not start the service.",
                    ),
                ],
            }),
            renderForm({
                schema: PROVISION_FORM_SCHEMA,
                class: "fleet-provision-form",
                values: () => ({
                    hostname: app.provisionHostname(),
                    name: app.provisionName(),
                    repository: app.provisionRepository(),
                    ref: app.provisionRef(),
                    path: app.provisionPath(),
                    dependsOn: app.provisionDependsOn(),
                    mountKey: app.provisionMountKey(),
                }),
                onFieldChange: "fleet.setProvisionField",
                onSubmit: "fleet.provision",
                submitLabel: () => (app.provisionStatus() === "provisioning" ? "Provisioning..." : "✓ Provision Service"),
                disabled: () => app.busy() || app.provisionStatus() === "provisioning",
                errors: () => app.provisionFieldErrors(),
                overrides: {
                    fieldOrder: ["hostname", "name", "repository", "ref", "path", "dependsOn", "mountKey"],
                    fields: {
                        hostname: {
                            label: "Target Machine",
                            hint: "Hostname of the node to provision onto",
                            placeholder: "e.g. edge-1.example.com",
                        },
                        name: {
                            label: "Service Name",
                            hint: "Name of the service manifest entry in the Supervisor",
                            placeholder: "e.g. dns",
                        },
                        repository: {
                            label: "Repository URL",
                            hint: "Git repository URL to clone or pull (must be in allowlist)",
                            placeholder: "e.g. https://github.com/FLYBYME/surfdns.git",
                        },
                        ref: {
                            label: "Ref (Pinned SHA or Tag)",
                            hint: "A pinned commit SHA or tag is required. Branch names (main, master, refs/heads/…) are strictly refused.",
                            placeholder: "e.g. v0.2.0 or 40-character commit SHA",
                        },
                        path: {
                            label: "Entry Path (optional)",
                            hint: "Path to service entry module relative to repository root",
                            placeholder: "dist/index.js (default)",
                        },
                        dependsOn: {
                            label: "Dependencies (optional)",
                            hint: "Services that must be running before this service starts (comma-separated)",
                            placeholder: "e.g. redis, db",
                        },
                        mountKey: {
                            label: "Mount Key (optional)",
                            hint: "Mount key alias for running isolated instances",
                            placeholder: "e.g. edge-main",
                        },
                    },
                },
            }),
            when(
                () => app.provisionStatus() === "error" && app.provisionError() !== null,
                () => element("Card", {
                    props: {
                        class: "fleet-provision-error-card",
                        style: {
                            marginTop: "12px",
                            padding: "10px 12px",
                            background: "rgba(248, 81, 73, 0.1)",
                            border: "1px solid #f85149",
                            color: "#f85149",
                            borderRadius: "4px",
                            fontSize: "12px",
                        },
                    },
                    children: [text(() => app.provisionError() ?? "Provisioning error")],
                }),
            ),
            when(
                () => app.provisionStatus() === "success" && app.provisionResult() !== null,
                () => {
                    const res = app.provisionResult();
                    if (!res) return element("EmptyNode");
                    return element("Card", {
                        props: {
                            class: "fleet-provision-success-card",
                            style: {
                                marginTop: "12px",
                                padding: "10px 12px",
                                background: "rgba(63, 185, 80, 0.1)",
                                border: "1px solid #3fb950",
                                color: "#3fb950",
                                borderRadius: "4px",
                                fontSize: "12px",
                            },
                        },
                        children: [
                            element("Text", {
                                props: { style: { fontWeight: "600", marginBottom: "4px" } },
                                children: [text(() => `Successfully provisioned "${res.name}" at ref "${res.ref}" on ${res.hostname}`)],
                            }),
                            element("Text", {
                                props: { style: { fontSize: "11px", color: "var(--ink-dim, #8b949e)" } },
                                children: [text(() => (res.noop ? "Service was already provisioned at this ref (no-op)." : res.message))],
                            }),
                        ],
                    });
                },
            ),
        ],
    });
}
