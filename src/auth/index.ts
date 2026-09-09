/**
 * The auth Extension.
 *
 * Exported, not installed. spec/extension.md §7 puts it under **site-supplied**: a site decides
 * whether it has accounts at all, and a blog that signs nobody in should not be carrying a session.
 * A site that wants one declares `new AuthExtension(...)` in its manifest like any other Extension.
 */

export * from './extension.js';

/**
 * **The default export is what the kernel loads.**
 *
 * A part's entry is imported and its default export constructed — `boot.js` does
 * `import part0 from '/_a/…/index.js'` — so an entry with only named exports fails at module
 * evaluation with `does not provide an export named 'default'`, before anything on the page runs.
 * The whole site is blank, and the message names a content-addressed URL rather than this file.
 *
 * This file had only `export * from './extension.js'`, which was never exercised because nothing had
 * composed auth into a site until now. `identity` and flowboard both `export default class` at the
 * point of definition, which is why they were fine and this was not.
 */
export { AuthExtension as default } from './extension.js';
