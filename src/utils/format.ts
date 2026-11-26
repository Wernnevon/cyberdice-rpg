import type { Roll } from '../types/dice';
import { t } from '../i18n/t';

/** "6 + 5 − 2  (1 fora)": kept dice and modifier. */
export function breakdown(roll: Roll) {
  const kept = roll.dice.filter((d) => d.kept);
  let out = kept.map((d, i) => (i === 0 && d.sign > 0 ? '' : d.sign > 0 ? ' + ' : ' − ') + d.value).join('');
  if (roll.modifier) out += (roll.modifier > 0 ? ' + ' : ' − ') + Math.abs(roll.modifier);
  const dropped = roll.dice.length - kept.length;
  return dropped ? `${out}  ${t('outCount', { n: dropped })}` : out;
}

export const pretty = (notation: string) => notation.replace(/\s+/g, '').replace(/([+-])/g, ' $1 ').replace(/-/g, '−').trim();
