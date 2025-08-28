export interface DiceResultT {
    qty: number;
    modifier: number;
    sides: number;
    rolls: RollT[];
    id: number;
    value: number;
}

export interface RollT {
    sides: number;
    dieType: string;
    groupId: number;
    rollId: number;
    theme: string;
    themeColor: string;
    value: number;
}

export interface DiceDataT {
    total: number;
    dices: string;
    diceSides: number;
    quantity: number;
}
