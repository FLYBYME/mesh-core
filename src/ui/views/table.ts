import type { ComponentDefinition, Json } from '@flybyme/mesh-web';

function isHTMLElement(el: unknown): el is HTMLElement {
    return typeof HTMLElement !== 'undefined' && el instanceof HTMLElement;
}

export const tableComponent: ComponentDefinition = {
    name: 'ui.Table',
    create(): Element {
        const el = document.createElement('div');
        el.className = 'ui-table';
        el.setAttribute('role', 'table');

        const header = document.createElement('div');
        header.className = 'ui-table-header';
        header.setAttribute('role', 'rowgroup');

        const loading = document.createElement('div');
        loading.className = 'ui-table-loading';
        loading.setAttribute('role', 'status');
        loading.textContent = 'Loading...';

        const error = document.createElement('div');
        error.className = 'ui-table-error';
        error.setAttribute('role', 'alert');
        error.textContent = 'Table error';

        const rows = document.createElement('div');
        rows.className = 'ui-table-rows';
        rows.setAttribute('role', 'rowgroup');

        const empty = document.createElement('div');
        empty.className = 'ui-table-empty';
        empty.setAttribute('role', 'status');
        empty.textContent = 'No records found.';

        const idle = document.createElement('div');
        idle.className = 'ui-table-idle';
        idle.setAttribute('role', 'status');
        idle.textContent = 'Not signed in.';

        el.appendChild(header);
        el.appendChild(loading);
        el.appendChild(error);
        el.appendChild(rows);
        el.appendChild(empty);
        el.appendChild(idle);

        return el;
    },

    slot(el: Element): Element {
        const rows = el.querySelector('.ui-table-rows');
        return rows ?? el;
    },

    apply(el: Element, name: string, value: Json): boolean | void {
        if (name === 'columns') {
            if (isHTMLElement(el)) {
                el.style.setProperty('--ui-table-columns', String(value));
            }
            return true;
        }

        if (name === 'headers') {
            const header = el.querySelector('.ui-table-header');
            if (isHTMLElement(header)) {
                header.replaceChildren();
                if (Array.isArray(value)) {
                    for (const h of value) {
                        const cell = document.createElement('div');
                        cell.className = 'ui-table-header-cell';
                        cell.setAttribute('role', 'columnheader');
                        cell.textContent = String(h);
                        header.appendChild(cell);
                    }
                }
            }
            return true;
        }

        if (name === 'headerClass') {
            const header = el.querySelector('.ui-table-header');
            if (isHTMLElement(header) && typeof value === 'string') {
                for (const cls of value.split(' ')) {
                    if (cls) header.classList.add(cls);
                }
            }
            return true;
        }

        if (name === 'rowsClass') {
            const rows = el.querySelector('.ui-table-rows');
            if (isHTMLElement(rows) && typeof value === 'string') {
                for (const cls of value.split(' ')) {
                    if (cls) rows.classList.add(cls);
                }
            }
            return true;
        }

        if (name === 'status') {
            el.setAttribute('data-status', String(value));
            return true;
        }

        if (name === 'empty') {
            if (Boolean(value)) el.setAttribute('data-empty', 'true');
            else el.removeAttribute('data-empty');
            return true;
        }

        if (name === 'count') {
            if (typeof value === 'number') {
                if (value === 0) el.setAttribute('data-empty', 'true');
                else el.removeAttribute('data-empty');
            }
            return true;
        }

        if (name === 'loadingMessage') {
            const loading = el.querySelector('.ui-table-loading');
            if (isHTMLElement(loading)) loading.textContent = String(value);
            return true;
        }

        if (name === 'errorMessage') {
            const error = el.querySelector('.ui-table-error');
            if (isHTMLElement(error)) error.textContent = value === null ? '' : String(value);
            return true;
        }

        if (name === 'emptyMessage') {
            const empty = el.querySelector('.ui-table-empty');
            if (isHTMLElement(empty)) empty.textContent = String(value);
            return true;
        }

        if (name === 'idleMessage') {
            const idle = el.querySelector('.ui-table-idle');
            if (isHTMLElement(idle)) idle.textContent = String(value);
            return true;
        }

        if (name === 'class') {
            const extra = typeof value === 'string' ? value : '';
            el.className = `ui-table ${extra}`.trim();
            return true;
        }

        return false;
    },
};

export const tableRowComponent: ComponentDefinition = {
    name: 'ui.TableRow',
    spaceIsTextInput: false,
    create(): Element {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'ui-table-row';
        el.setAttribute('role', 'row');
        return el;
    },
    apply(el: Element, name: string, value: Json): boolean | void {
        if (name === 'class') {
            const extra = typeof value === 'string' ? value : '';
            const isSel = el.getAttribute('data-selected') === 'true';
            el.className = `ui-table-row ${extra}${isSel ? ' selected active-version' : ''}`.trim();
            return true;
        }

        if (name === 'selected') {
            const isSel = Boolean(value);
            if (isSel) {
                el.setAttribute('data-selected', 'true');
                el.classList.add('selected', 'active-version');
            } else {
                el.removeAttribute('data-selected');
                el.classList.remove('selected', 'active-version');
            }
            return true;
        }
        return false;
    },
};
