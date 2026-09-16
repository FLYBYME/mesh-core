/**
 * ComponentDefinition for CodeEditor.
 *
 * Registered into the kernel component registry as 'CodeEditor'.
 * Connects the declarative description tree to the real DOM engine.
 */

import type { ComponentDefinition, Json, Props } from '@flybyme/mesh-web';
import type { CodeEditorController } from '../contract/handle.js';
import type { EditorMarker } from '../contract/types.js';
import { createEditorDom, type EditorDomInstance } from './editorDom.js';
import '../styles/editor.css';

const instances = new WeakMap<Element, EditorDomInstance>();

export const CodeEditorDriver: ComponentDefinition = {
    name: 'CodeEditor',

    /**
     * Space typed inside the editor is text input and must not trigger
     * the 'activate' intent.
     */
    spaceIsTextInput: true,

    create(props?: Props): Element {
        const instance = createEditorDom();
        instances.set(instance.element, instance);

        // Attach controller if passed at creation
        const controller = props?.controller as unknown as CodeEditorController | undefined;
        if (controller && typeof controller._attach === 'function') {
            controller._attach(instance.handle);
        }

        // Monitor disconnect to detach controller and clean up
        let disconnected = false;
        const observer = new MutationObserver(() => {
            if (!disconnected && !document.contains(instance.element)) {
                disconnected = true;
                observer.disconnect();
                if (controller && typeof controller._detach === 'function') {
                    controller._detach();
                }
                instance.dispose();
                instances.delete(instance.element);
            }
        });

        // Observe when mounted to document
        queueMicrotask(() => {
            if (document.contains(instance.element)) {
                observer.observe(document.body, { childList: true, subtree: true });
            }
        });

        return instance.element;
    },

    apply(el: Element, name: string, value: Json): boolean | void {
        const instance = instances.get(el);
        if (instance === undefined) return false;

        switch (name) {
            case 'content':
                instance.updateContent(String(value ?? ''));
                return true;

            case 'language':
                instance.updateLanguage(value !== undefined ? String(value) : undefined);
                return true;

            case 'readOnly':
                instance.updateReadOnly(Boolean(value));
                return true;

            case 'lineNumbers':
                instance.updateLineNumbers(value !== false);
                return true;

            case 'markers':
                instance.updateMarkers(value as unknown as readonly EditorMarker[]);
                return true;

            case 'controller':
                if (value && typeof value === 'object' && '_attach' in value) {
                    (value as unknown as CodeEditorController)._attach(instance.handle);
                }
                return true;

            default:
                return false;
        }
    },
};
