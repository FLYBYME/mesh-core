import { consumes, needs } from '@flybyme/mesh-web';

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

// ---------------------------------------------------------------------------- prop types

export type EntityListStatus = 'loading' | 'error' | 'ready' | 'empty';

export interface EntityListProps {
    readonly status?: EntityListStatus | (() => EntityListStatus);
    readonly title?: string | (() => string);
    readonly count?: number | string | (() => number | string);
    readonly loadingMessage?: string | (() => string);
    readonly errorMessage?: string | null | (() => string | null);
    readonly emptyMessage?: string | (() => string);
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
    readonly count?: number | (() => number);
    readonly empty?: boolean | (() => boolean);
    readonly class?: string | (() => string);
}
