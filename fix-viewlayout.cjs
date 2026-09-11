const fs = require('fs');

// contract.ts
let contract = fs.readFileSync('src/ui/contract.ts', 'utf8');
contract = contract.replace('export const UI_ENTITY_LIST =', "export const UI_VIEW_LAYOUT = 'ui.ViewLayout';\nexport const UI_ENTITY_LIST =");
contract += `
// ---------------------------------------------------------------------------- props: ViewLayout

export interface ViewLayoutProps {
    readonly header?: Reactive<Node | undefined> | undefined;
    readonly index?: Reactive<Node | undefined> | undefined;
    readonly detail?: Reactive<Node | undefined> | undefined;
    readonly footer?: Reactive<Node | undefined> | undefined;
    readonly class?: Reactive<string> | undefined;
}
`;
fs.writeFileSync('src/ui/contract.ts', contract);

// index.ts
let idx = fs.readFileSync('src/ui/index.ts', 'utf8');
idx = idx.replace("import { EntityItem, EntityList }", "import { ViewLayout } from './components/viewLayout.js';\nimport { EntityItem, EntityList }");
idx = idx.replace('export const ui = {', 'export const ui = {\n    ViewLayout,');
idx = idx.replace('export {', 'export {\n    ViewLayout,');
fs.writeFileSync('src/ui/index.ts', idx);
