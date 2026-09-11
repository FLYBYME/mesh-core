const fs = require('fs');
let contract = fs.readFileSync('src/ui/contract.ts', 'utf8').split('\n');

let viewLayoutDecls = 0;
contract = contract.filter(line => {
    if (line.includes('export const UI_VIEW_LAYOUT =')) {
        viewLayoutDecls++;
        return viewLayoutDecls === 1;
    }
    return true;
});

// Remove duplicated ViewLayoutProps
let inProps = false;
let propsSeen = 0;
contract = contract.filter(line => {
    if (line.includes('export interface ViewLayoutProps')) {
        propsSeen++;
        if (propsSeen > 1) {
            inProps = true;
            return false;
        }
    }
    if (inProps) {
        if (line.includes('}')) {
            inProps = false;
        }
        return false;
    }
    return true;
});

fs.writeFileSync('src/ui/contract.ts', contract.join('\n'));
