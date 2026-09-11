const fs = require('fs');
let chrome = fs.readFileSync('src/chrome/chrome.ts', 'utf8');

if (!chrome.includes('ConsoleChromeApi')) {
    chrome = chrome.replace(
        "import {",
        "import { ActionButton } from '../ui/index.js';\nimport { type BoundCommand } from '@flybyme/mesh-web';\nimport {"
    );

    chrome += `
export interface NavItem {
    readonly id: string;
    readonly label: string;
    readonly command: BoundCommand<unknown, unknown>;
}

export const CONSOLE_CHROME = 'console.chrome';

export interface ConsoleChromeApi {
    readonly addNav: (item: NavItem) => void;
}
`;

    // We can't implement it cleanly in Extension without a Registrar for ActionButton, but wait!
    // ActionButton requires a Registrar. An Extension does not have one!
    // But wait! If we don't use ActionButton, we can just use element('Button', { intents: ... })
    // And check command.available() manually!
}
fs.writeFileSync('src/chrome/chrome.ts', chrome);
