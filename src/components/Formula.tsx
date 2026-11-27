import { useState, type CSSProperties, type FormEvent } from 'react';
import type { Key } from '../i18n/t';
import type { Sides } from '../types/dice';
import { t } from '../i18n/t';
import { bodyCount, MAX_BODIES, parse, range } from '../utils/dice';
import { bodyColor } from '../utils/themes';
import { useTheme } from '../utils/themeStore';
import { Back } from './History';
import s from './Screen.module.css';

const PRESETS: { code: string; name: Key; sides: Sides }[] = [
  { code: '1d20', name: 'pCheck', sides: 20 },
  { code: '2d20kh1', name: 'pAdv', sides: 8 },
  { code: '2d20kl1', name: 'pDis', sides: 4 },
  { code: '4d6kh3', name: 'pStat', sides: 6 },
  { code: 'd%', name: 'pPct', sides: 100 },
  { code: '8d6', name: 'pFire', sides: 12 },
];

const SYNTAX: [string, Key][] = [
  ['2d6', 'sDice'],
  ['+3 / −1', 'sMod'],
  ['kh3', 'sKh'],
  ['kl1', 'sKl'],
  ['d%', 'sPct'],
];

type Props = { initial: string; onBack: () => void; onRoll: (notation: string) => void };

export function Formula({ initial, onBack, onRoll }: Props) {
  const [text, setText] = useState(initial);
  const theme = useTheme();
  const expr = parse(text);
  const r = expr && range(expr);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (expr) onRoll(text.replace(/\s+/g, ''));
  };

  return (
    <form className={s.screen} onSubmit={submit}>
      <header className={s.header}>
        <button type="button" className="iconBtn" onClick={onBack} aria-label={t('back')}>
          <Back />
        </button>
        <h1 className="tag" style={{ '--tag-bg': 'var(--cyan)', '--tag-fg': 'var(--ink)', '--tag-shadow': 'var(--red)' } as CSSProperties}>
          {t('formula')}
        </h1>
      </header>

      <div className={s.body}>
        <div className={s.field}>
          <label htmlFor="formula" className={s.label}>
            {t('formulaLabel')}
          </label>
          <input
            id="formula"
            className={s.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('placeholder')}
            aria-invalid={!!text && !expr}
            aria-describedby="formula-status"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          <p id="formula-status" className={s.status} aria-live="polite">
            {text &&
              (expr && r ? (
                <>
                  <span className={s.ok}>{t('valid')}</span>
                  {t('rangeInfo', { n: bodyCount(expr), min: r.min, max: r.max })}
                </>
              ) : (
                <>
                  <span className={s.bad}>{t('invalidTag')}</span>
                  {t('invalid', { max: MAX_BODIES })}
                </>
              ))}
          </p>
        </div>

        <section className={s.section}>
          <h2>{t('shortcuts')}</h2>
          <div className={s.presets}>
            {PRESETS.map((p) => (
              <button type="button" key={p.code} className={s.preset} style={{ '--c': bodyColor(theme, p.sides) } as CSSProperties} onClick={() => setText(p.code)}>
                <strong>{p.code}</strong>
                <span>{t(p.name)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <h2>{t('howTo')}</h2>
          <dl className={s.syntax}>
            {SYNTAX.map(([code, key]) => (
              <div key={code}>
                <dt>{code}</dt>
                <dd>{t(key)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className={s.footer}>
        <button type="submit" className={s.bigRoll} disabled={!expr}>
          <strong>{t('roll')}</strong>
          <span>{text}</span>
        </button>
      </div>
    </form>
  );
}
