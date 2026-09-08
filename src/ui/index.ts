/**
 * The UI vocabulary for mesh-core.
 *
 * Fourteen components and composites sorted per spec/ui/vocabulary.md:
 *   - 11 components: EntityList, EntityItem, DetailSurface, PropertyGrid, Table,
 *     TableRow, Field, Label, Select, ButtonRow, Dialog.
 *   - 3 composites: Form, ActionButton, ActionCard.
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
    createActionButton,
    createActionCard,
    createForm,
};

export * from './contract.js';
export * from './schema.js';
