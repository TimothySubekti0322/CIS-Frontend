/**
 * Route constants with no component or icon imports, so `middleware.ts` can
 * share them: middleware runs in the Edge runtime, and importing `nav.ts`
 * there would drag the whole icon library into that bundle.
 */

/**
 * Where an authenticated user lands. US66 puts the Overview first in the
 * sidebar, so it is also the product's home.
 */
export const HOME_HREF = "/overview";
