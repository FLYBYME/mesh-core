const fs = require('fs');
let content = fs.readFileSync('src/ui/composites/form.ts', 'utf8');

// Find the line starting with export const Form: Composite
const startIndex = content.indexOf('export const Form: Composite<');
if (startIndex !== -1) {
    const newExport = `export function Form<T = Record<string, Json | undefined>>(props: FormProps<T>): Node {
    return createForm(props).view();
}
`;
    content = content.substring(0, startIndex) + newExport;
    fs.writeFileSync('src/ui/composites/form.ts', content);
}
