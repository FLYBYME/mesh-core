/**
 * Browser tests for this part.
 *
 * One import and one call: resolving `@flybyme/mesh-web` to exactly one copy, a real Chrome rather
 * than jsdom, and a viewport large enough that a window is not clamped to nothing are all the
 * framework's knowledge, not this repository's.
 */

import { definePartBrowserConfig } from '@flybyme/mesh-web/testing/config';

export default definePartBrowserConfig();
