import { describe, expect, it } from "vitest";
import { checkMove, oneLetterApart } from "./game";

describe("oneLetterApart", () => {
  it("accepts one changed letter", () => expect(oneLetterApart("кот", "код")).toBe(true));
  it("rejects identical and two-letter changes", () => {
    expect(oneLetterApart("кот", "кот")).toBe(false);
    expect(oneLetterApart("кот", "год")).toBe(false);
  });
  it("treats ё as different from е", () => expect(oneLetterApart("мел", "мёл")).toBe(true));
});
describe("checkMove", () => {
  const words = new Set(["кот", "код", "год"]);
  it("accepts valid moves", () => expect(checkMove(" КОД ", "кот", words)).toBeNull());
  it("rejects unknown words", () => expect(checkMove("ком", "кот", words)).toMatch(/словаре/));
  it("rejects invalid transitions", () => expect(checkMove("год", "кот", words)).toMatch(/одну букву/));
});
