import type { ComponentDefinition, Json } from '@flybyme/mesh-web';

function isHTMLElement(el: unknown): el is HTMLElement {
    return typeof HTMLElement !== 'undefined' && el instanceof HTMLElement;
}

export const propertyGridComponent: ComponentDefinition = {
    name: 'ui.PropertyGrid',
    create(): Element {
        const el = document.createElement('dl');
        el.className = 'ui-property-grid';
        el.setAttribute('role', 'list');
        return el;
    },

    apply(el: Element, name: string, value: Json): boolean | void {
        if (name === 'columns') {
            if (isHTMLElement(el)) {
                el.style.gridTemplateColumns = String(value);
                el.style.setProperty('--ui-property-grid-columns', String(value));
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
            el.className = `ui-property-grid ${extra}`.trim();
            return true;
        }

        return false;
    },
};
