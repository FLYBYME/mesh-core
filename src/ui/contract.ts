import { consumes, needs, type Action, type Json, type Node as Described } from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- capabilities

export const NEEDS = needs();
export const CONSUMES = consumes();

// ---------------------------------------------------------------------------- component names

export const UI_ENTITY_LIST = 'ui.EntityList';
export const UI_ENTITY_ITEM = 'ui.EntityItem';
export const UI_DETAIL_SURFACE = 'ui.DetailSurface';
export const UI_PROPERTY_GRID = 'ui.PropertyGrid';
export const UI_TABLE = 'ui.Table';
export const UI_TABLE_ROW = 'ui.TableRow';
export const UI_FORM = 'ui.Form';
export const UI_FIELD = 'ui.Field';
export const UI_LABEL = 'ui.Label';
export const UI_SELECT = 'ui.Select';
export const UI_BUTTON_ROW = 'ui.ButtonRow';
export const UI_DIALOG = 'ui.Dialog';

// ---------------------------------------------------------------------------- prop types

export type EntityListStatus = 'idle' | 'loading' | 'error' | 'ready' | 'empty';

export interface EntityListProps {
    readonly status?: EntityListStatus | (() => EntityListStatus);
    readonly title?: string | (() => string);
    readonly count?: number | string | (() => number | string);
    readonly loadingMessage?: string | (() => string);
    readonly errorMessage?: string | null | (() => string | null);
    readonly emptyMessage?: string | (() => string);
    readonly idleMessage?: string | (() => string);
    readonly errorClass?: string | (() => string);
    readonly width?: string | (() => string);
    readonly empty?: boolean | (() => boolean);
    readonly class?: string | (() => string);
}

export interface DetailSurfaceProps {
    readonly selected?: boolean | (() => boolean);
    readonly placeholderTitle?: string | (() => string);
    readonly placeholderMessage?: string | (() => string);
    readonly title?: string | (() => string);
    readonly badge?: string | (() => string);
    readonly badgeVariant?: string | (() => string);
    readonly class?: string | (() => string);
}

export interface PropertyGridProps {
    readonly columns?: string | (() => string);
    readonly gap?: number | string | (() => number | string);
    readonly class?: string | (() => string);
}

export interface TableProps {
    readonly columns?: string | (() => string);
    readonly headers?: readonly string[] | (() => readonly string[]);
    readonly headerClass?: string | (() => string);
    readonly rowsClass?: string | (() => string);
    readonly status?: EntityListStatus | (() => EntityListStatus);
    readonly loadingMessage?: string | (() => string);
    readonly errorMessage?: string | null | (() => string | null);
    readonly emptyMessage?: string | (() => string);
    readonly idleMessage?: string | (() => string);
    readonly count?: number | (() => number);
    readonly empty?: boolean | (() => boolean);
    readonly class?: string | (() => string);
}

export interface FormProps {
    readonly id?: string | (() => string);
    readonly class?: string | (() => string);
}

export interface FieldProps {
    readonly label?: string | (() => string);
    readonly name?: string | (() => string);
    readonly error?: string | null | (() => string | null);
    readonly hint?: string | (() => string);
    readonly description?: string | (() => string);
    readonly required?: boolean | (() => boolean);
    readonly class?: string | (() => string);
}

export interface LabelProps {
    readonly for?: string | (() => string);
    readonly htmlFor?: string | (() => string);
    readonly required?: boolean | (() => boolean);
    readonly class?: string | (() => string);
}

export interface SelectOption {
    readonly value: string;
    readonly label: string;
    readonly [key: string]: Json;
}

export interface SelectProps {
    readonly value?: string | number | (() => string | number);
    readonly options?: readonly (string | SelectOption)[] | (() => readonly (string | SelectOption)[]);
    readonly disabled?: boolean | (() => boolean);
    readonly placeholder?: string | (() => string);
    readonly name?: string | (() => string);
    readonly class?: string | (() => string);
}

export interface ButtonRowProps {
    readonly align?: 'start' | 'center' | 'end' | 'between' | (() => 'start' | 'center' | 'end' | 'between');
    readonly gap?: number | string | (() => number | string);
    readonly class?: string | (() => string);
}

export interface DialogProps {
    readonly open?: boolean | (() => boolean);
    readonly title?: string | (() => string);
    readonly class?: string | (() => string);
}

// ---------------------------------------------------------------------------- schema & override seam

export interface JsonSchemaProperty {
    readonly type?: string;
    readonly title?: string;
    readonly description?: string;
    readonly enum?: readonly string[];
    readonly default?: unknown;
    readonly items?: JsonSchemaProperty;
    readonly properties?: Record<string, JsonSchemaProperty>;
    readonly required?: readonly string[];
    readonly [key: string]: unknown;
}

export interface JsonSchema {
    readonly type?: string;
    readonly properties?: Record<string, JsonSchemaProperty>;
    readonly required?: readonly string[];
    readonly [key: string]: unknown;
}

export interface FieldRenderContext<T = Json> {
    readonly name: string;
    readonly schema: JsonSchemaProperty;
    readonly required: boolean;
    readonly label: string;
    readonly hint?: string | undefined;
    readonly error?: string | undefined;
    readonly disabled: boolean;
    readonly value: () => T | undefined;
    readonly onChangeAction?: Action | undefined;
    defaultControl(): Described;
    defaultField(): Described;
}

export interface FieldOverride<T = Json> {
    readonly label?: string | (() => string);
    readonly hint?: string | (() => string);
    readonly order?: number;
    readonly group?: string;
    readonly hidden?: boolean | (() => boolean);
    readonly disabled?: boolean | (() => boolean);
    readonly placeholder?: string | (() => string);
    readonly widget?: 'input' | 'textarea' | 'select' | 'checkbox' | 'custom';
    readonly options?: readonly (string | SelectOption)[] | (() => readonly (string | SelectOption)[]);
    readonly renderControl?: (ctx: FieldRenderContext<T>) => Described;
    readonly renderField?: (ctx: FieldRenderContext<T>) => Described;
}

export type FormFieldOverrides = Record<string, FieldOverride<any>>;

export interface FormOverrides {
    readonly fields?: FormFieldOverrides;
    readonly fieldOrder?: readonly string[];
    readonly groups?: Record<string, { readonly title?: string; readonly description?: string; readonly order?: number }>;
    readonly frame?: (defaultForm: () => Described) => Described;
    readonly renderActions?: (defaultActions: () => Described) => Described;
}

export interface RenderFormOptions {
    readonly schema: JsonSchema;
    readonly values: () => Record<string, Json | undefined>;
    readonly errors?: () => Record<string, string | undefined>;
    readonly onFieldChange: string;
    readonly onSubmit?: string;
    readonly submitLabel?: string | (() => string);
    readonly onCancel?: string;
    readonly cancelLabel?: string | (() => string);
    readonly busy?: () => boolean;
    readonly disabled?: () => boolean;
    readonly overrides?: FormOverrides;
    readonly class?: string;
}

