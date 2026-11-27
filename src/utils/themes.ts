// Ready-made dice themes: pure data and rules (no React, three or DOM).
import type { DieSpec, Sides } from '../types/dice';

export type ThemeId = 'neon' | 'ivory' | 'marble' | 'gold' | 'crystal' | 'shonen' | 'manga' | 'sakura';

export type Theme = {
  id: ThemeId;
  bodies: Record<Sides, string>; // [100] is the d100 units die
  tens: string;
  label: { fill: string; outline: string };
  edge: string;
  font: string; // Google Fonts family name
  finish: 'toon' | 'gloss' | 'metal' | 'glass';
  texture:
    | null
    | { kind: 'code'; pattern: 'ivory' | 'shonen' }
    | { kind: 'image'; src: string }
    | { kind: 'tile'; src: string };
};

const bodies = (d4: string, d6: string, d8: string, d10: string, d12: string, d20: string, d100: string) => ({
  4: d4, 6: d6, 8: d8, 10: d10, 12: d12, 20: d20, 100: d100,
});
const plain = (c: string) => bodies(c, c, c, c, c, c, c);

export const THEMES: readonly Theme[] = [
  {
    id: 'neon',
    bodies: bodies('#FF2E4D', '#FFD60A', '#22D3EE', '#A855F7', '#FF7A1A', '#FF3FD8', '#3DFF8B'),
    tens: '#178F4A',
    label: { fill: '#FFFFFF', outline: '#0B0B10' },
    edge: '#0B0B10',
    font: 'Russo One',
    finish: 'toon',
    texture: null,
  },
  {
    id: 'ivory',
    bodies: plain('#EFE6CF'),
    tens: '#CDBB94',
    label: { fill: '#2B1D12', outline: '#FFF9EA' },
    edge: '#7A6A4F',
    font: 'EB Garamond',
    finish: 'toon',
    texture: { kind: 'code', pattern: 'ivory' },
  },
  {
    id: 'marble',
    bodies: plain('#E4E6EA'),
    tens: '#8E96A3',
    label: { fill: '#1C2230', outline: '#FFFFFF' },
    edge: '#4A5160',
    font: 'Cinzel',
    finish: 'gloss',
    texture: { kind: 'image', src: '/textures/marble.jpg' },
  },
  {
    id: 'gold',
    bodies: plain('#E8B93C'),
    tens: '#A8761A',
    label: { fill: '#FFF6D0', outline: '#2A1A00' },
    edge: '#5C4308',
    font: 'Cormorant Garamond',
    finish: 'metal',
    texture: { kind: 'image', src: '/textures/gold.jpg' },
  },
  {
    id: 'crystal',
    bodies: bodies('#FF8FA3', '#FFE08A', '#8BE3F5', '#C4A1FF', '#FFB37A', '#FF9BE6', '#9CF5C4'),
    tens: '#3FA876',
    label: { fill: '#FFFFFF', outline: '#14243D' },
    edge: '#DDEBFF',
    font: 'Orbitron',
    finish: 'glass',
    texture: null,
  },
  {
    id: 'shonen',
    bodies: bodies('#E4262F', '#FFB300', '#1E7BFF', '#7B2FF7', '#FF5E00', '#E81E8C', '#12B866'),
    tens: '#0A6B3C',
    label: { fill: '#FFF200', outline: '#14080A' },
    edge: '#14080A',
    font: 'Bangers',
    finish: 'toon',
    texture: { kind: 'code', pattern: 'shonen' },
  },
  {
    id: 'manga',
    bodies: plain('#F4F4F0'),
    tens: '#9A9A96',
    label: { fill: '#0A0A0A', outline: '#FFFFFF' },
    edge: '#0A0A0A',
    font: 'Anton',
    finish: 'toon',
    texture: { kind: 'image', src: '/textures/halftone.png' },
  },
  {
    id: 'sakura',
    bodies: bodies('#F2789F', '#FFD3DD', '#A8D8EA', '#C9A7E8', '#FFB7A5', '#FF9EC4', '#B8E0B0'),
    tens: '#6FAF7A',
    label: { fill: '#FFFFFF', outline: '#6B1F45' },
    edge: '#6B1F45',
    font: 'M PLUS Rounded 1c',
    finish: 'toon',
    texture: { kind: 'tile', src: '/textures/sakura.png' },
  },
];

export function getTheme(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };

const KEY = 'dice-theme';

/** The saved theme; neon when never saved, unknown or storage is blocked. */
export function loadTheme(store: Store | undefined): ThemeId {
  try {
    const saved = store?.getItem(KEY);
    return THEMES.find((t) => t.id === saved)?.id ?? 'neon';
  } catch {
    return 'neon';
  }
}

export function saveTheme(store: Store | undefined, id: ThemeId) {
  try {
    store?.setItem(KEY, id);
  } catch {
    // blocked storage: the choice just won't survive a reload
  }
}

export function bodyColor(theme: Theme, sides: Sides, role?: DieSpec['role']): string {
  if (role === 'tens') return theme.tens;
  return theme.bodies[role ? 100 : sides];
}

export function iconColor(theme: Theme, sides: Sides, state?: string): string {
  return state === 'drop' ? '#5A5A6E' : theme.bodies[sides];
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #RRGGBB colors (1 to 21). */
export function contrast(a: string, b: string): number {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}
