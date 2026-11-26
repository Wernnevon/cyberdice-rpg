import { useState } from 'react';
import { DiceScene } from './components/DiceScene';
import { Formula } from './components/Formula';
import { History } from './components/History';
import { Result } from './components/Result';
import { Tray, type Counts } from './components/Tray';
import { RollProvider, useRoll } from './hooks/useRoll';
import { useShake } from './hooks/useShake';
import { t } from './i18n/t';
import { buildNotation } from './utils/dice';
import s from './App.module.css';

type View = 'table' | 'history' | 'formula';

function Layout() {
  const { roll, result, state } = useRoll();
  const [view, setView] = useState<View>('table');
  const [counts, setCounts] = useState<Counts>({ 20: 1 });
  const [mod, setMod] = useState(0);
  const [custom, setCustom] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);

  const notation = custom ?? buildNotation(counts, mod);
  const rolling = !!state.active && !result;

  const doRoll = (n = notation) => {
    if (n && !rolling && roll(n)) setView('table');
  };
  const shake = useShake(() => view === 'table' && doRoll());
  const toggleShake = async () => {
    if (shake.on) return shake.disable();
    setShakeError(!(await shake.enable()));
  };

  return (
    <div className={s.app}>
      <header className={s.header}>
        <h1 className="tag">{t('title')}</h1>
        <div className={s.headerActions}>
          {shake.supported && (
            <button className="iconBtn" aria-pressed={shake.on} onClick={toggleShake} aria-label={shake.on ? t('shakeOn') : t('shakeOff')} title={shakeError ? t('shakeDenied') : undefined}>
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
        <Result roll={result} rolling={rolling} ready={!!notation} />
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
