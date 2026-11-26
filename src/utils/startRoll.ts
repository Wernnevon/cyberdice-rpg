import type { ActiveRoll } from '../types/dice';
import { parse, spawn, uid } from './dice.ts';

/** Builds a new roll and launches it (the whoosh, SPL-04.1). Null when the notation is invalid. */
export function startRoll(notation: string, launch: (rollId: string) => void): ActiveRoll | null {
  const expr = parse(notation);
  if (!expr) return null;
  const active: ActiveRoll = { id: uid(), notation, expr, dice: spawn(expr), values: {} };
  launch(active.id);
  return active;
}
