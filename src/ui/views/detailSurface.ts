import type { ComponentDefinition, Json } from '@flybyme/mesh-web';

function isHTMLElement(el: unknown): el is HTMLElement {
    return typeof HTMLElement !== 'undefined' && el instanceof HTMLElement;
}

export const detailSurfaceComponent: ComponentDefinition = {
    name: 'ui.DetailSurface',
    create(): Element {
        const el = document.createElement('section');
        el.className = 'ui-detail-surface';
        el.setAttribute('data-selected', 'true');

        const placeholder = document.createElement('div');
        placeholder.className = 'ui-detail-surface-placeholder';

        const pTitle = document.createElement('h2');
        pTitle.className = 'ui-detail-surface-placeholder-title';
        pTitle.textContent = 'No item selected';

        const pMsg = document.createElement('p');
        pMsg.className = 'ui-detail-surface-placeholder-message';
        pMsg.textContent = 'Select an item from the list to inspect its details.';

        placeholder.appendChild(pTitle);
        placeholder.appendChild(pMsg);

        const card = document.createElement('div');
        card.className = 'ui-detail-surface-card';

        const header = document.createElement('div');
        header.className = 'ui-detail-surface-header';
        header.style.display = 'none';

        const titleEl = document.createElement('h2');
        titleEl.className = 'ui-detail-surface-title';

        const badgeEl = document.createElement('span');
        badgeEl.className = 'ui-detail-surface-badge';
        badgeEl.style.display = 'none';

        header.appendChild(titleEl);
        header.appendChild(badgeEl);

        const body = document.createElement('div');
        body.className = 'ui-detail-surface-body';

        card.appendChild(header);
        card.appendChild(body);

        el.appendChild(placeholder);
        el.appendChild(card);

        return el;
    },

    slot(el: Element): Element {
        const body = el.querySelector('.ui-detail-surface-body');
        return body ?? el;
    },

    apply(el: Element, name: string, value: Json): boolean | void {
        if (name === 'selected') {
            el.setAttribute('data-selected', String(Boolean(value)));
            return true;
        }

        if (name === 'placeholderTitle') {
            const pTitle = el.querySelector('.ui-detail-surface-placeholder-title');
            if (isHTMLElement(pTitle)) pTitle.textContent = String(value);
            return true;
        }

        if (name === 'placeholderMessage') {
            const pMsg = el.querySelector('.ui-detail-surface-placeholder-message');
            if (isHTMLElement(pMsg)) {
                pMsg.textContent = String(value);
                pMsg.style.display = value ? '' : 'none';
            }
            return true;
        }

        if (name === 'title') {
            const header = el.querySelector('.ui-detail-surface-header');
            const title = el.querySelector('.ui-detail-surface-title');
            if (isHTMLElement(header) && isHTMLElement(title)) {
                if (value) {
                    header.style.display = '';
                    title.textContent = String(value);
                } else {
                    title.textContent = '';
                    const badge = el.querySelector('.ui-detail-surface-badge');
                    if (isHTMLElement(badge) && badge.style.display === 'none') {
                        header.style.display = 'none';
                    }
                }
            }
            return true;
        }

        if (name === 'badge') {
            const header = el.querySelector('.ui-detail-surface-header');
            const badge = el.querySelector('.ui-detail-surface-badge');
            if (isHTMLElement(header) && isHTMLElement(badge)) {
                if (value) {
                    header.style.display = '';
                    badge.style.display = '';
                    badge.textContent = String(value);
                } else {
                    badge.style.display = 'none';
                    badge.textContent = '';
                }
            }
            return true;
        }

        if (name === 'badgeVariant') {
            const badge = el.querySelector('.ui-detail-surface-badge');
            if (isHTMLElement(badge)) badge.setAttribute('data-variant', String(value));
            return true;
        }

        return false;
    },
};
