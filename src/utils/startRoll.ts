import type { ActiveRoll } from '../types/dice';
import { parse, spawn, uid } from './dice.ts';

/** A new roll, not launched yet (dice held while shaking, SHA-01). Null when the notation is invalid. */
export function buildRoll(notation: string): ActiveRoll | null {
  const expr = parse(notation);
  if (!expr) return null;
  return { id: uid(), notation, expr, dice: spawn(expr), values: {} };
}

/** Launches a roll: the whoosh, once, with the roll's id (SPL-04.1, SHA-03.3). */
export function throwRoll(roll: ActiveRoll, launch: (rollId: string) => void): ActiveRoll {
  launch(roll.id);
  return roll;
}

/** Builds a new roll and launches it. Null when the notation is invalid. */
export function startRoll(notation: string, launch: (rollId: string) => void): ActiveRoll | null {
  const roll = buildRoll(notation);
  return roll && throwRoll(roll, launch);
}

/** Throws the held dice (SHA-03): one whoosh with their roll id, and the action that makes them the roll. */
export function throwHeld(held: ActiveRoll | null, launch: (rollId: string) => void): { type: 'throw' } | null {
  if (!held) return null;
  throwRoll(held, launch);
  return { type: 'throw' };
}
