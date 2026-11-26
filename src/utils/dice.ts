import type { DiceTerm, DieResult, DieSpec, Expression, Roll, Sides } from '../types/dice';

export const SIDES: Sides[] = [4, 6, 8, 10, 12, 20, 100];
export const MAX_BODIES = 30; // ponytail: hard cap for mobile physics perf; raise after profiling

const TERM = /^([+-])(?:(\d*)d(\d+|%)(?:k([hl])(\d+))?|(\d+))$/;

/** "2d20kh1 + d% - 3" -> Expression, or null if invalid. */
export function parse(input: string): Expression | null {
  let src = input.toLowerCase().replace(/\s+/g, '');
  if (!src) return null;
  if (!/^[+-]/.test(src)) src = '+' + src;

  const terms: DiceTerm[] = [];
  let modifier = 0;
  for (const tok of src.split(/(?=[+-])/)) {
    const m = TERM.exec(tok);
    if (!m) return null;
    const sign = m[1] === '-' ? -1 : 1;
    if (m[6] !== undefined) {
      modifier += sign * Number(m[6]);
      continue;
    }
    const count = m[2] ? Number(m[2]) : 1;
    const sides = (m[3] === '%' ? 100 : Number(m[3])) as Sides;
    if (!SIDES.includes(sides) || count < 1) return null;
    const term: DiceTerm = { sign, count, sides };
    if (m[4]) {
      const n = Number(m[5]);
      if (n < 1 || n > count) return null;
      term.keep = { mode: m[4] as 'h' | 'l', n };
    }
    terms.push(term);
  }
  if (!terms.length) return null;
  if (bodyCount({ terms, modifier }) > MAX_BODIES) return null;
  return { terms, modifier };
}

export const bodyCount = (e: Expression) =>
  e.terms.reduce((n, t) => n + t.count * (t.sides === 100 ? 2 : 1), 0);

/** One DieSpec per physical body. */
export function spawn(e: Expression, id: () => string = uid): DieSpec[] {
  return e.terms.flatMap((t, term) =>
    Array.from({ length: t.count }, (_, group): DieSpec[] =>
      t.sides === 100
        ? [
            { id: id(), term, group, sides: 10, role: 'tens' },
            { id: id(), term, group, sides: 10, role: 'units' },
          ]
        : [{ id: id(), term, group, sides: t.sides }],
    ).flat(),
  );
}

/** Combine physics readings into a Roll. Returns null until every body has a value. */
export function resolve(
  rollId: string,
  notation: string,
  e: Expression,
  dice: DieSpec[],
  values: Record<string, number>,
): Roll | null {
  if (dice.some((d) => values[d.id] === undefined)) return null;

  const results: DieResult[] = [];
  e.terms.forEach((t, ti) => {
    const vals = Array.from({ length: t.count }, (_, g) => {
      const bodies = dice.filter((d) => d.term === ti && d.group === g);
      if (t.sides !== 100) return values[bodies[0].id];
      // d10 faces are 1..10; "10" face reads as 0 / 00
      const tens = (values[bodies.find((b) => b.role === 'tens')!.id] % 10) * 10;
      const units = values[bodies.find((b) => b.role === 'units')!.id] % 10;
      return tens + units || 100;
    });
    const kept = new Set<number>();
    const order = vals.map((v, i) => [v, i]).sort((a, b) => (t.keep?.mode === 'l' ? a[0] - b[0] : b[0] - a[0]));
    order.slice(0, t.keep?.n ?? t.count).forEach(([, i]) => kept.add(i));
    vals.forEach((value, i) => results.push({ sides: t.sides, value, kept: kept.has(i), sign: t.sign }));
  });

  const total = results.reduce((s, r) => s + (r.kept ? r.sign * r.value : 0), e.modifier);
  return { id: rollId, notation, dice: results, modifier: e.modifier, total, at: Date.now() };
}

let seq = 0;
/** crypto.randomUUID needs a secure context (fails on http://<LAN-IP>), so use a counter. */
export const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** Quick builder state -> notation: {6: 2, 20: 1}, 3 -> "2d6+1d20+3". */
export function buildNotation(counts: Partial<Record<Sides, number>>, mod: number) {
  const dice = SIDES.filter((s) => counts[s]).map((s) => `${counts[s]}d${s}`).join('+');
  if (!dice) return '';
  return mod ? `${dice}${mod > 0 ? '+' : '-'}${Math.abs(mod)}` : dice;
}

/** Lowest and highest possible totals. */
export function range(e: Expression) {
  let min = e.modifier;
  let max = e.modifier;
  for (const t of e.terms) {
    const k = t.keep?.n ?? t.count;
    const lo = t.sign * k;
    const hi = t.sign * k * t.sides;
    min += Math.min(lo, hi);
    max += Math.max(lo, hi);
  }
  return { min, max };
}
