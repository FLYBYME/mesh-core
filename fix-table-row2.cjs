const fs = require('fs');

let table = fs.readFileSync('src/ui/components/table.ts', 'utf8');
table = table.replace(
    "import {",
    "import { ActionButton } from '../composites/actionButton.js';\nimport {"
);
table = table.replace(
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
fs.writeFileSync('src/ui/components/table.ts', table);
