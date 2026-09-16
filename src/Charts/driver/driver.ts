/**
 * ComponentDefinition for ChartSurface.
 *
 * Registered as 'ChartSurface' in the kernel component registry.
 * Connects the declarative Chart.* components to the real SVG DOM engine.
 */

import type { ComponentDefinition, Json, Props } from '@flybyme/mesh-web';
import type { ChartRenderPayload } from '../contract/types.js';
import { createChartDom, type ChartDomInstance } from './chartDom.js';
import '../styles/charts.css';

const instances = new WeakMap<Element, ChartDomInstance>();
const liveElements = new Set<Element>();

let globalObserver: MutationObserver | undefined;

function ensureObserver(): void {
    if (globalObserver !== undefined) return;

    globalObserver = new MutationObserver(() => {
        for (const el of liveElements) {
            if (!document.contains(el)) {
                liveElements.delete(el);
                const instance = instances.get(el);
                if (instance) {
                    instance.dispose();
                    instances.delete(el);
                }
            }
        }
        if (liveElements.size === 0 && globalObserver !== undefined) {
            globalObserver.disconnect();
            globalObserver = undefined;
        }
    });

    globalObserver.observe(document.body, { childList: true, subtree: true });
}

export const ChartDriver: ComponentDefinition = {
    name: 'ChartSurface',

    create(props?: Props): Element {
        const payload = props?.payload as unknown as ChartRenderPayload | undefined;
        const instance = createChartDom(payload);
        instances.set(instance.element, instance);
        liveElements.add(instance.element);

        queueMicrotask(() => {
            if (document.contains(instance.element)) {
                ensureObserver();
            }
        });

        return instance.element;
    },

    apply(el: Element, name: string, value: Json): boolean | void {
        const instance = instances.get(el);
        if (instance === undefined) return false;

        if (name === 'payload' && value) {
            instance.update(value as unknown as ChartRenderPayload);
            return true;
        }

        return false;
    },
};
