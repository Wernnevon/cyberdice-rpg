import type { Sides } from '../types/dice';
import { COLORS } from '../utils/geometry';

// Faux-3D polyhedra in a 64×64 box: [points, shade] where shade <1 lightens, >1 darkens.
const SHAPES: Record<Exclude<Sides, 100>, { ty: number; polys: [string, number][] }> = {
  4: { ty: 38, polys: [['32,4 4,56 36,40', 0], ['32,4 36,40 60,56', 1], ['4,56 60,56 36,40', 2]] },
  6: { ty: 36, polys: [['32,6 58,19 32,32 6,19', 0], ['6,19 32,32 32,60 6,47', 1], ['32,32 58,19 58,47 32,60', 2]] },
  8: { ty: 30, polys: [['32,2 4,32 28,38', 0], ['32,2 28,38 60,32', 1], ['4,32 32,62 28,38', 1.6], ['28,38 32,62 60,32', 2.2]] },
  10: { ty: 28, polys: [['32,2 4,26 32,42', 0], ['32,2 32,42 60,26', 1], ['4,26 32,62 32,42', 1.6], ['32,42 32,62 60,26', 2.2]] },
  12: {
    ty: 34,
    polys: [
      ['32,3 60,23 46,28 32,18', 0.9], ['60,23 50,58 41,45 46,28', 2], ['50,58 14,58 23,45 41,45', 2.4],
      ['14,58 4,23 18,28 23,45', 1.4], ['4,23 32,3 32,18 18,28', 0.5], ['32,18 46,28 41,45 23,45 18,28', 0],
    ],
  },
  20: {
    ty: 34,
    polys: [
      ['32,3 57,17 32,16', 0.6], ['32,3 32,16 7,17', 0.4], ['57,17 48,42 32,16', 1], ['57,17 57,47 48,42', 1.8],
      ['7,17 32,16 16,42', 0.8], ['7,17 16,42 7,47', 1.2], ['7,47 16,42 32,61', 1.8], ['16,42 48,42 32,61', 1.6],
      ['48,42 57,47 32,61', 2.4], ['32,16 48,42 16,42', 0],
    ],
  },
};

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const to = k < 1 ? 255 : 0;
  const a = k < 1 ? (1 - k) * 0.5 : Math.min(0.75, (k - 1) * 0.34);
  return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * a)).join(',')})`;
}

export type DieState = 'max' | 'min' | 'drop' | undefined;

const FILTER = {
  max: 'drop-shadow(0 0 10px #FFD60A) drop-shadow(3px 4px 0 #0B0B10)',
  min: 'drop-shadow(0 0 10px #FF2E4D) drop-shadow(3px 4px 0 #0B0B10)',
  drop: 'grayscale(1) opacity(0.55)',
};

type Props = { sides: Sides; value?: number | string; size?: number; tilt?: number; state?: DieState };

/** Decorative unless it shows a value (then it carries an accessible label). */
export function DieIcon({ sides, value, size = 48, tilt = 0, state }: Props) {
  const shape = SHAPES[sides === 100 ? 10 : sides];
  const base = state === 'drop' ? '#5A5A6E' : COLORS[sides];
  const text = value === undefined ? '' : String(value);
  return (
    <svg
      width={size}
      height={size}
      viewBox="-4 -4 72 72"
      style={{ transform: `rotate(${tilt}deg)`, filter: state ? FILTER[state] : 'drop-shadow(3px 4px 0 #0B0B10)', flexShrink: 0 }}
      {...(text ? { role: 'img', 'aria-label': `d${sides}: ${text}` } : { 'aria-hidden': true })}
    >
      {shape.polys.map(([points, k], i) => (
        <polygon key={i} points={points} fill={shade(base, k)} stroke="#0B0B10" strokeWidth={2.6} strokeLinejoin="round" />
      ))}
      {text && (
        <text
          x={32}
          y={shape.ty}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Russo One', sans-serif"
          fontSize={text.length > 2 ? 16 : 22}
          fill="#fff"
          stroke="#0B0B10"
          strokeWidth={5}
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {text}
        </text>
      )}
      {state === 'drop' && (
        <>
          <line x1={2} y1={62} x2={62} y2={2} stroke="#0B0B10" strokeWidth={9} strokeLinecap="round" />
          <line x1={2} y1={62} x2={62} y2={2} stroke="#FF2E4D" strokeWidth={5} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
