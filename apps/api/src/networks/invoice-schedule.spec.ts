import { describe, expect, it } from "vitest";
import { invoiceSchedule } from "./invoice-schedule";

describe("invoice calendar schedule", () => {
  it("sends 15 days before free access ends and allows 14 days for payment", () => {
    expect(invoiceSchedule("2027-01-31")).toEqual({
      freeUntil: "2027-01-31",
      invoiceDate: "2027-01-16",
      paymentDueDate: "2027-01-30",
      paidFrom: "2027-02-01",
      timezone: "Europe/Berlin",
    });
  });
  it("uses calendar days across year boundaries and leap years", () => {
    expect(invoiceSchedule("2027-01-05").invoiceDate).toBe("2026-12-21");
    expect(invoiceSchedule("2028-02-29").paidFrom).toBe("2028-03-01");
    expect(invoiceSchedule("2027-03-31").invoiceDate).toBe("2027-03-16");
  });
  it("rejects invalid or ambiguous dates rather than normalising them", () => {
    for (const date of [
      "2027-02-29",
      "2027-02-31",
      "31.01.2027",
      "2027-13-01",
      "",
    ])
      expect(() => invoiceSchedule(date)).toThrow();
  });
});
