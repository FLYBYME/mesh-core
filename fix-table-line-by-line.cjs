const fs = require('fs');
let table = fs.readFileSync('src/ui/components/table.ts', 'utf8').split('\n');
table.splice(11, 0, "import { ActionButton } from '../composites/actionButton.js';");
// UI_TABLE_ROW is around line 124. children: props.children ?? [], is around 142.
for (let i = 0; i < table.length; i++) {
    if (table[i].includes('children: props.children ?? [],') && i > 100) {
        table[i] = `            children: [
                ...(props.children ?? []),
                ...(props.action ? [
                    element('Text', {
                        props: { class: 'ui-table-cell ui-table-action-cell', role: 'cell' },
                        children: [ActionButton(props.action)]
                    })
                ] : [])
            ],`;
    }
}
fs.writeFileSync('src/ui/components/table.ts', table.join('\n'));

let contract = fs.readFileSync('src/ui/contract.ts', 'utf8').split('\n');
// import ActionButtonProps if not imported
let hasImport = false;
for(let line of contract) {
    if (line.includes('ActionButtonProps')) hasImport = true;
}
// We will just add the action property
for (let i = 0; i < contract.length; i++) {
    if (contract[i].includes('export interface TableRowProps {')) {
        contract.splice(i + 1, 0, '    readonly action?: ActionButtonProps<any, any> | undefined;');
        break;
    }
}
fs.writeFileSync('src/ui/contract.ts', contract.join('\n'));
