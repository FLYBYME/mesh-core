const fs = require('fs');
let contract = fs.readFileSync('src/ui/contract.ts', 'utf8');
contract = contract.replace(
    'readonly children?: readonly Node[] | undefined;\n}',
    'readonly children?: readonly Node[] | undefined;\n    readonly action?: ActionButtonProps<any, any> | undefined;\n}'
);
fs.writeFileSync('src/ui/contract.ts', contract);

let table = fs.readFileSync('src/ui/components/table.ts', 'utf8');
table = table.replace(
    "import {",
    "import { ActionButton } from '../index.js';\nimport {"
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
