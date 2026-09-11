const fs = require('fs');

let table = fs.readFileSync('src/ui/components/table.ts', 'utf8');
table = table.replace(
    "import {",
    "import { ActionButton } from '../composites/actionButton.js';\nimport {"
);
const parts = table.split('UI_TABLE_ROW,');
parts[1] = parts[1].replace(
    "children: props.children ?? [],",
    `children: [
                ...(props.children ?? []),
                ...(props.action ? [
                    element('Text', {
                        props: { class: 'ui-table-cell ui-table-action-cell', role: 'cell' },
                        children: [ActionButton(props.action)]
                    })
                ] : [])
            ],`
);
table = parts.join('UI_TABLE_ROW,');
fs.writeFileSync('src/ui/components/table.ts', table);
