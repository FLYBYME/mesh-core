import type { ComponentDefinition, Json } from '@flybyme/mesh-web';

function isHTMLElement(el: unknown): el is HTMLElement {
    return typeof HTMLElement !== 'undefined' && el instanceof HTMLElement;
}

const entityListHeaders = new WeakMap<Element, HTMLElement>();

export const entityListComponent: ComponentDefinition = {
    name: 'ui.EntityList',
    create(): Element {
        const el = document.createElement('aside');
        el.className = 'ui-entity-list';
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', 'Entity list');

        const header = document.createElement('div');
        header.className = 'ui-entity-list-header';
        header.style.display = 'none';

        const heading = document.createElement('h2');
        heading.className = 'ui-entity-list-heading';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'ui-entity-list-title';

        const countSpan = document.createElement('span');
        countSpan.className = 'ui-entity-list-count';

        heading.appendChild(titleSpan);
        heading.appendChild(document.createTextNode(' '));
        heading.appendChild(countSpan);
        header.appendChild(heading);

        entityListHeaders.set(el, header);

        const loading = document.createElement('div');
        loading.className = 'ui-entity-list-loading';
        loading.setAttribute('role', 'status');
        loading.textContent = 'Loading...';

        const error = document.createElement('div');
        error.className = 'ui-entity-list-error';
        error.setAttribute('role', 'alert');
        error.textContent = 'Failed to load';

        const items = document.createElement('div');
        items.className = 'ui-entity-list-items';
        items.setAttribute('role', 'list');

        const empty = document.createElement('div');
        empty.className = 'ui-entity-list-empty';
        empty.setAttribute('role', 'status');
        empty.textContent = 'No items found.';

        const idle = document.createElement('div');
        idle.className = 'ui-entity-list-idle';
        idle.setAttribute('role', 'status');
        idle.textContent = 'Not signed in.';

        el.appendChild(loading);
        el.appendChild(error);
        el.appendChild(items);
        el.appendChild(empty);
        el.appendChild(idle);

        return el;
    },

    slot(el: Element): Element {
        const items = el.querySelector('.ui-entity-list-items');
        return items ?? el;
    },

    apply(el: Element, name: string, value: Json): boolean | void {
        if (name === 'status') {
            el.setAttribute('data-status', String(value));
            return true;
        }

        if (name === 'title' || name === 'heading') {
            const header = entityListHeaders.get(el);
            const title = header?.querySelector('.ui-entity-list-title');
            if (isHTMLElement(header) && isHTMLElement(title)) {
                if (value) {
                    if (!el.contains(header)) {
                        el.insertBefore(header, el.firstChild);
                    }
                    header.style.display = '';
                    title.textContent = String(value);
                    el.setAttribute('aria-label', String(value));
                } else {
                    header.style.display = 'none';
                    title.textContent = '';
                    if (el.contains(header)) {
                        header.remove();
                    }
                }
            }
            return true;
        }

        if (name === 'count') {
            const header = entityListHeaders.get(el);
            const count = header?.querySelector('.ui-entity-list-count');
            if (isHTMLElement(count)) {
                if (value !== null && value !== undefined) {
                    count.textContent = `(${String(value)})`;
                } else {
                    count.textContent = '';
                }
            }
            if (typeof value === 'number') {
                if (value === 0) el.setAttribute('data-empty', 'true');
                else el.removeAttribute('data-empty');
            }
            return true;
        }

        if (name === 'empty') {
            if (Boolean(value)) el.setAttribute('data-empty', 'true');
            else el.removeAttribute('data-empty');
            return true;
        }

        if (name === 'loadingMessage') {
            const loading = el.querySelector('.ui-entity-list-loading');
            if (isHTMLElement(loading)) loading.textContent = String(value);
            return true;
        }

        if (name === 'errorMessage') {
            const error = el.querySelector('.ui-entity-list-error');
            if (isHTMLElement(error)) error.textContent = value === null ? '' : String(value);
            return true;
        }

        if (name === 'emptyMessage') {
            const empty = el.querySelector('.ui-entity-list-empty');
            if (isHTMLElement(empty)) empty.textContent = String(value);
            return true;
        }

        if (name === 'idleMessage') {
            const idle = el.querySelector('.ui-entity-list-idle');
            if (isHTMLElement(idle)) idle.textContent = String(value);
            return true;
        }

        if (name === 'errorClass') {
            const error = el.querySelector('.ui-entity-list-error');
            if (isHTMLElement(error) && typeof value === 'string') {
                for (const cls of value.split(' ')) {
                    if (cls) error.classList.add(cls);
                }
            }
            return true;
        }

        if (name === 'width') {
            if (isHTMLElement(el)) {
                el.style.width = String(value);
                el.style.flex = `0 0 ${String(value)}`;
            }
            return true;
        }

        if (name === 'class') {
            const extra = typeof value === 'string' ? value : '';
            el.className = `ui-entity-list ${extra}`.trim();
            return true;
        }

        return false;
    },
};

export const entityItemComponent: ComponentDefinition = {
    name: 'ui.EntityItem',
    spaceIsTextInput: false,
    create(): Element {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'ui-entity-item';
        return el;
    },
    apply(el: Element, name: string, value: Json): boolean | void {
        if (name === 'class') {
            const extra = typeof value === 'string' ? value : '';
            const isSel = el.getAttribute('data-selected') === 'true';
            el.className = `ui-entity-item ${extra}${isSel ? ' selected' : ''}`.trim();
            return true;
        }

        if (name === 'selected') {
            const isSel = Boolean(value);
            if (isSel) {
                el.setAttribute('data-selected', 'true');
                el.setAttribute('aria-selected', 'true');
                el.classList.add('selected');
            } else {
                el.removeAttribute('data-selected');
                el.removeAttribute('aria-selected');
                el.classList.remove('selected');
            }
            return true;
        }
        return false;
    },
};
