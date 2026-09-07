import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';
import {
    command,
    element,
    needs,
    signal,
    text,
    type Application,
    type Context,
    type Node as Described,
    type ViewDecl,
} from '@flybyme/mesh-web';
import UiExtension, {
    renderForm,
    UI_BUTTON_ROW,
    UI_DETAIL_SURFACE,
    UI_DIALOG,
    UI_ENTITY_ITEM,
    UI_ENTITY_LIST,
    UI_FIELD,
    UI_FORM,
    UI_LABEL,
    UI_PROPERTY_GRID,
    UI_SELECT,
    UI_TABLE,
    UI_TABLE_ROW,
} from '../src/ui/index.js';

let site: Awaited<ReturnType<typeof mountPart>> | null = null;

beforeEach(() => {
    document.body.innerHTML = '';
});

afterEach(() => {
    cleanup();
    if (site) {
        site.page.dispose();
        site = null;
    }
});

const APP_NEEDS = needs('state', 'log', 'commands');

describe('ui design system extension', () => {
    it('registers all contributed components in kernel component registry', async () => {
        const s = await mountPart({
            parts: [{ id: 'ui', contribution: UiExtension }],
        });
        site = s;

        expect(s.components.get(UI_ENTITY_LIST)).toBeDefined();
        expect(s.components.get(UI_ENTITY_ITEM)).toBeDefined();
        expect(s.components.get(UI_DETAIL_SURFACE)).toBeDefined();
        expect(s.components.get(UI_PROPERTY_GRID)).toBeDefined();
        expect(s.components.get(UI_TABLE)).toBeDefined();
        expect(s.components.get(UI_TABLE_ROW)).toBeDefined();
        expect(s.components.get(UI_FORM)).toBeDefined();
        expect(s.components.get(UI_FIELD)).toBeDefined();
        expect(s.components.get(UI_LABEL)).toBeDefined();
        expect(s.components.get(UI_SELECT)).toBeDefined();
        expect(s.components.get(UI_BUTTON_ROW)).toBeDefined();
        expect(s.components.get(UI_DIALOG)).toBeDefined();
    });

    it('ui.EntityList renders loading, error, ready and empty states reactively', async () => {
        const status = signal<'loading' | 'error' | 'ready' | 'empty'>('loading');
        const count = signal(0);
        const errorMsg = signal<string | null>(null);

        class TestApp implements Application<typeof APP_NEEDS, readonly []> {
            readonly needs = APP_NEEDS;
            readonly views: readonly ViewDecl[] = [
                {
                    id: 'main',
                    title: 'Main',
                    render: (): Described => element(UI_ENTITY_LIST, {
                        props: {
                            status: () => status(),
                            title: 'Entities',
                            count: () => count(),
                            loadingMessage: 'Fetching items...',
                            errorMessage: () => errorMsg(),
                            emptyMessage: 'No entities available.',
                            errorClass: 'custom-error-class',
                        },
                        children: [
                            element('Button', {
                                props: { class: 'item-btn' },
                                children: [text('Item 1')],
                            }),
                        ],
                    }),
                },
            ];

            async start(_cx: Context<typeof APP_NEEDS, readonly []>): Promise<void> {}
        }

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'test_app', contribution: TestApp },
            ],
            open: [{ application: 'test_app', views: ['main'] }],
        });
        site = s;

        const listEl = document.querySelector('.ui-entity-list');
        expect(listEl).not.toBeNull();
        expect(listEl?.getAttribute('data-status')).toBe('loading');

        // Loading state
        const loadingEl = document.querySelector('.ui-entity-list-loading');
        expect(loadingEl?.textContent).toBe('Fetching items...');

        // Transition to error state
        errorMsg.set('Network timeout occurred');
        status.set('error');
        await new Promise((r) => setTimeout(r, 20));

        expect(listEl?.getAttribute('data-status')).toBe('error');
        const errorEl = document.querySelector('.ui-entity-list-error');
        expect(errorEl?.textContent).toBe('Network timeout occurred');
        expect(errorEl?.classList.contains('custom-error-class')).toBe(true);

        // Transition to ready state with 1 item
        count.set(1);
        status.set('ready');
        await new Promise((r) => setTimeout(r, 20));

        expect(listEl?.getAttribute('data-status')).toBe('ready');
        const countEl = document.querySelector('.ui-entity-list-count');
        expect(countEl?.textContent).toBe('(1)');

        // Transition to empty state
        count.set(0);
        status.set('empty');
        await new Promise((r) => setTimeout(r, 20));

        expect(listEl?.getAttribute('data-status')).toBe('empty');
        const emptyEl = document.querySelector('.ui-entity-list-empty');
        expect(emptyEl?.textContent).toBe('No entities available.');
    });

    it('ui.EntityList and ui.EntityItem are keyboard reachable and operable', async () => {
        let activated = false;

        class TestApp implements Application<typeof APP_NEEDS, readonly []> {
            readonly needs = APP_NEEDS;
            readonly commands = [
                { id: 'test.activate', title: 'Activate Item' },
            ];

            readonly views: readonly ViewDecl[] = [
                {
                    id: 'main',
                    title: 'Main',
                    render: (): Described => element(UI_ENTITY_LIST, {
                        props: {
                            status: 'ready',
                            title: 'Items',
                            count: 2,
                        },
                        children: [
                            element(UI_ENTITY_ITEM, {
                                props: {
                                    class: 'entity-item-1',
                                    selected: true,
                                },
                                intents: { activate: { action: command('test.activate') } },
                                children: [text('First Item')],
                            }),
                            element(UI_ENTITY_ITEM, {
                                props: {
                                    class: 'entity-item-2',
                                    selected: false,
                                },
                                children: [text('Second Item')],
                            }),
                        ],
                    }),
                },
            ];

            async start(cx: Context<typeof APP_NEEDS, readonly []>): Promise<void> {
                cx.commands.implement('test.activate', () => {
                    activated = true;
                });
            }
        }

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'test_app', contribution: TestApp },
            ],
            open: [{ application: 'test_app', views: ['main'] }],
        });
        site = s;

        const item1 = document.querySelector<HTMLButtonElement>('.entity-item-1');
        const item2 = document.querySelector<HTMLButtonElement>('.entity-item-2');
        expect(item1).not.toBeNull();
        expect(item2).not.toBeNull();

        expect(item1?.getAttribute('data-selected')).toBe('true');
        expect(item1?.getAttribute('aria-selected')).toBe('true');
        expect(item1?.classList.contains('selected')).toBe(true);

        expect(item2?.getAttribute('data-selected')).toBeNull();

        // Keyboard reachability: native button can receive focus
        item1?.focus();
        expect(document.activeElement).toBe(item1);

        // Keyboard operability: Enter/Space triggers click/activation on button
        item1?.click();
        expect(activated).toBe(true);
    });

    it('ui.DetailSurface renders empty placeholder when unselected and detail card when selected', async () => {
        const isSelected = signal(false);

        class TestApp implements Application<typeof APP_NEEDS, readonly []> {
            readonly needs = APP_NEEDS;
            readonly views: readonly ViewDecl[] = [
                {
                    id: 'main',
                    title: 'Main',
                    render: (): Described => element(UI_DETAIL_SURFACE, {
                        props: {
                            selected: () => isSelected(),
                            placeholderTitle: 'Nothing Selected',
                            placeholderMessage: 'Pick an item from the left pane.',
                            title: 'Release Details',
                            badge: 'v1.0.0',
                        },
                        children: [
                            element('Stack', {
                                props: { class: 'detail-content-body' },
                                children: [text('Detailed specifications here')],
                            }),
                        ],
                    }),
                },
            ];

            async start(_cx: Context<typeof APP_NEEDS, readonly []>): Promise<void> {}
        }

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'test_app', contribution: TestApp },
            ],
            open: [{ application: 'test_app', views: ['main'] }],
        });
        site = s;

        const surface = document.querySelector('.ui-detail-surface');
        expect(surface).not.toBeNull();
        expect(surface?.getAttribute('data-selected')).toBe('false');

        const pTitle = document.querySelector('.ui-detail-surface-placeholder-title');
        expect(pTitle?.textContent).toBe('Nothing Selected');

        // Select an item
        isSelected.set(true);
        await new Promise((r) => setTimeout(r, 20));

        expect(surface?.getAttribute('data-selected')).toBe('true');
        const cardTitle = document.querySelector('.ui-detail-surface-title');
        expect(cardTitle?.textContent).toBe('Release Details');

        const badge = document.querySelector('.ui-detail-surface-badge');
        expect(badge?.textContent).toBe('v1.0.0');

        const content = document.querySelector('.detail-content-body');
        expect(content?.textContent).toBe('Detailed specifications here');
    });

    it('ui.PropertyGrid renders definition list with pairs', async () => {
        class TestApp implements Application<typeof APP_NEEDS, readonly []> {
            readonly needs = APP_NEEDS;
            readonly views: readonly ViewDecl[] = [
                {
                    id: 'main',
                    title: 'Main',
                    render: (): Described => element(UI_PROPERTY_GRID, {
                        props: {
                            columns: '160px 1fr',
                            gap: 10,
                        },
                        children: [
                            element('Span', { props: { bold: true }, children: [text('Commit:')] }),
                            element('Span', {
                                props: { class: 'code' },
                                children: [text('abc1234')],
                            }),
                            element('Span', { props: { bold: true }, children: [text('Repository:')] }),
                            element('Span', { children: [text('https://github.com/FLYBYME/mesh-core')] }),
                        ],
                    }),
                },
            ];

            async start(_cx: Context<typeof APP_NEEDS, readonly []>): Promise<void> {}
        }

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'test_app', contribution: TestApp },
            ],
            open: [{ application: 'test_app', views: ['main'] }],
        });
        site = s;

        const grid = document.querySelector('dl.ui-property-grid');
        expect(grid).not.toBeNull();
        expect(grid?.getAttribute('role')).toBe('list');

        const children = grid?.children ?? [];
        expect(children.length).toBe(4);
        expect(children[0]?.textContent).toBe('Commit:');
        expect(children[1]?.textContent).toBe('abc1234');
    });

    it('ui.Table renders headers, rows and handles keyboard activation', async () => {
        let activatedVersion = '';

        class TestApp implements Application<typeof APP_NEEDS, readonly []> {
            readonly needs = APP_NEEDS;
            readonly commands = [
                { id: 'test.selectVersion', title: 'Select Version' },
            ];

            readonly views: readonly ViewDecl[] = [
                {
                    id: 'main',
                    title: 'Main',
                    render: (): Described => element(UI_TABLE, {
                        props: {
                            columns: '120px 100px 1fr',
                            headers: ['Version', 'Status', 'Commit'],
                            headerClass: 'test-table-header',
                            rowsClass: 'test-table-rows',
                            status: 'ready',
                        },
                        children: [
                            element(UI_TABLE_ROW, {
                                props: {
                                    class: 'row-0-1-0',
                                    selected: true,
                                },
                                intents: { activate: { action: command('test.selectVersion', '0.1.0') } },
                                children: [
                                    element('Span', { children: [text('0.1.0')] }),
                                    element('Span', { children: [text('built')] }),
                                    element('Span', { children: [text('sha-111')] }),
                                ],
                            }),
                            element(UI_TABLE_ROW, {
                                props: {
                                    class: 'row-0-2-0',
                                    selected: false,
                                },
                                intents: { activate: { action: command('test.selectVersion', '0.2.0') } },
                                children: [
                                    element('Span', { children: [text('0.2.0')] }),
                                    element('Span', { children: [text('built')] }),
                                    element('Span', { children: [text('sha-222')] }),
                                ],
                            }),
                        ],
                    }),
                },
            ];

            async start(cx: Context<typeof APP_NEEDS, readonly []>): Promise<void> {
                cx.commands.implement('test.selectVersion', (ver: unknown) => {
                    activatedVersion = String(ver);
                });
            }
        }

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'test_app', contribution: TestApp },
            ],
            open: [{ application: 'test_app', views: ['main'] }],
        });
        site = s;

        const table = document.querySelector('.ui-table');
        expect(table).not.toBeNull();

        const header = document.querySelector('.test-table-header');
        expect(header).not.toBeNull();
        expect(header?.children.length).toBe(3);
        expect(header?.children[0]?.textContent).toBe('Version');
        expect(header?.children[1]?.textContent).toBe('Status');
        expect(header?.children[2]?.textContent).toBe('Commit');

        const rows = document.querySelectorAll('.ui-table-row');
        expect(rows.length).toBe(2);

        const row1 = document.querySelector<HTMLButtonElement>('.row-0-1-0');
        expect(row1?.classList.contains('selected')).toBe(true);

        // Keyboard interaction
        row1?.focus();
        expect(document.activeElement).toBe(row1);
        row1?.click();
        expect(activatedVersion).toBe('0.1.0');
    });

    it('picks up a changed theme token dynamically without touching the part', async () => {
        class TestApp implements Application<typeof APP_NEEDS, readonly []> {
            readonly needs = APP_NEEDS;
            readonly views: readonly ViewDecl[] = [
                {
                    id: 'main',
                    title: 'Main',
                    render: (): Described => element(UI_ENTITY_ITEM, {
                        props: { selected: true, class: 'themed-item' },
                        children: [text('Themed Item')],
                    }),
                },
            ];

            async start(_cx: Context<typeof APP_NEEDS, readonly []>): Promise<void> {}
        }

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'test_app', contribution: TestApp },
            ],
            open: [{ application: 'test_app', views: ['main'] }],
        });
        site = s;

        const item = document.querySelector<HTMLElement>('.themed-item');
        expect(item).not.toBeNull();

        // Dynamically change theme token --accent to custom color #ff00ff (rgb(255, 0, 255))
        document.documentElement.style.setProperty('--accent', '#ff00ff');

        const computed = window.getComputedStyle(item!);
        expect(computed.borderColor).toBe('rgb(255, 0, 255)');

        // Reset
        document.documentElement.style.removeProperty('--accent');
    });

    it('@layer makes stylesheet link order irrelevant: unlayered app CSS overrides ui layer', async () => {
        class TestApp implements Application<typeof APP_NEEDS, readonly []> {
            readonly needs = APP_NEEDS;
            readonly views: readonly ViewDecl[] = [
                {
                    id: 'main',
                    title: 'Main',
                    render: (): Described => element(UI_ENTITY_ITEM, {
                        props: { class: 'override-target' },
                        children: [text('Target')],
                    }),
                },
            ];

            async start(_cx: Context<typeof APP_NEEDS, readonly []>): Promise<void> {}
        }

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'test_app', contribution: TestApp },
            ],
            open: [{ application: 'test_app', views: ['main'] }],
        });
        site = s;

        // Inject unlayered app CSS BEFORE the ui stylesheet would normally win in source order
        const styleTag = document.createElement('style');
        styleTag.id = 'app-custom-style';
        styleTag.textContent = `
            .override-target {
                border-radius: 99px !important;
            }
        `;
        document.head.appendChild(styleTag);

        const item = document.querySelector<HTMLElement>('.override-target');
        expect(item).not.toBeNull();
        const computed = window.getComputedStyle(item!);
        expect(computed.borderRadius).toBe('99px');

        styleTag.remove();
    });

    it('ui.Field, ui.Label, ui.Select, ui.ButtonRow, ui.Dialog render correctly', async () => {
        const dialogOpen = signal(false);
        const selectValue = signal('opt1');

        class TestApp implements Application<typeof APP_NEEDS, readonly []> {
            readonly needs = APP_NEEDS;
            readonly views: readonly ViewDecl[] = [
                {
                    id: 'main',
                    title: 'Main',
                    render: (): Described => element(UI_FORM, {
                        props: { class: 'test-form' },
                        children: [
                            element(UI_FIELD, {
                                props: {
                                    label: 'Choose Option',
                                    name: 'choice',
                                    required: true,
                                    hint: 'Pick from list',
                                    error: 'Selection required',
                                },
                                children: [
                                    element(UI_SELECT, {
                                        props: {
                                            class: 'test-select',
                                            value: () => selectValue(),
                                            options: [
                                                { value: 'opt1', label: 'Option One' },
                                                { value: 'opt2', label: 'Option Two' },
                                            ],
                                        },
                                    }),
                                ],
                            }),
                            element(UI_BUTTON_ROW, {
                                props: { align: 'end', gap: 12 },
                                children: [
                                    element('Button', {
                                        props: { class: 'btn-open-dialog' },
                                        children: [text('Open Dialog')],
                                    }),
                                ],
                            }),
                            element(UI_DIALOG, {
                                props: {
                                    open: () => dialogOpen(),
                                    title: 'Test Dialog',
                                },
                                children: [
                                    element('Text', { children: [text('Dialog Body Content')] }),
                                ],
                            }),
                        ],
                    }),
                },
            ];

            async start(_cx: Context<typeof APP_NEEDS, readonly []>): Promise<void> {}
        }

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'test_app', contribution: TestApp },
            ],
            open: [{ application: 'test_app', views: ['main'] }],
        });
        site = s;

        const form = document.querySelector('form.ui-form');
        expect(form).not.toBeNull();

        const field = document.querySelector('.ui-field');
        expect(field).not.toBeNull();
        expect(field?.getAttribute('data-field-name')).toBe('choice');
        expect(field?.getAttribute('data-required')).toBe('true');
        expect(field?.getAttribute('data-invalid')).toBe('true');

        const labelText = document.querySelector('.ui-field-label-text');
        expect(labelText?.textContent).toBe('Choose Option');

        const hint = document.querySelector('.ui-field-hint');
        expect(hint?.textContent).toBe('Pick from list');

        const error = document.querySelector('.ui-field-error');
        expect(error?.textContent).toBe('Selection required');

        const select = document.querySelector<HTMLSelectElement>('.test-select');
        expect(select).not.toBeNull();
        expect(select?.value).toBe('opt1');
        expect(select?.options.length).toBe(2);
        expect(select?.options[0]?.textContent).toBe('Option One');

        const buttonRow = document.querySelector('.ui-button-row');
        expect(buttonRow?.getAttribute('data-align')).toBe('end');

        const dialog = document.querySelector<HTMLDialogElement>('.ui-dialog');
        expect(dialog).not.toBeNull();
        expect(dialog?.hasAttribute('open')).toBe(false);

        dialogOpen.set(true);
        await new Promise((r) => setTimeout(r, 20));
        expect(dialog?.hasAttribute('open')).toBe(true);
        const dialogTitle = document.querySelector('.ui-dialog-title');
        expect(dialogTitle?.textContent).toBe('Test Dialog');
    });

    it('renderForm generates schema-driven form listening for input and handles empty number as undefined', async () => {
        const formState = signal<Record<string, any>>({
            title: 'Initial Title',
            count: 5,
            active: true,
            role: 'editor',
        });
        let lastSubmitted: Record<string, any> | null = null;

        const schema = {
            type: 'object',
            properties: {
                title: { type: 'string', title: 'Site Title', description: 'Enter title' },
                count: { type: 'number', title: 'Item Count' },
                active: { type: 'boolean', title: 'Active Flag' },
                role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
            },
            required: ['title', 'role'],
        };

        class TestApp implements Application<typeof APP_NEEDS, readonly []> {
            readonly needs = APP_NEEDS;
            readonly commands = [
                { id: 'form.change', title: 'Change' },
                { id: 'form.submit', title: 'Submit' },
            ];

            readonly views: readonly ViewDecl[] = [
                {
                    id: 'main',
                    title: 'Main',
                    render: (): Described => renderForm({
                        schema,
                        values: () => formState(),
                        onFieldChange: 'form.change',
                        onSubmit: 'form.submit',
                        submitLabel: 'Save Record',
                    }),
                },
            ];

            async start(cx: Context<typeof APP_NEEDS, readonly []>): Promise<void> {
                cx.commands.implement('form.change', (field: unknown, val: unknown) => {
                    const curr = { ...formState() };
                    curr[String(field)] = val;
                    formState.set(curr);
                });
                cx.commands.implement('form.submit', () => {
                    lastSubmitted = { ...formState() };
                });
            }
        }

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'test_app', contribution: TestApp },
            ],
            open: [{ application: 'test_app', views: ['main'] }],
        });
        site = s;

        const form = document.querySelector('.ui-schema-form');
        expect(form).not.toBeNull();

        // Check rendered fields
        const titleInput = document.querySelector<HTMLInputElement>('.input-title');
        const countInput = document.querySelector<HTMLInputElement>('.input-count');
        const activeInput = document.querySelector<HTMLInputElement>('.input-active');
        const roleSelect = document.querySelector<HTMLSelectElement>('.input-role');

        expect(titleInput).not.toBeNull();
        expect(titleInput?.value).toBe('Initial Title');

        expect(countInput).not.toBeNull();
        expect(countInput?.value).toBe('5');

        expect(activeInput).not.toBeNull();
        expect(activeInput?.checked).toBe(true);

        expect(roleSelect).not.toBeNull();
        expect(roleSelect?.value).toBe('editor');
        expect(roleSelect?.options.length).toBe(3);

        // Required indicators
        const titleField = document.querySelector('.field-title');
        expect(titleField?.getAttribute('data-required')).toBe('true');

        // Test input event dispatch (typing directly fires change intent without blur)
        titleInput!.value = 'New Title';
        titleInput!.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 20));
        expect(formState().title).toBe('New Title');

        // Test empty number field is undefined, not 0
        countInput!.value = '';
        countInput!.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 20));
        expect(formState().count).toBeUndefined();

        // Submit form
        const submitBtn = document.querySelector<HTMLButtonElement>('.btn-submit');
        expect(submitBtn?.textContent).toBe('Save Record');
        submitBtn?.click();
        expect(lastSubmitted !== null).toBe(true);
        if (lastSubmitted !== null) {
            expect(lastSubmitted['title']).toBe('New Title');
            expect(lastSubmitted['count']).toBeUndefined();
        }
    });

    it('renderForm supports the override seam refining fields rather than replacing the form', async () => {
        const formState = signal<Record<string, any>>({
            hiddenField: 'secret',
            normalField: 'hello',
            customField: 'custom-val',
            wrappedField: 'wrap-me',
        });

        const schema = {
            type: 'object',
            properties: {
                hiddenField: { type: 'string' },
                normalField: { type: 'string' },
                customField: { type: 'string' },
                wrappedField: { type: 'string' },
            },
        };

        class TestApp implements Application<typeof APP_NEEDS, readonly []> {
            readonly needs = APP_NEEDS;
            readonly commands = [
                { id: 'form.change', title: 'Change' },
                { id: 'custom.pick', title: 'Pick Custom' },
            ];

            readonly views: readonly ViewDecl[] = [
                {
                    id: 'main',
                    title: 'Main',
                    render: (): Described => renderForm({
                        schema,
                        values: () => formState(),
                        onFieldChange: 'form.change',
                        overrides: {
                            // Custom ordering: customField first
                            fieldOrder: ['customField', 'normalField', 'wrappedField', 'hiddenField'],
                            fields: {
                                hiddenField: {
                                    hidden: true,
                                },
                                normalField: {
                                    label: 'Custom Normal Label',
                                    hint: 'A helpful hint',
                                },
                                customField: {
                                    renderControl: (ctx) => element('Button', {
                                        props: { class: 'btn-custom-picker' },
                                        intents: { activate: { action: command('custom.pick') } },
                                        children: [text(() => `Picked: ${String(ctx.value())}`)],
                                    }),
                                },
                                wrappedField: {
                                    renderField: (ctx) => element('Stack', {
                                        props: { class: 'wrapped-field-container' },
                                        children: [
                                            element('Span', { props: { class: 'badge-notice' }, children: [text('Important')] }),
                                            ctx.defaultField(),
                                        ],
                                    }),
                                },
                            },
                        },
                    }),
                },
            ];

            async start(cx: Context<typeof APP_NEEDS, readonly []>): Promise<void> {
                cx.commands.implement('form.change', (field: unknown, val: unknown) => {
                    const curr = { ...formState() };
                    curr[String(field)] = val;
                    formState.set(curr);
                });
                cx.commands.implement('custom.pick', () => {
                    formState.set({ ...formState(), customField: 'picked-special' });
                });
            }
        }

        const s = await mountPart({
            parts: [
                { id: 'ui', contribution: UiExtension },
                { id: 'test_app', contribution: TestApp },
            ],
            open: [{ application: 'test_app', views: ['main'] }],
        });
        site = s;

        // Hidden field must not be rendered
        expect(document.querySelector('.field-hiddenField')).toBeNull();

        // Normal field has overridden label & hint
        const normalLabel = document.querySelector('.field-normalField .ui-field-label-text');
        expect(normalLabel?.textContent).toBe('Custom Normal Label');
        const normalHint = document.querySelector('.field-normalField .ui-field-hint');
        expect(normalHint?.textContent).toBe('A helpful hint');

        // customField rendered using renderControl
        const customBtn = document.querySelector<HTMLButtonElement>('.btn-custom-picker');
        expect(customBtn).not.toBeNull();
        expect(customBtn?.textContent).toBe('Picked: custom-val');
        customBtn?.click();
        await new Promise((r) => setTimeout(r, 20));
        expect(customBtn?.textContent).toBe('Picked: picked-special');

        // wrappedField rendered using renderField wrapping defaultField()
        const wrappedContainer = document.querySelector('.wrapped-field-container');
        expect(wrappedContainer).not.toBeNull();
        expect(wrappedContainer?.querySelector('.badge-notice')?.textContent).toBe('Important');
        expect(wrappedContainer?.querySelector('.field-wrappedField')).not.toBeNull();

        // Verify order: customField precedes normalField
        const fields = document.querySelectorAll('.ui-field');
        expect(fields[0]?.getAttribute('data-field-name')).toBe('customField');
        expect(fields[1]?.getAttribute('data-field-name')).toBe('normalField');
    });
});

