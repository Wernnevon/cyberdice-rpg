import type { CSSProperties } from 'react';
import { t } from '../i18n/t';
import { THEMES, type Theme } from '../utils/themes';
import { themeStore, useTheme } from '../utils/themeStore';
import { DieIcon } from './DieIcon';
import { Back } from './History';
import s from './Screen.module.css';

const PREVIEW = [6, 8, 20] as const;

// CSS approximation of the code patterns; images lie over the body color.
const CODE_SWATCH = {
  ivory: 'repeating-linear-gradient(100deg, transparent 0 5px, rgb(122 106 79 / 0.25) 5px 7px)',
  shonen: 'repeating-conic-gradient(rgb(255 255 255 / 0.45) 0deg 4deg, transparent 4deg 18deg)',
};

// The gold image is nearly flat: the same light and shadow bands as the die faces (faceTexture.ts).
const GOLD_BANDS = 'linear-gradient(135deg, #6b430066, #fff6c866, #8a5a0066, #fff6c866, #6b430066)';

function swatch({ id, bodies, texture }: Theme): CSSProperties {
  const image = !texture ? undefined : texture.kind === 'code' ? CODE_SWATCH[texture.pattern] : `url(${texture.src})`;
  return {
    backgroundColor: bodies[20],
    backgroundImage: id === 'gold' ? `${GOLD_BANDS}, ${image}` : image,
    backgroundSize: texture?.kind === 'image' ? 'cover' : texture?.kind === 'tile' ? '24px' : undefined,
    // multiply hides white lines, so code patterns and the gold bands lie on top as they are
    backgroundBlendMode: texture?.kind === 'code' ? 'normal' : id === 'gold' ? 'normal, multiply' : 'multiply',
  };
}

export function ThemeScreen({ onBack }: { onBack: () => void }) {
  const active = useTheme().id;
  return (
    <div className={s.screen}>
      <header className={s.header}>
        <button className="iconBtn" onClick={onBack} aria-label={t('back')}>
          <Back />
        </button>
        <h1 className="tag">{t('themes')}</h1>
      </header>

      <ul className={`${s.list} ${s.themes}`}>
        {THEMES.map((theme) => (
          <li key={theme.id}>
            <button className={`${s.row} ${s.theme}`} aria-pressed={theme.id === active} onClick={() => themeStore.set(theme.id)}>
              <span className={s.swatch} style={swatch(theme)} aria-hidden="true" />
              <span className={s.rowBody}>
                <span className={s.rowTitle}>{t(`theme_${theme.id}`)}</span>
              </span>
              {PREVIEW.map((sides) => (
                <DieIcon key={sides} sides={sides} size={36} theme={theme} />
              ))}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
