export type Sides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export type DiceTerm = {
  sign: 1 | -1;
  count: number;
  sides: Sides;
  keep?: { mode: 'h' | 'l'; n: number };
};

/** Parsed "4d6kh3+1d8-2". */
export type Expression = { terms: DiceTerm[]; modifier: number };

/** One physical body on the table. A d100 is two d10 bodies (tens + units). */
export type DieSpec = {
  id: string;
  term: number; // index in Expression.terms
  group: number; // index of the logical die within the term (pairs d100 bodies)
  sides: Exclude<Sides, 100>;
  role?: 'tens' | 'units';
};

export type DieResult = { sides: Sides; value: number; kept: boolean; sign: 1 | -1 };

export type Roll = {
  id: string;
  notation: string;
  dice: DieResult[];
  modifier: number;
  total: number;
  at: number;
};

export type ActiveRoll = {
  id: string;
  notation: string;
  expr: Expression;
  dice: DieSpec[];
  values: Record<string, number>; // DieSpec.id -> face read from physics
};

export type State = { active: ActiveRoll | null; history: Roll[] };
