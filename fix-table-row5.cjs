const fs = require('fs');

let table = fs.readFileSync('src/ui/components/table.ts', 'utf8');

table = table.replace(/children: \[\n\s+\.\.\.\(props\.children \?\? \[\]\),\n\s+\.\.\.\(props\.action \? \[\n\s+element\('Text', \{\n\s+props: \{ class: 'ui-table-cell ui-table-action-cell', role: 'cell' \},\n\s+children: \[ActionButton\(props\.action\)\]\n\s+\}\)\n\s+\] : \[\]\)\n\s+\],/g, 'children: props.children ?? [],');

// Now explicitly replace ONLY the one in TableRow
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
