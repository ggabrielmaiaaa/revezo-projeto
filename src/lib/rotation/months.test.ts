import { describe, expect, it } from "vitest";
import { addMonths, compareMonths, isYearMonth } from "./months";

describe("months", () => {
  it("soma meses virando o ano", () => {
    expect(addMonths("2027-11", 1)).toBe("2027-12");
    expect(addMonths("2027-12", 1)).toBe("2028-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
    expect(addMonths("2027-01", 24)).toBe("2029-01");
  });

  it("compara meses", () => {
    expect(compareMonths("2027-01", "2027-02")).toBeLessThan(0);
    expect(compareMonths("2027-02", "2027-02")).toBe(0);
    expect(compareMonths("2028-01", "2027-12")).toBeGreaterThan(0);
  });

  it("valida o formato", () => {
    expect(isYearMonth("2027-01")).toBe(true);
    expect(isYearMonth("2027-1")).toBe(false);
    expect(isYearMonth("2027-00")).toBe(false);
    expect(addMonths.bind(null, "abc", 1)).toThrow();
  });
});
