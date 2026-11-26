import { useEffect, useState } from 'react';
import { sound, UNLOCK_EVENTS } from './audio/engine';
import { DiceScene } from './components/DiceScene';
import { Formula } from './components/Formula';
import { History } from './components/History';
import { Result } from './components/Result';
import { Tray, type Counts } from './components/Tray';
import { RollProvider, useRoll } from './hooks/useRoll';
import { useShake } from './hooks/useShake';
import { canShakeRoll } from './utils/shakeGesture';
import { t } from './i18n/t';
import { buildNotation } from './utils/dice';
import { loadMuted, saveMuted } from './utils/sound';
import { loadFlag, saveFlag } from './utils/prefs';
import s from './App.module.css';

type View = 'table' | 'history' | 'formula';

const SHAKE_KEY = 'shake-on';

// localStorage itself can throw (blocked site data), not just its methods.
const store = (() => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
})();

function Layout() {
  const { roll, result, state, shake: holdDice, throwShake, cancelShake } = useRoll();
  const [view, setView] = useState<View>('table');
  const [counts, setCounts] = useState<Counts>({ 20: 1 });
  const [mod, setMod] = useState(0);
  const [custom, setCustom] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);
  const [muted, setMuted] = useState(() => loadMuted(store));

  useEffect(() => {
    sound.setMuted(muted);
    saveMuted(store, muted);
  }, [muted]);

  // iOS only starts (and resumes after backgrounding) audio inside a user gesture.
  useEffect(() => {
    const unlock = () => sound.unlock();
    for (const e of UNLOCK_EVENTS) window.addEventListener(e, unlock, true);
    return () => UNLOCK_EVENTS.forEach((e) => window.removeEventListener(e, unlock, true));
  }, []);

  useEffect(() => {
    if (result) sound.reveal(result);
  }, [result]);

  const notation = custom ?? buildNotation(counts, mod);
  const rolling = !!state.active && !result;

  const doRoll = (n = notation) => {
    if (n && !rolling && roll(n)) setView('table');
  };
  const [shakeWanted] = useState(() => loadFlag(store, SHAKE_KEY));
  const shake = useShake(
    { start: () => holdDice(notation), roll: throwShake, cancel: cancelShake },
    shakeWanted,
    () => canShakeRoll(view, rolling, !!notation),
  );
  const shaking = !!state.shaking;
  useEffect(() => sound.setHolding(shaking), [shaking]);
  const toggleShake = async () => {
    if (shake.on) {
      shake.disable();
      return saveFlag(store, SHAKE_KEY, false);
    }
    const ok = await shake.enable();
    setShakeError(!ok);
    if (ok) saveFlag(store, SHAKE_KEY, true);
  };

  return (
    <div className={s.app}>
      <header className={s.header}>
        <h1 className="tag">{t('title')}</h1>
        <div className={s.headerActions}>
          <button className="iconBtn" aria-pressed={!muted} onClick={() => setMuted((m) => !m)} aria-label={t('sound')}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9h4l5-4v14l-5-4H4z" />
              {muted ? <path d="M17 9l5 5M22 9l-5 5" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
            </svg>
          </button>
          {shake.supported && (
            <button className="iconBtn" data-shake-toggle aria-pressed={shake.on} onClick={toggleShake} aria-label={shake.on ? t('shakeOn') : t('shakeOff')} title={shakeError ? t('shakeDenied') : undefined}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="7" y="3" width="10" height="18" rx="2" />
                <path d="M3 8v8M21 8v8" />
              </svg>
            </button>
          )}
          <button className="iconBtn" onClick={() => setView('history')} aria-label={t('openHistory')}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l3 2" />
            </svg>
          </button>
        </div>
      </header>

      <main className={s.table}>
        <div className={s.scene}>
          <DiceScene />
        </div>
        <Result roll={result} rolling={rolling} shaking={shaking} ready={!!notation} />
      </main>

      <Tray
        counts={counts}
        mod={mod}
        custom={custom}
        notation={notation}
        rolling={rolling}
        hasResult={!!result}
        onCounts={setCounts}
        onMod={setMod}
        onClearCustom={() => setCustom(null)}
        onFormula={() => setView('formula')}
        onRoll={() => doRoll()}
      />

      {view === 'history' && <History onBack={() => setView('table')} onReroll={(n) => doRoll(n)} />}
      {view === 'formula' && (
        <Formula
          initial={notation}
          onBack={() => setView('table')}
          onRoll={(n) => {
            setCustom(n);
            doRoll(n);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <RollProvider>
      <Layout />
    </RollProvider>
  );
}
