const fs = require('fs');
let chrome = fs.readFileSync('src/chrome/chrome.ts', 'utf8');

// Replace the `tabs` with a sidebar that shows nav items
chrome = chrome.replace(
    "export class ConsoleChrome implements Extension<typeof NEEDS, readonly [], typeof PAGE_CHROME> {",
    "export class ConsoleChrome implements Extension<typeof NEEDS, readonly [], typeof PAGE_CHROME> {"
);

chrome = chrome.replace(
    "activate(cx: Context<typeof NEEDS, readonly []>): PageChrome {",
    `activate(cx: Context<typeof NEEDS, readonly []>): PageChrome & { api: ConsoleChromeApi } {
        const navItems = cx.state.signal<readonly NavItem[]>([]);
        const api: ConsoleChromeApi = {
            addNav: (item) => navItems.set([...navItems(), item])
        };

        const sidebar = (): Node => element('Stack', {
            props: { class: 'console-sidebar' },
            children: [
                each(
                    navItems,
                    (i) => i.id,
                    (i) => {
                        const item = i();
                        const avail = item.command.available?.();
                        const can = avail ? avail.can : true;
                        
                        return element('Button', {
                            props: { 
                                class: 'console-sidebar-item', 
                                type: 'button',
                                disabled: !can ? 'disabled' : undefined,
                                title: avail && !avail.can ? avail.detail ?? avail.why : undefined
                            },
                            intents: can ? { activate: { action: command(item.command.action) } } : undefined,
                            children: [text(item.label)]
                        });
                    }
                )
            ]
        });
`
);

chrome = chrome.replace(
    "return {",
    "return { api,"
);

chrome = chrome.replace(
    "tabs(chrome),",
    "tabs(chrome),\n                    sidebar(),"
);

fs.writeFileSync('src/chrome/chrome.ts', chrome);
