import { DiceDataT } from "../../types";
import { dieMark } from "../../utils";
import "./styles.css";

export interface HistoryEntryT extends DiceDataT {
    /** Stable across renders, so the list can animate only the new entry. */
    id: number;
}

interface RollHistoryProps {
    entries: HistoryEntryT[];
}

/** The last few throws, newest first. */
const RollHistory = ({ entries }: RollHistoryProps) => {
    if (entries.length === 0) return null;

    return (
        <section className="roll-history" aria-label="Roll history">
            <h2 className="roll-history__title">History</h2>
            <ol className="roll-history__list">
                {entries.map(entry => {
                    const marks = entry.values.map(v => dieMark(v, entry.diceSides));
                    return (
                        <li key={entry.id} className="roll-history__entry">
                            <span className="roll-history__notation">
                                {entry.quantity}d{entry.diceSides}
                            </span>
                            <span className="roll-history__values">
                                {entry.values.length > 1 ? entry.values.join(" · ") : ""}
                            </span>
                            <span className="roll-history__badges">
                                {marks.includes("crit") && <span className="roll-history__badge roll-history__badge--crit">CRIT</span>}
                                {marks.includes("fumble") && <span className="roll-history__badge roll-history__badge--fumble">1</span>}
                            </span>
                            <strong className="roll-history__total">{entry.total}</strong>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};

export default RollHistory;
