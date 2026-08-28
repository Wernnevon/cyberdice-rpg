import { DiceResultT, DiceDataT } from "../types/app.types";

/**
 * Converts a DiceResultT object to a DiceDataT object
 * @param diceResult - The dice result from the dice box
 * @returns Formatted dice data for display
 */
export function mountDiceResult(diceResult: DiceResultT): DiceDataT {
    return {
        total: diceResult.total,
        values: diceResult.rolls.map(({ value }) => value),
        diceSides: diceResult.sides,
        quantity: diceResult.qty,
    };
}
