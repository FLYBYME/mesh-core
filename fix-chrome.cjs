const fs = require('fs');

let chrome = fs.readFileSync('src/chrome/chrome.ts', 'utf8');

// Add imports
chrome = chrome.replace(
    "import {",
    "import { ActionButton } from '../ui/index.js';\nimport { CONSOLE_CHROME, type ConsoleChromeApi, type NavItem } from './contract.js';\nimport {"
);

// Update provides
chrome = chrome.replace(
    "readonly provides = PAGE_CHROME;",
    "readonly provides = { ...PAGE_CHROME, ...{ [CONSOLE_CHROME]: CONSOLE_CHROME } } as const;"
);

// Update class implements
chrome = chrome.replace(
    "implements Extension<typeof NEEDS, readonly [], typeof PAGE_CHROME>",
    "implements Extension<typeof NEEDS, readonly [], typeof PAGE_CHROME | typeof CONSOLE_CHROME>"
);

// Update activate signature
chrome = chrome.replace(
    "activate(cx: Context<typeof NEEDS, readonly []>): PageChrome {",
    `activate(cx: Context<typeof NEEDS, readonly []>): PageChrome & { api: ConsoleChromeApi } {
        const navItems = cx.state.signal<readonly NavItem[]>([]);
        const api: ConsoleChromeApi = {
            addNav: (item) => navItems.set([...navItems(), item])
        };
        
        const navSidebar = (): Node => element('Stack', {
            props: { class: 'console-nav' },
            children: [
                each(
                    navItems,
                    (i) => i.id,
                    (i) => element('Row', {
                        props: { class: 'console-nav-item' },
                        children: [
                            ActionButton({
                                on: cx,
                                command: i().command,
                            })
                        ]
                    })
                )
            ]
        });
`
);

// Add navSidebar to render
chrome = chrome.replace(
    "tabs(chrome),",
    "tabs(chrome),\n                    element('Row', { props: { class: 'console-body', style: 'display:flex;flex:1;min-height:0' }, children: [ navSidebar(), element('Stack', { props: { style: 'flex:1;min-height:0' }, children: ["
);

chrome = chrome.replace(
    "chrome.host(),",
    "chrome.host(),\n                    ] }) ] }),"
);

// Return api
chrome = chrome.replace(
    "return {",
    "return { api,"
);

fs.writeFileSync('src/chrome/chrome.ts', chrome);
