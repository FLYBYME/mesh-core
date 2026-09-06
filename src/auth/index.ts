/**
 * `@flybyme/mesh-auth` — the auth Extension, as a part.
 *
 * **The default export is the constructor, not an instance.**
 *
 * That is not a style choice, and extracting this part is what made it visible. `AuthExtension` takes
 * `endpoints` and a `store` — *which* identity API a site talks to, and whether a ticket survives a
 * reload. Both are the site's decisions, not this package's, so this package cannot construct itself.
 *
 * Every part written so far is the same shape: `new ConsoleApp()`, `new ConsoleChrome()`,
 * `new AuthExtension({…})` — a host constructs them. So the rule is general, and the kernel's
 * `start()` has to carry per-part options from the site record rather than taking contributions that
 * are already built. See mesh-web roadmap A9.1c.
 *
 * Everything else is exported for whoever consumes the session: `AUTH` is the provider token an
 * Application names in `consumes`, and `AuthApi` is what it gets back.
 */

export { AuthExtension as default } from './extension.js';
export * from './extension.js';
