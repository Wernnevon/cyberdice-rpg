import { describe, it, expect } from "vitest";
import { parseNotation, MAX_DICE, SUPPORTED_FACES } from "./notation";

describe("parseNotation", () => {
  it("defaults to a single die", () => {
    expect(parseNotation("d20")).toEqual({ count: 1, faces: 20 });
  });

  it("reads an explicit count", () => {
    expect(parseNotation("3d6")).toEqual({ count: 3, faces: 6 });
  });

  it("accepts every die type the box can build", () => {
    SUPPORTED_FACES.forEach(faces => {
      expect(parseNotation(`2d${faces}`)).toEqual({ count: 2, faces });
    });
  });

  it("tolerates whitespace and capitals", () => {
    expect(parseNotation(" 2 D 10 ")).toEqual({ count: 2, faces: 10 });
  });

  it.each(["", "d", "20", "d0", "d7", "d3", "2d5", "abc", "1d20x", "-2d6"])(
    "rejects %o",
    input => {
      expect(parseNotation(input)).toBeNull();
    },
  );

  it("refuses more dice than the tray can hold", () => {
    expect(parseNotation(`${MAX_DICE}d6`)).toEqual({ count: MAX_DICE, faces: 6 });
    expect(parseNotation(`${MAX_DICE + 1}d6`)).toBeNull();
    expect(parseNotation("999d6")).toBeNull();
    expect(parseNotation("0d6")).toBeNull();
  });
});
