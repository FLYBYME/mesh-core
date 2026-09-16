/**
 * CodeEditor subsystem for mesh-core.
 *
 * Provides:
 * - contract/: types, positions, ranges, markers, handles, event payloads
 * - controller/: headless application handle (createCodeEditorController)
 * - ui/: pure description composite (CodeEditor)
 * - driver/: DOM engine and ComponentDefinition (CodeEditorDriver)
 */

import { CodeEditorDriver } from './driver/index.js';

export * from './contract/index.js';
export * from './controller/index.js';
export * from './ui/index.js';
export * from './driver/index.js';

/**
 * The CodeEditor part contribution.
 *
 * Declares the 'CodeEditor' component primitive so the kernel registers it
 * into the component vocabulary at boot time.
 */
export class CodeEditorPart {
    readonly needs = [] as const;
    readonly components = [CodeEditorDriver] as const;

    activate(): undefined {
        return undefined;
    }
}

export default CodeEditorPart;
