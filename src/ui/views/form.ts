import type { ComponentDefinition, Json } from '@flybyme/mesh-web';

function isHTMLElement(el: unknown): el is HTMLElement {
    return typeof HTMLElement !== 'undefined' && el instanceof HTMLElement;
}

export const formComponent: ComponentDefinition = {
    name: 'ui.Form',
    create(): Element {
        const el = document.createElement('form');
        el.className = 'ui-form';
        el.setAttribute('novalidate', '');
        return el;
    },
    apply(el: Element, name: string, value: Json): boolean | void {
        if (name === 'class') {
            const extra = typeof value === 'string' ? value : '';
            el.className = `ui-form ${extra}`.trim();
            return true;
        }
        if (name === 'id') {
            el.id = String(value);
            return true;
        }
        return false;
    },
};

export const fieldComponent: ComponentDefinition = {
    name: 'ui.Field',
    create(): Element {
        const el = document.createElement('div');
        el.className = 'ui-field';

        const header = document.createElement('div');
        header.className = 'ui-field-header';
        header.style.display = 'none';

        const label = document.createElement('label');
        label.className = 'ui-field-label';

        const labelText = document.createElement('span');
        labelText.className = 'ui-field-label-text';

        const req = document.createElement('span');
        req.className = 'ui-field-required';
        req.textContent = ' *';
        req.style.display = 'none';

        label.appendChild(labelText);
        label.appendChild(req);
        header.appendChild(label);

        const control = document.createElement('div');
        control.className = 'ui-field-control';

        const hint = document.createElement('div');
        hint.className = 'ui-field-hint';
        hint.style.display = 'none';

        const error = document.createElement('div');
        error.className = 'ui-field-error';
        error.setAttribute('role', 'alert');
        error.style.display = 'none';

        el.appendChild(header);
        el.appendChild(control);
        el.appendChild(hint);
        el.appendChild(error);

        return el;
    },

    slot(el: Element): Element {
        const control = el.querySelector('.ui-field-control');
        return control ?? el;
    },

    apply(el: Element, name: string, value: Json): boolean | void {
        if (name === 'label') {
            const header = el.querySelector('.ui-field-header');
            const labelText = el.querySelector('.ui-field-label-text');
            if (isHTMLElement(header) && isHTMLElement(labelText)) {
                if (value) {
                    header.style.display = '';
                    labelText.textContent = String(value);
                } else {
                    labelText.textContent = '';
                    header.style.display = 'none';
                }
            }
            return true;
        }

        if (name === 'required') {
            const req = el.querySelector('.ui-field-required');
            const isReq = Boolean(value);
            if (isHTMLElement(req)) {
                req.style.display = isReq ? '' : 'none';
            }
            if (isReq) el.setAttribute('data-required', 'true');
            else el.removeAttribute('data-required');
            return true;
        }

        if (name === 'hint' || name === 'description') {
            const hint = el.querySelector('.ui-field-hint');
            if (isHTMLElement(hint)) {
                if (value) {
                    hint.style.display = '';
                    hint.textContent = String(value);
                } else {
                    hint.style.display = 'none';
                    hint.textContent = '';
                }
            }
            return true;
        }

        if (name === 'error') {
            const err = el.querySelector('.ui-field-error');
            if (isHTMLElement(err)) {
                if (value) {
                    err.style.display = '';
                    err.textContent = String(value);
                    el.setAttribute('data-invalid', 'true');
                } else {
                    err.style.display = 'none';
                    err.textContent = '';
                    el.removeAttribute('data-invalid');
                }
            }
            return true;
        }

        if (name === 'name') {
            el.setAttribute('data-field-name', String(value));
            return true;
        }

        if (name === 'class') {
            const extra = typeof value === 'string' ? value : '';
            el.className = `ui-field ${extra}`.trim();
            return true;
        }

        return false;
    },
};

export const labelComponent: ComponentDefinition = {
    name: 'ui.Label',
    create(): Element {
        const el = document.createElement('label');
        el.className = 'ui-label';
        return el;
    },
    apply(el: Element, name: string, value: Json): boolean | void {
        if (name === 'for' || name === 'htmlFor') {
            if (value) el.setAttribute('for', String(value));
            else el.removeAttribute('for');
            return true;
        }
        if (name === 'required') {
            if (Boolean(value)) el.setAttribute('data-required', 'true');
            else el.removeAttribute('data-required');
            return true;
        }
        if (name === 'class') {
            const extra = typeof value === 'string' ? value : '';
            el.className = `ui-label ${extra}`.trim();
            return true;
        }
        return false;
    },
};

export const selectComponent: ComponentDefinition = {
    name: 'ui.Select',
    spaceIsTextInput: false,
    create(): Element {
        const el = document.createElement('select');
        el.className = 'ui-select';
        // Forward change to input so listeners expecting 'input' event (like the dispatcher) catch it
        el.addEventListener('change', () => {
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        return el;
    },
    apply(el: Element, name: string, value: Json): boolean | void {
        if (!(el instanceof HTMLSelectElement)) return false;

        if (name === 'options') {
            el.replaceChildren();
            const placeholder = el.getAttribute('data-placeholder');
            if (placeholder) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = placeholder;
                opt.disabled = true;
                opt.hidden = true;
                el.appendChild(opt);
            }
            if (Array.isArray(value)) {
                for (const item of value) {
                    const opt = document.createElement('option');
                    if (typeof item === 'object' && item !== null && 'value' in item) {
                        const itemObj = item as { value: unknown; label?: unknown };
                        opt.value = String(itemObj.value);
                        opt.textContent = itemObj.label !== undefined ? String(itemObj.label) : String(itemObj.value);
                    } else {
                        opt.value = String(item);
                        opt.textContent = String(item);
                    }
                    el.appendChild(opt);
                }
            }
            const currentVal = el.getAttribute('data-value');
            if (currentVal !== null) {
                el.value = currentVal;
            }
            return true;
        }

        if (name === 'value') {
            const strVal = value === null || value === undefined ? '' : String(value);
            el.setAttribute('data-value', strVal);
            if (el.value !== strVal) {
                el.value = strVal;
            }
            return true;
        }

        if (name === 'placeholder') {
            if (value) el.setAttribute('data-placeholder', String(value));
            else el.removeAttribute('data-placeholder');
            return true;
        }

        if (name === 'disabled') {
            el.disabled = Boolean(value);
            return true;
        }

        if (name === 'name') {
            el.name = String(value);
            return true;
        }

        if (name === 'class') {
            const extra = typeof value === 'string' ? value : '';
            el.className = `ui-select ${extra}`.trim();
            return true;
        }

        return false;
    },
};

export const buttonRowComponent: ComponentDefinition = {
    name: 'ui.ButtonRow',
    spaceIsTextInput: false,
    create(): Element {
        const el = document.createElement('div');
        el.className = 'ui-button-row';
        return el;
    },
    apply(el: Element, name: string, value: Json): boolean | void {
        if (name === 'align') {
            el.setAttribute('data-align', String(value));
            if (isHTMLElement(el)) {
                const alignMap: Record<string, string> = {
                    start: 'flex-start',
                    center: 'center',
                    end: 'flex-end',
                    between: 'space-between',
                };
                el.style.justifyContent = alignMap[String(value)] ?? 'flex-start';
            }
            return true;
        }

        if (name === 'gap') {
            if (isHTMLElement(el)) {
                el.style.gap = typeof value === 'number' ? `${value}px` : String(value);
            }
            return true;
        }

        if (name === 'class') {
            const extra = typeof value === 'string' ? value : '';
            el.className = `ui-button-row ${extra}`.trim();
            return true;
        }

        return false;
    },
};

export const dialogComponent: ComponentDefinition = {
    name: 'ui.Dialog',
    spaceIsTextInput: false,
    create(): Element {
        const el = document.createElement('dialog');
        el.className = 'ui-dialog';

        const content = document.createElement('div');
        content.className = 'ui-dialog-content';

        const header = document.createElement('div');
        header.className = 'ui-dialog-header';
        header.style.display = 'none';

        const title = document.createElement('h3');
        title.className = 'ui-dialog-title';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'ui-dialog-close';
        closeBtn.setAttribute('aria-label', 'Close dialog');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => {
            if (typeof (el as HTMLDialogElement).close === 'function') {
                (el as HTMLDialogElement).close();
            } else {
                el.removeAttribute('open');
            }
            el.dispatchEvent(new Event('close'));
        });

        header.appendChild(title);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'ui-dialog-body';

        content.appendChild(header);
        content.appendChild(body);
        el.appendChild(content);

        return el;
    },

    slot(el: Element): Element {
        const body = el.querySelector('.ui-dialog-body');
        return body ?? el;
    },

    apply(el: Element, name: string, value: Json): boolean | void {
        const dialog = el as HTMLDialogElement;

        if (name === 'open') {
            const isOpen = Boolean(value);
            if (isOpen) {
                if (!dialog.hasAttribute('open')) {
                    if (typeof dialog.showModal === 'function') {
                        try {
                            dialog.showModal();
                        } catch {
                            dialog.setAttribute('open', '');
                        }
                    } else {
                        dialog.setAttribute('open', '');
                    }
                }
            } else {
                if (dialog.hasAttribute('open')) {
                    if (typeof dialog.close === 'function') {
                        dialog.close();
                    } else {
                        dialog.removeAttribute('open');
                    }
                }
            }
            return true;
        }

        if (name === 'title') {
            const header = el.querySelector('.ui-dialog-header');
            const titleEl = el.querySelector('.ui-dialog-title');
            if (isHTMLElement(header) && isHTMLElement(titleEl)) {
                if (value) {
                    header.style.display = '';
                    titleEl.textContent = String(value);
                } else {
                    header.style.display = 'none';
                    titleEl.textContent = '';
                }
            }
            return true;
        }

        if (name === 'class') {
            const extra = typeof value === 'string' ? value : '';
            el.className = `ui-dialog ${extra}`.trim();
            return true;
        }

        return false;
    },
};
