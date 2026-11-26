import type { CSSProperties } from 'react';
import type { Roll } from '../types/dice';
import { useRoll } from '../hooks/useRoll';
import { formatTime, t } from '../i18n/t';
import { DieIcon } from './DieIcon';
import { breakdown, pretty } from '../utils/format';
import s from './Screen.module.css';

/** RPG sense of crit/fail: a kept natural 20 or natural 1 on a d20. */
function verdict(r: Roll) {
  const d20 = r.dice.filter((d) => d.kept && d.sides === 20);
  if (d20.some((d) => d.value === 20)) return 'crit' as const;
  if (d20.some((d) => d.value === 1)) return 'fail' as const;
}

type Props = { onBack: () => void; onReroll: (notation: string) => void };

export function History({ onBack, onReroll }: Props) {
  const { state, clear } = useRoll();
  return (
    <div className={s.screen}>
      <header className={s.header}>
        <button className="iconBtn" onClick={onBack} aria-label={t('back')}>
          <Back />
        </button>
        <h1 className="tag" style={{ '--tag-bg': 'var(--yellow)', '--tag-fg': 'var(--ink)', '--tag-shadow': 'var(--red)' } as CSSProperties}>
          {t('history')}
        </h1>
        <span className={s.spacer} />
        {state.history.length > 0 && (
          <button className={s.textBtn} onClick={clear}>
            {t('clear')}
          </button>
        )}
      </header>

      <p className={s.note}>{t('sessionNote', { n: state.history.length })}</p>

      {state.history.length === 0 ? (
        <p className={s.empty}>{t('empty')}</p>
      ) : (
        <ol className={s.list}>
          {state.history.map((r, i) => {
            const v = verdict(r);
            const icon = r.dice.reduce((a, d) => (d.sides > a ? d.sides : a), r.dice[0].sides);
            return (
              <li key={r.id} className={s.row} data-verdict={v}>
                <DieIcon sides={icon} value={r.total} size={56} tilt={i % 2 ? 5 : -6} state={v === 'crit' ? 'max' : v === 'fail' ? 'min' : undefined} />
                <div className={s.rowBody}>
                  <div className={s.rowTitle}>
                    <span>{pretty(r.notation)}</span>
                    {v && <span className={s[v]}>{t(v)}</span>}
                  </div>
                  <span className={s.meta}>{breakdown(r)}</span>
                  <time className={s.time} dateTime={new Date(r.at).toISOString()}>
                    {formatTime(r.at)}
                  </time>
                </div>
                <button className={s.reroll} onClick={() => onReroll(r.notation)} aria-label={t('reroll', { f: pretty(r.notation) })}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                    <path d="M21 3v5h-5" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export const Back = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
