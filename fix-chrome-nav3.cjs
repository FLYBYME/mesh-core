const fs = require('fs');
let chrome = fs.readFileSync('src/chrome/chrome.ts', 'utf8');

chrome = chrome.replace(
    "import { ActionButton } from '../ui/index.js';\n",
    ""
);

chrome = chrome.replace(
    "intents: can ? { activate: { action: command(item.command.action) } } : undefined,",
    "...(can ? { intents: { activate: { action: command(item.command.action) } } } : {}),"
);

fs.writeFileSync('src/chrome/chrome.ts', chrome);
