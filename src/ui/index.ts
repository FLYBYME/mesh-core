/**
 * The UI vocabulary for mesh-core.
 *
 * Fifteen components and composites sorted per spec/ui/vocabulary.md:
 *   - 11 components: EntityList, EntityItem, DetailSurface, PropertyGrid, Table,
 *     TableRow, Field, Label, Select, ButtonRow, Dialog.
 *   - 4 composites: Form, ActionButton, ActionCard, SignIn.
 *
 * Zero DOM calls: no component calls document.createElement.
 */

import { DetailSurface } from './components/detailSurface.js';
import { EntityItem, EntityList } from './components/entityList.js';
import { Field, Label } from './components/field.js';
import { PropertyGrid } from './components/propertyGrid.js';
import { Select } from './components/select.js';
import { Table, TableRow } from './components/table.js';
import { ButtonRow } from './components/buttonRow.js';
import { Dialog } from './components/dialog.js';

import { ActionButton, createActionButton } from './composites/actionButton.js';
import { ActionCard, createActionCard } from './composites/actionCard.js';
import { createForm, Form } from './composites/form.js';
import { createSignIn, SignIn } from './composites/signIn.js';

import './ui.css';

export const ui = {
    EntityList,
    EntityItem,
    DetailSurface,
    PropertyGrid,
    Table,
    TableRow,
    Form,
    Field,
    Label,
    Select,
    ButtonRow,
    Dialog,
    ActionButton,
    ActionCard,
    SignIn,
} as const;

export {
    EntityList,
    EntityItem,
    DetailSurface,
    PropertyGrid,
    Table,
    TableRow,
    Form,
    Field,
    Label,
    Select,
    ButtonRow,
    Dialog,
    ActionButton,
    ActionCard,
    SignIn,
    createActionButton,
    createActionCard,
    createForm,
    createSignIn,
};

export * from './contract.js';
export * from './schema.js';

// ---------------------------------------------------------------------------- the part

/**
 * **The vocabulary as a part, so a site can compose it and other parts can import it.**
 *
 * Everything above has existed since the salvage and **nothing could use it.** A part is bundled
 * with exactly one specifier external — `@flybyme/mesh-web` — and everything else inlined from its
 * own clone, so `@flybyme/mesh-core` was not importable by any part at all. That is why
 * `element('Label')` threw on a page whose `node_modules` contained `Label`: not a missing manifest
 * entry, a build boundary.
 *
 * A part now declares `requiredParts: [{ id: 'ui' }]`, the builder reads the specifier *this part
 * publishes* and marks it external, and the site's import map resolves it to this artifact. The
 * consumer writes an ordinary import and the compiler checks the props — `ui.Card({ wrong: 1 })`
 * does not build. No generator, no registry, no name resolved at render.
 *
 * ## Why the extension is in this file rather than beside it
 *
 * The entry the builder bundles and the path `package.json` exports must be **one module**. Two
 * would be two sets of exports that can drift: the compiler would check against one and the browser
 * would import the other, and the first symptom would be `undefined is not a function` on a page.
 *
 * ## It does nothing, and that is correct
 *
 * No capabilities, no provider, no state. A vocabulary is not a capability — it is a set of names
 * and props, and every one of them is reached by import rather than through the kernel. `activate`
 * exists because a contribution has one; the default export exists because `boot.js` constructs it,
 * and a part entry without one fails at module evaluation before anything on the page runs.
 */
export class UiExtension {
    readonly needs = [] as const;

    activate(): undefined {
        return undefined;
    }
}

export default UiExtension;
