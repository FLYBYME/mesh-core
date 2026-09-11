/**
 * The UI vocabulary contracts and types.
 *
 * spec/ui/vocabulary.md sorts all fifteen:
 *   - 11 components: EntityList, EntityItem, DetailSurface, PropertyGrid, Table,
 *     TableRow, Field, Label, Select, ButtonRow, Dialog.
 *   - 4 composites: Form, ActionButton, ActionCard, SignIn.
 *
 * A component has no logic. Props in, description out.
 * A composite has state. Created per use, renders itself.
 */

import type {
    AuthApi, BoundCommand, Confirmation, Intents, Json, Node, Reactive, ReadonlySignal, Registrar,
    Schema, Session, Signal,
} from '@flybyme/mesh-web';
import type { JsonSchema, JsonSchemaProperty } from './schema.js';

// ---------------------------------------------------------------------------- component identifiers

export const UI_ENTITY_LIST = 'ui.EntityList';
export const UI_ENTITY_ITEM = 'ui.EntityItem';
export const UI_DETAIL_SURFACE = 'ui.DetailSurface';
export const UI_PROPERTY_GRID = 'ui.PropertyGrid';
export const UI_TABLE = 'ui.Table';
export const UI_TABLE_ROW = 'ui.TableRow';
export const UI_FIELD = 'ui.Field';
export const UI_LABEL = 'ui.Label';
export const UI_SELECT = 'ui.Select';
export const UI_BUTTON_ROW = 'ui.ButtonRow';
export const UI_DIALOG = 'ui.Dialog';
export const UI_FORM = 'ui.Form';
export const UI_ACTION_BUTTON = 'ui.ActionButton';
export const UI_ACTION_CARD = 'ui.ActionCard';
export const UI_SIGN_IN = 'ui.SignIn';

// ---------------------------------------------------------------------------- states

/**
 * The four states a collection/list view answers (spec/ui/vocabulary.md §The old gap 1).
 *
 * `refused` and `unauthenticated` are not list states: they are answers to 'may I',
 * which is Availability. A list that cannot be read is a list whose read command
 * is unavailable. `idle` is removed.
 */
export type EntityListStatus = 'loading' | 'ready' | 'empty' | 'error';

// ---------------------------------------------------------------------------- the registrar

/**
 * **Anything with a control in it takes `on`, and it is not optional.**
 *
 * A composite is constructed by `create(props)`. It has no view, no window and no handler table, so
 * for as long as there was no way to hand it one, the three composites did the only thing available
 * and **made an id up**:
 *
 * ```ts
 * intents: { activate: { action: { kind: 'handler', id: `ui.ActionButton:${command.action}` } } }
 * ```
 *
 * Nothing registers that id. An unresolved handler is *a stale event, not a crash*, so `ActionButton`
 * rendered, enabled, correct in every detail, and did nothing at all when pressed — and every test
 * passed, because each one called `run()` rather than pressing the button. `ui.Select` was inert for
 * a second reason on top of that one: its `change` intent was on the wrapper `Row`, which is not a
 * control and never fires, while the option buttons that a person actually clicks carried no intents.
 *
 * `Registrar` is `vx.on` as a value (mesh-web `description/types.ts`). Passing it as a prop — rather
 * than reaching for a global table — keeps **who owns this handler** visible at the call site, and
 * keeps the handler dying with the view that registered it.
 *
 * **Required rather than optional**, because an optional registrar reintroduces the whole bug: the
 * caller who forgets it gets a control that looks finished and is inert, discovered by a person
 * clicking. Now it does not compile.
 */
export type { Registrar } from '@flybyme/mesh-web';

/**
 * **`Component`, `Composite`, `defineComponent`, `defineComposite` and `formatRefusal` moved to the
 * kernel, and are re-exported here.**
 *
 * They were declared in this file and they build `ComponentContract` and `CompositeContract` —
 * types the kernel declares — so the helper for constructing one of mesh-web's own shapes lived in
 * a package mesh-web does not depend on. Worse: in a package **no part can import**. The builder
 * marks exactly one specifier external (`@flybyme/mesh-web`) and bundles everything else from the
 * part's own tree.
 *
 * Publishing a component is one of the three slots every part has, so a part doing the ordinary
 * thing had to either import mesh-core, which does not resolve, or copy the `Object.assign` below.
 *
 * What stays here is the **vocabulary** — `ui.EntityList`, `ui.Table`, `ui.ActionButton` and the
 * rest, with their props. That is a design system: a real thing to adopt or not, used by *name*
 * through the component registry rather than by import.
 */
export {
    defineComponent, defineComposite, formatRefusal,
    type Component, type Composite,
} from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- props: EntityList & EntityItem

export interface EntityListProps {
    readonly status?: Reactive<EntityListStatus> | undefined;
    readonly title?: Reactive<string> | undefined;
    readonly count?: Reactive<number | string | undefined> | undefined;
    readonly loadingMessage?: Reactive<string> | undefined;
    readonly errorMessage?: Reactive<string | { refused: string } | null | undefined> | undefined;
    readonly emptyMessage?: Reactive<string> | undefined;
    readonly emptyAction?: Reactive<Node | undefined> | undefined;
    readonly width?: Reactive<string | number> | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly children?: readonly Node[] | undefined;
}

export interface EntityItemProps {
    readonly selected?: Reactive<boolean> | undefined;
    readonly title?: Reactive<string> | undefined;
    readonly description?: Reactive<string> | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly intents?: Intents | undefined;
    readonly key?: string | number | undefined;
    readonly children?: readonly Node[] | undefined;
}

// ---------------------------------------------------------------------------- props: DetailSurface

export interface DetailSurfaceProps {
    readonly selected?: Reactive<boolean> | undefined;
    readonly placeholderTitle?: Reactive<string> | undefined;
    readonly placeholderMessage?: Reactive<string> | undefined;
    readonly title?: Reactive<string> | undefined;
    readonly badge?: Reactive<string> | undefined;
    readonly badgeVariant?: Reactive<string> | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly children?: readonly Node[] | undefined;
}

// ---------------------------------------------------------------------------- props: PropertyGrid

export interface PropertyGridItem {
    readonly label: Reactive<string>;
    readonly value: Reactive<string | number | boolean | null | undefined | Node>;
}

export interface PropertyGridProps {
    readonly items?: readonly PropertyGridItem[] | undefined;
    readonly columns?: Reactive<string | number> | undefined;
    readonly gap?: Reactive<string | number> | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly children?: readonly Node[] | undefined;
}

// ---------------------------------------------------------------------------- props: Table & TableRow

export interface TableProps {
    readonly columns?: Reactive<string> | undefined;
    readonly headers?: Reactive<readonly string[]> | undefined;
    readonly headerClass?: Reactive<string> | undefined;
    readonly rowsClass?: Reactive<string> | undefined;
    readonly status?: Reactive<EntityListStatus> | undefined;
    readonly loadingMessage?: Reactive<string> | undefined;
    readonly errorMessage?: Reactive<string | { refused: string } | null | undefined> | undefined;
    readonly emptyMessage?: Reactive<string> | undefined;
    readonly count?: Reactive<number | undefined> | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly children?: readonly Node[] | undefined;
}

export interface TableRowProps {
    readonly selected?: Reactive<boolean> | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly intents?: Intents | undefined;
    readonly key?: string | number | undefined;
    readonly children?: readonly Node[] | undefined;
}

// ---------------------------------------------------------------------------- props: Field & Label

export interface LabelProps {
    readonly text?: Reactive<string> | undefined;
    readonly for?: Reactive<string> | undefined;
    readonly required?: Reactive<boolean> | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly children?: readonly Node[] | undefined;
}

export interface FieldProps {
    readonly label?: Reactive<string> | undefined;
    readonly name?: Reactive<string> | undefined;
    readonly error?: Reactive<string | null | undefined> | undefined;
    readonly hint?: Reactive<string | undefined> | undefined;
    readonly description?: Reactive<string | undefined> | undefined;
    readonly required?: Reactive<boolean> | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly children?: readonly Node[] | undefined;
}

// ---------------------------------------------------------------------------- props: Select

export interface SelectOption {
    readonly value: string;
    readonly label: string;
}

export interface SelectProps {
    /** See `Registrar`. Each option is a button, and a button needs somewhere to send its press. */
    readonly on: Registrar;
    readonly value?: Reactive<string | number | undefined> | undefined;
    readonly options: Reactive<readonly (string | SelectOption)[]>;
    readonly disabled?: Reactive<boolean> | undefined;
    readonly placeholder?: Reactive<string> | undefined;
    readonly name?: Reactive<string> | undefined;
    readonly class?: Reactive<string> | undefined;
    /**
     * What a press means. The only way in: an intent on the wrapper cannot express it, which is
     * what `intents` was doing here until it was removed.
     */
    readonly onSelect?: ((value: string) => void) | undefined;
}

// ---------------------------------------------------------------------------- props: ButtonRow

export interface ButtonRowProps {
    readonly align?: Reactive<'start' | 'center' | 'end' | 'between'> | undefined;
    readonly gap?: Reactive<number | string> | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly children?: readonly Node[] | undefined;
}

// ---------------------------------------------------------------------------- props: Dialog

export interface DialogProps {
    readonly open: Reactive<boolean>;
    readonly title?: Reactive<string> | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly intents?: Intents | undefined;
    readonly children?: readonly Node[] | undefined;
}

// ---------------------------------------------------------------------------- props: ActionButton

export interface ActionButtonProps<I = void, O = void> {
    /** See `Registrar`. Without it the button is a button that cannot be pressed. */
    readonly on: Registrar;
    readonly command: BoundCommand<I, O>;
    readonly input?: I | (() => I) | undefined;
    readonly label?: Reactive<string> | undefined;
    readonly runningLabel?: Reactive<string> | undefined;
    readonly confirmation?: Confirmation | undefined;
    readonly onResult?: ((result: O) => void) | undefined;
    readonly onError?: ((error: Error) => void) | undefined;
    readonly class?: Reactive<string> | undefined;
}

export interface ActionButtonState<O = unknown> {
    readonly running: Signal<boolean>;
    readonly error: Signal<string | null>;
    readonly result: Signal<O | undefined>;
    run(): Promise<O | undefined>;
    view(): Node;
}

// ---------------------------------------------------------------------------- props: Form

export interface FieldRenderContext<T = Json> {
    readonly name: string;
    readonly schema: JsonSchemaProperty;
    readonly required: boolean;
    readonly label: string;
    readonly hint?: string | undefined;
    readonly error?: string | undefined;
    readonly disabled: boolean;
    readonly value: () => T | undefined;
    readonly onChange: (val: T | undefined) => void;
    defaultControl(): Node;
    defaultField(): Node;
}

export interface FieldOverride<T = Json> {
    readonly label?: Reactive<string> | undefined;
    readonly hint?: Reactive<string> | undefined;
    readonly order?: number | undefined;
    readonly group?: string | undefined;
    readonly hidden?: Reactive<boolean> | undefined;
    readonly disabled?: Reactive<boolean> | undefined;
    readonly placeholder?: Reactive<string> | undefined;
    readonly widget?: 'input' | 'textarea' | 'select' | 'checkbox' | 'custom' | undefined;
    readonly options?: Reactive<readonly (string | SelectOption)[]> | undefined;
    readonly renderControl?: ((ctx: FieldRenderContext<T>) => Node) | undefined;
    readonly renderField?: ((ctx: FieldRenderContext<T>) => Node) | undefined;
}

export type FormFieldOverrides = Record<string, FieldOverride<unknown>>;

export interface FormOverrides {
    readonly fields?: FormFieldOverrides | undefined;
    readonly fieldOrder?: readonly string[] | undefined;
    readonly frame?: ((defaultForm: () => Node) => Node) | undefined;
    readonly renderActions?: ((defaultActions: () => Node) => Node) | undefined;
}

export interface FormProps<T = Record<string, Json | undefined>> {
    /** See `Registrar`. Every generated field binds a change handler, and so do Save and Cancel. */
    readonly on: Registrar;
    readonly schema?: JsonSchema | Schema<T> | undefined;
    readonly initialValues?: Partial<T> | undefined;
    readonly onSubmit?: ((values: T) => Promise<void> | void) | undefined;
    readonly onCancel?: (() => void) | undefined;
    readonly submitLabel?: Reactive<string> | undefined;
    readonly cancelLabel?: Reactive<string> | undefined;
    readonly overrides?: FormOverrides | undefined;
    readonly disabled?: Reactive<boolean> | undefined;
    readonly class?: Reactive<string> | undefined;
    readonly children?: readonly Node[] | undefined;
}

export interface FormState<T = Record<string, Json | undefined>> {
    readonly values: Signal<T>;
    readonly errors: Signal<Record<string, string | undefined>>;
    /**
     * Derived, therefore `ReadonlySignal`. Both are computed from `values` and `errors`, and a
     * setter on either would let a caller assert a form is valid without making it so — which is
     * the same shape of mistake as a writable signal on a published API.
     */
    readonly dirty: ReadonlySignal<boolean>;
    readonly valid: ReadonlySignal<boolean>;
    readonly busy: Signal<boolean>;
    setField(name: keyof T, value: Json | undefined): void;
    validate(): boolean;
    submit(): Promise<void>;
    reset(): void;
    view(): Node;
}

// ---------------------------------------------------------------------------- props: ActionCard

export interface ActionCardProps<I = Record<string, Json | undefined>, O = unknown> {
    /** See `Registrar`. Passed straight through to the form it owns, as well as its own control. */
    readonly on: Registrar;
    readonly command: BoundCommand<I, O>;
    readonly title?: Reactive<string> | undefined;
    readonly consequence?: Reactive<string> | undefined;
    readonly primaryLabel?: Reactive<string> | undefined;
    readonly secondaryLabel?: Reactive<string> | undefined;
    readonly onSecondary?: (() => void) | undefined;
    readonly overrides?: FormOverrides | undefined;
    readonly confirmation?: Confirmation | undefined;
    readonly initialValues?: Partial<I> | undefined;
    readonly onResult?: ((result: O) => void) | undefined;
    readonly onError?: ((error: Error) => void) | undefined;
    readonly class?: Reactive<string> | undefined;
}

export interface ActionCardState<I = Record<string, Json | undefined>, O = unknown> {
    readonly form: FormState<I>;
    readonly running: Signal<boolean>;
    readonly error: Signal<string | null>;
    readonly result: Signal<O | undefined>;
    submit(): Promise<O | undefined>;
    view(): Node;
}

// ---------------------------------------------------------------------------- props: SignIn

/** In place only; `signIn.ts` says why there is no modal variant yet. */
export interface SignInProps {
    /** See `Registrar`. Both fields bind a change handler, and the form binds its submit. */
    readonly on: Registrar;
    /**
     * Whatever fills `AUTH` — pass `cx.use(AUTH)`. A prop and not a method on `AuthApi`, because
     * that interface is mesh-web's and frozen. Only these two members are read.
     */
    readonly auth: Pick<AuthApi, 'session' | 'signIn'>;
    /** Defaults to "Sign in". */
    readonly title?: Reactive<string> | undefined;
    /** One sentence under the title: what signing in here gets you. */
    readonly note?: Reactive<string | undefined> | undefined;
    /** Defaults to "Sign in". */
    readonly submitLabel?: Reactive<string> | undefined;
    /** Defaults to "Signing in…". */
    readonly busyLabel?: Reactive<string> | undefined;
    readonly initialEmail?: string | undefined;
    readonly onSignedIn?: ((session: Session) => void) | undefined;
    readonly onError?: ((error: Error) => void) | undefined;
    readonly class?: Reactive<string> | undefined;
}

export interface SignInState {
    /** Readonly: whether a sign-in is in flight is the composite's to say, not a caller's to set. */
    readonly busy: ReadonlySignal<boolean>;
    readonly error: ReadonlySignal<string | null>;
    /** What pressing the control does. Resolves with the session, or `undefined` if it did not. */
    submit(): Promise<Session | undefined>;
    view(): Node;
}
