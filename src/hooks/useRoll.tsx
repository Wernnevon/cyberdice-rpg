import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type { ActiveRoll, State } from '../types/dice';
import { resolve } from '../utils/dice';
import { startRoll } from '../utils/startRoll';
import { sound } from '../audio/engine';

const HISTORY_LIMIT = 50;

type Action =
  | { type: 'roll'; active: ActiveRoll }
  | { type: 'settled'; rollId: string; dieId: string; value: number }
  | { type: 'clear' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'roll':
      return { ...state, active: action.active };
    case 'settled': {
      const a = state.active;
      if (!a || a.id !== action.rollId || a.values[action.dieId] !== undefined) return state;
      const active = { ...a, values: { ...a.values, [action.dieId]: action.value } };
      const done = resolve(a.id, a.notation, a.expr, a.dice, active.values);
      return { active, history: done ? [done, ...state.history].slice(0, HISTORY_LIMIT) : state.history };
    }
    case 'clear':
      return { ...state, history: [] };
  }
}

function useRollState() {
  const [state, dispatch] = useReducer(reducer, { active: null, history: [] });

  /** Returns false when the notation is invalid. */
  const roll = useCallback((notation: string) => {
    const active = startRoll(notation, sound.launch); // every roll, button or shake
    if (!active) return false;
    dispatch({ type: 'roll', active });
    return true;
  }, []);
  const settle = useCallback(
    (rollId: string, dieId: string, value: number) => dispatch({ type: 'settled', rollId, dieId, value }),
    [],
  );
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  const result = state.active && state.history[0]?.id === state.active.id ? state.history[0] : null;
  return useMemo(() => ({ state, result, roll, settle, clear }), [state, result, roll, settle, clear]);
}

const Ctx = createContext<ReturnType<typeof useRollState> | null>(null);

export function RollProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useRollState()}>{children}</Ctx.Provider>;
}

export function useRoll() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRoll must be used inside <RollProvider>');
  return ctx;
}
