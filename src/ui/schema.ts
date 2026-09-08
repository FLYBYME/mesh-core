/**
 * JSON Schema parsing and inspection utilities.
 *
 * Used by ui.Form and ui.ActionCard to generate form fields from
 * CommandContract.input schema per spec/ui/vocabulary.md and rules §6.
 */

import type { Json } from '@flybyme/mesh-web';

export interface JsonSchemaProperty {
    readonly type?: string | undefined;
    readonly title?: string | undefined;
    readonly description?: string | undefined;
    readonly enum?: readonly string[] | undefined;
    readonly default?: unknown;
    readonly items?: JsonSchemaProperty | undefined;
    readonly properties?: Record<string, JsonSchemaProperty> | undefined;
    readonly required?: readonly string[] | undefined;
    readonly format?: string | undefined;
    readonly minimum?: number | undefined;
    readonly maximum?: number | undefined;
}

export interface JsonSchema {
    readonly type?: string | undefined;
    readonly properties?: Record<string, JsonSchemaProperty> | undefined;
    readonly required?: readonly string[] | undefined;
    readonly title?: string | undefined;
    readonly description?: string | undefined;
}

/** Extract property definitions from a JSON Schema. */
export function getProperties(schema: JsonSchema | undefined): Record<string, JsonSchemaProperty> {
    if (!schema || typeof schema !== 'object') {
        return {};
    }
    const props = schema.properties;
    return props && typeof props === 'object' ? props : {};
}

/** Check if a named property is in the schema's required array. */
export function isPropertyRequired(schema: JsonSchema | undefined, propertyName: string): boolean {
    if (!schema || typeof schema !== 'object') {
        return false;
    }
    const req = schema.required;
    return Array.isArray(req) && req.includes(propertyName);
}

/**
 * Humanize a property or action name to sentence case.
 * e.g. "importRepo" -> "Import repo", "userId" -> "User id", "release_hash" -> "Release hash"
 */
export function humanizeLabel(name: string): string {
    if (!name) return '';
    const spaced = name
        .replace(/[._-]/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Determine default initial value for a schema property. */
export function parseDefaultValue(property: JsonSchemaProperty): Json | undefined {
    if (property.default !== undefined) {
        return property.default as Json;
    }
    if (property.type === 'boolean') {
        return false;
    }
    if (property.type === 'string') {
        return '';
    }
    if (property.type === 'array') {
        return [];
    }
    return undefined;
}
