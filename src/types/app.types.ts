/** One die that came to rest. */
export interface RollT {
    sides: number;
    value: number;
}

/** The outcome of a single throw, as produced by the dice box. */
export interface DiceResultT {
    qty: number;
    sides: number;
    rolls: RollT[];
    total: number;
}

/** The same outcome, flattened for the output panel. */
export interface DiceDataT {
    total: number;
    /** Every die's landed value, in throw order. */
    values: number[];
    diceSides: number;
    quantity: number;
}
