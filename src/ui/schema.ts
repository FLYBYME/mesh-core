import type { Json } from '@flybyme/mesh-web';
import type { JsonSchema, JsonSchemaProperty } from './contract.js';

export function getProperties(schema: JsonSchema): Record<string, JsonSchemaProperty> {
    if (!schema || typeof schema !== 'object') {
        return {};
    }
    const props = (schema as { properties?: Record<string, JsonSchemaProperty> }).properties;
    return props && typeof props === 'object' ? props : {};
}

export function isPropertyRequired(schema: JsonSchema, propertyName: string): boolean {
    if (!schema || typeof schema !== 'object') {
        return false;
    }
    const req = (schema as { required?: readonly string[] }).required;
    return Array.isArray(req) && req.includes(propertyName);
}

export function humanizeLabel(name: string): string {
    if (!name) return '';
    // e.g. tenantId -> Tenant Id, releaseHash -> Release Hash, created_at -> Created At
    const spaced = name
        .replace(/_/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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
    if (property.type === 'number' || property.type === 'integer') {
        return undefined;
    }
    return undefined;
}
