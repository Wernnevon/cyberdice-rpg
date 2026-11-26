import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';
import { initialRollState, rollReducer } from '../utils/rollState';
import { buildRoll, startRoll, throwRoll } from '../utils/startRoll';
import { sound } from '../audio/engine';

function useRollState() {
  const [state, dispatch] = useReducer(rollReducer, initialRollState);

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

  /** Holds the dice of `notation` on the table while the phone is shaken. Returns false when invalid. */
  const shake = useCallback((notation: string) => {
    const held = buildRoll(notation);
    if (held) dispatch({ type: 'shake', roll: held });
    return !!held;
  }, []);
  const shaking = state.shaking;
  /** Throws the held dice, with one whoosh. */
  const throwShake = useCallback(() => {
    if (!shaking) return;
    throwRoll(shaking, sound.launch);
    dispatch({ type: 'throw' });
  }, [shaking]);
  const cancelShake = useCallback(() => dispatch({ type: 'cancelShake' }), []);

  const result = state.active && state.history[0]?.id === state.active.id ? state.history[0] : null;
  return useMemo(
    () => ({ state, result, roll, settle, clear, shake, throwShake, cancelShake }),
    [state, result, roll, settle, clear, shake, throwShake, cancelShake],
  );
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
