export * from './chrome.js';

import './chrome.css';

/**
 * **The default export is what the kernel loads.**
 *
 * A part's entry is imported and its default export constructed -- `boot.js` does
 * `import part0 from '/_a/…/index.js'` -- so an entry with only named exports fails at module
 * evaluation with `does not provide an export named 'default'`, before anything on the page runs.
 * `auth/index.ts` already carries this exact comment, for the exact same reason: this file had no
 * entry point at all before now, so nothing had ever composed chrome into a site.
 */
export { ConsoleChrome as default } from './chrome.js';
