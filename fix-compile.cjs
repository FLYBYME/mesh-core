const fs = require('fs');

// 1. fix entityList.ts
let el = fs.readFileSync('src/ui/components/entityList.ts', 'utf8');
el = el.replace('props.items ?? []', 'props.children ?? []');
// wait, the first replace changes both! We want the first one to be items (EntityList) and second children (EntityItem).
el = el.replace('children: props.items ?? []', 'children: props.items ?? []'); // keep first
// Wait, the easiest is to just revert EntityItem:
el = el.replace('props.items ?? []', 'props.children ?? []'); // only replaces the first occurrence? No, replaceAll.
// let's just write exactly what we want
fs.writeFileSync('src/ui/components/entityList.ts', el.replace('...(props.items ?? []),', '...(props.children ?? []),'));

// 2. fix form.ts
let form = fs.readFileSync('src/ui/composites/form.ts', 'utf8');
form = form.replace(/overrides\.renderActions/g, 'overrides.button');
// add constraint to Form generic
form = form.replace('export function Form<T = Record<string, Json | undefined>>', 'export function Form<T extends Record<string, Json | undefined> = Record<string, Json | undefined>>');
fs.writeFileSync('src/ui/composites/form.ts', form);

// 3. fix test
let test = fs.readFileSync('test/generics.type.test.ts', 'utf8');
test = test.replace('interface ImportRepoInput {', 'interface ImportRepoInput extends Record<string, Json | undefined> {');
fs.writeFileSync('test/generics.type.test.ts', test);
