/**
 * **@flybyme/mesh-core — the parts, and the vocabulary they are drawn with.**
 *
 * mesh-web is the kernel and nothing else. What a site *decides about* lives here: the auth
 * Extension that holds the session, the UI vocabulary every part renders with, and the applications
 * the platform is operated through.
 *
 * There was no barrel and no `exports` in `package.json`, so `import { AUTH } from '@flybyme/mesh-core'`
 * did not resolve at all — every consumer had to reach into `src/auth/index.js` by path, which makes
 * the package's public surface whatever anybody happened to import. Added when flowboard became the
 * first outside consumer.
 *
 * **What is deliberately not re-exported:** the applications. `identity` and any part that follows it
 * are `export default class` entries a *site manifest* names by path — a site composes them, code
 * does not import them. Re-exporting one would invite `new IdentityApp()` in a file that has no
 * business constructing a part.
 */

export * from './auth/index.js';
export * from './ui/index.js';
