/** Die types the dice box knows how to build. */
export const SUPPORTED_FACES = [4, 6, 8, 10, 12, 20, 100] as const;

/** Upper bound on dice per throw -- enough for any roll, cheap enough to simulate. */
export const MAX_DICE = 10;

export interface Notation {
  count: number;
  faces: number;
}

/**
 * Parses standard dice notation ("d20", "3d6").
 *
 * Returns null for anything the dice box cannot actually roll, so a typo can
 * never leave the UI stuck waiting for a result that will never arrive.
 */
export const parseNotation = (notation: string): Notation | null => {
  const parsed = /^\s*(\d+)?\s*d\s*(\d+)\s*$/i.exec(notation);
  if (!parsed) return null;

  const count = parsed[1] === undefined ? 1 : Number.parseInt(parsed[1], 10);
  const faces = Number.parseInt(parsed[2], 10);

  if (!Number.isFinite(count) || count < 1 || count > MAX_DICE) return null;
  if (!SUPPORTED_FACES.includes(faces as (typeof SUPPORTED_FACES)[number])) return null;

  return { count, faces };
};
