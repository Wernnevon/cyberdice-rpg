import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import type { Sides } from '../types/dice';
import { t } from '../i18n/t';
import { COLORS } from '../utils/geometry';
import { SIDES } from '../utils/dice';
import { pretty } from '../utils/format';
import { DieIcon } from './DieIcon';
import s from './Tray.module.css';

export type Counts = Partial<Record<Sides, number>>;

type Props = {
  counts: Counts;
  mod: number;
  custom: string | null;
  notation: string;
  rolling: boolean;
  hasResult: boolean;
  onCounts: Dispatch<SetStateAction<Counts>>;
  onMod: (m: number) => void;
  onClearCustom: () => void;
  onFormula: () => void;
  onRoll: () => void;
};

const MAX_PER_DIE = 10;
const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);

export function Tray({ counts, mod, custom, notation, rolling, hasResult, onCounts, onMod, onClearCustom, onFormula, onRoll }: Props) {
  // functional update: fast double taps must both count
  const bump = (sides: Sides, delta: number) =>
    onCounts((c) => ({ ...c, [sides]: Math.max(0, Math.min(MAX_PER_DIE, (c[sides] ?? 0) + delta)) }));
  const add = (sides: Sides) => {
    if (custom) {
      onClearCustom();
      onCounts({ [sides]: 1 });
    } else bump(sides, 1);
  };
  const chips = SIDES.filter((n) => counts[n]);
  const ready = !!notation;

  return (
    <section className={s.tray} aria-label={t('formula')}>
      <div className={s.chipsRow}>
        {ready ? (
          <>
            <div className={s.chips}>
              {custom ? (
                <button className={s.chip} style={{ '--c': 'var(--cyan)' } as CSSProperties} onClick={onClearCustom} aria-label={t('remove', { item: custom })}>
                  {pretty(custom)} <X />
                </button>
              ) : (
                chips.map((n) => (
                  <button
                    key={n}
                    className={s.chip}
                    style={{ '--c': COLORS[n] } as CSSProperties}
                    onClick={() => bump(n, -1)}
                    aria-label={t('remove', { item: `d${n}` })}
                  >
                    {counts[n]}d{n} <X />
                  </button>
                ))
              )}
            </div>
            <button
              className={s.clear}
              onClick={() => {
                onClearCustom();
                onCounts({});
                onMod(0);
              }}
            >
              {t('clear')}
            </button>
          </>
        ) : (
          <span className={s.none}>{t('noneSelected')}</span>
        )}
      </div>

      <div className={s.grid}>
        {SIDES.map((n) => {
          const c = custom ? 0 : (counts[n] ?? 0);
          return (
            <button
              key={n}
              className={s.tile}
              data-on={c > 0}
              style={{ '--c': COLORS[n] } as CSSProperties}
              onClick={() => add(n)}
              aria-label={t('add', { die: `d${n}` })}
            >
              <DieIcon sides={n} size={36} />
              <span>d{n}</span>
              {c > 0 && <span className={s.badge}>×{c}</span>}
            </button>
          );
        })}
        <button className={`${s.tile} ${s.formulaTile}`} onClick={onFormula}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
          </svg>
          <span>{t('formula')}</span>
        </button>
      </div>

      <div className={s.actions}>
        <div className={s.mod} role="group" aria-label={t('modLabel')} data-disabled={!!custom}>
          <button onClick={() => onMod(Math.max(-99, mod - 1))} aria-label={t('modDec')} disabled={!!custom}>
            −
          </button>
          <div className={s.modValue}>
            <span>{t('mod')}</span>
            <strong>{signed(mod)}</strong>
          </div>
          <button onClick={() => onMod(Math.min(99, mod + 1))} aria-label={t('modInc')} disabled={!!custom}>
            +
          </button>
        </div>
        <button className={s.roll} onClick={onRoll} disabled={!ready || rolling}>
          <strong>{!ready ? t('choose') : rolling ? t('rolling') : hasResult ? t('again') : t('roll')}</strong>
          <span>{ready ? pretty(notation) : t('chooseSub')}</span>
        </button>
      </div>
    </section>
  );
}

const X = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
