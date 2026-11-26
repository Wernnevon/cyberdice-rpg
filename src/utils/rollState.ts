import type { ActiveRoll, State } from '../types/dice';
import { resolve } from './dice.ts';

const HISTORY_LIMIT = 50;

/** `shaking`: dice held on the table while the phone is shaken, not rolled yet (SHA-01). */
export type RollState = State & { shaking: ActiveRoll | null };

export type RollAction =
  | { type: 'roll'; active: ActiveRoll }
  | { type: 'settled'; rollId: string; dieId: string; value: number }
  | { type: 'clear' }
  | { type: 'shake'; roll: ActiveRoll }
  | { type: 'throw' }
  | { type: 'cancelShake' };

export const initialRollState: RollState = { active: null, history: [], shaking: null };

export function rollReducer(state: RollState, action: RollAction): RollState {
  switch (action.type) {
    case 'roll':
      return { ...state, active: action.active, shaking: null };
    case 'settled': {
      const a = state.active;
      if (!a || a.id !== action.rollId || a.values[action.dieId] !== undefined) return state;
      const active = { ...a, values: { ...a.values, [action.dieId]: action.value } };
      const done = resolve(a.id, a.notation, a.expr, a.dice, active.values);
      return { ...state, active, history: done ? [done, ...state.history].slice(0, HISTORY_LIMIT) : state.history };
    }
    case 'clear':
      return { ...state, history: [] };
    case 'shake': // hides the result on screen; the history keeps it
      return { ...state, active: null, shaking: action.roll };
    case 'throw':
      return state.shaking ? { ...state, active: state.shaking, shaking: null } : state;
    case 'cancelShake': // back to the ready screen
      return { ...state, active: null, shaking: null };
  }
}
