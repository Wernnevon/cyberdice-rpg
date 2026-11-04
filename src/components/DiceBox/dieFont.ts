import { preloadFont } from "troika-three-text";
import fontUrl from "@fontsource/rajdhani/files/rajdhani-latin-700-normal.woff?url";

/**
 * The face numbers' font, served with the app.
 *
 * Without an explicit font troika fetches one from a CDN on the first throw and
 * builds the glyphs on the spot, which froze the first roll for a fifth of a
 * second -- and left the dice blank offline.
 */
export const DIE_FONT = fontUrl;

/** Every glyph a face can carry, so the atlas is built before anyone throws. */
const DIE_GLYPHS = "0123456789.";

export const preloadDieFont = () =>
  new Promise<void>(resolve => preloadFont({ font: DIE_FONT, characters: DIE_GLYPHS }, () => resolve()));
