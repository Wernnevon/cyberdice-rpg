import type { CSSProperties } from 'react';
import type { Roll } from '../types/dice';
import { t } from '../i18n/t';
import { breakdown, pretty } from '../utils/format';
import { DieIcon, type DieState } from './DieIcon';
import s from './Result.module.css';

const TILTS = [-9, 7, -4, 10, -7, 5];

type Props = { roll: Roll | null; rolling: boolean; shaking: boolean; ready: boolean };

export function Result({ roll, rolling, shaking, ready }: Props) {
  if (shaking) return null; // the held dice are the whole picture (SHA-01.4)
  if (rolling) {
    return (
      <div className={s.overlay} aria-live="polite">
        <span className={`tag ${s.corner}`} style={{ '--tag-bg': 'var(--cyan)', '--tag-fg': 'var(--ink)', '--tag-shadow': 'var(--ink)' } as CSSProperties}>
          {t('rolling')}
        </span>
      </div>
    );
  }

  if (!roll) {
    return (
      <div className={`${s.overlay} ${s.center}`}>
        <div className={s.hintDice}>
          <DieIcon sides={6} size={64} tilt={-14} />
          <DieIcon sides={20} size={96} tilt={6} />
          <DieIcon sides={8} size={60} tilt={12} />
        </div>
        <p className={s.hintTitle}>{ready ? t('readyTitle') : t('emptyTitle')}</p>
        <p className={s.hintBody}>{ready ? t('readyBody') : t('emptyBody')}</p>
      </div>
    );
  }

  const size = roll.dice.length <= 3 ? 64 : roll.dice.length <= 6 ? 52 : 36;
  return (
    <div className={s.overlay} aria-live="polite">
      <span className={`tag ${s.corner}`} style={{ '--tag-bg': 'var(--yellow)', '--tag-fg': 'var(--ink)', '--tag-shadow': 'var(--ink)' } as CSSProperties}>
        {t('result')}
      </span>
      <div className={s.burst}>
        <output className={s.total}>{roll.total}</output>
      </div>
      <p className={s.strip}>
        {pretty(roll.notation)} = {breakdown(roll)}
      </p>
      <ul className={s.dice} tabIndex={0} aria-label={t('diceList')}>
        {roll.dice.map((d, i) => {
          const state: DieState = !d.kept ? 'drop' : d.value === d.sides ? 'max' : d.value === 1 ? 'min' : undefined;
          return (
            <li key={i}>
              <DieIcon sides={d.sides} value={d.value} size={size} tilt={TILTS[i % TILTS.length]} state={state} />
              {state === 'max' && <span className={`${s.sticker} ${s.crit}`}>{t('crit')}</span>}
              {state === 'min' && <span className={`${s.sticker} ${s.fail}`}>{t('fail')}</span>}
              {state === 'drop' && <span className={`${s.sticker} ${s.out}`}>{t('out')}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
