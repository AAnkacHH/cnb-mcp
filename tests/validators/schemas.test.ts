import { describe, it, expect } from "vitest";
import {
  dateSchema,
  currencyCodeSchema,
  yearMonthSchema,
  yearSchema,
  priborYearSchema,
  langSchema,
  priborPeriodSchema,
  forwardCurrencyPairSchema,
  forwardMaturitySchema,
} from "../../src/validators/schemas.js";

// ---------------------------------------------------------------------------
// dateSchema
// ---------------------------------------------------------------------------
describe("dateSchema", () => {
  it.each(["2024-01-15", "1991-12-31"])("accepts valid date %s", (v) => {
    expect(dateSchema.safeParse(v).success).toBe(true);
  });

  it.each(["2024/01/15", "24-01-15", "not-a-date", ""])("rejects invalid date %s", (v) => {
    expect(dateSchema.safeParse(v).success).toBe(false);
  });

  it("rejects impossible date 2024-02-30", () => {
    expect(dateSchema.safeParse("2024-02-30").success).toBe(false);
  });

  it("rejects impossible date 2024-13-01", () => {
    expect(dateSchema.safeParse("2024-13-01").success).toBe(false);
  });

  it("rejects impossible date 2024-04-31", () => {
    expect(dateSchema.safeParse("2024-04-31").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// currencyCodeSchema
// ---------------------------------------------------------------------------
describe("currencyCodeSchema", () => {
  it("accepts valid uppercase code", () => {
    const result = currencyCodeSchema.safeParse("EUR");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("EUR");
  });

  it("transforms lowercase to uppercase", () => {
    const result = currencyCodeSchema.safeParse("usd");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("USD");
  });

  it.each(["EU", "EURO", "12E", ""])("rejects invalid code %s", (v) => {
    expect(currencyCodeSchema.safeParse(v).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// yearMonthSchema
// ---------------------------------------------------------------------------
describe("yearMonthSchema", () => {
  it.each(["2024-01", "1991-12"])("accepts valid yearMonth %s", (v) => {
    expect(yearMonthSchema.safeParse(v).success).toBe(true);
  });

  it.each(["2024-1", "2024/01", ""])("rejects invalid yearMonth %s", (v) => {
    expect(yearMonthSchema.safeParse(v).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// yearSchema
// ---------------------------------------------------------------------------
describe("yearSchema", () => {
  it.each([1991, 2024, 2100])("accepts valid year %d", (v) => {
    expect(yearSchema.safeParse(v).success).toBe(true);
  });

  it.each([1990, 2101, 1991.5])("rejects invalid year %d", (v) => {
    expect(yearSchema.safeParse(v).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// priborYearSchema
// ---------------------------------------------------------------------------
describe("priborYearSchema", () => {
  it.each([1999, 2024, 2100])("accepts valid priborYear %d", (v) => {
    expect(priborYearSchema.safeParse(v).success).toBe(true);
  });

  it.each([1998, 2101])("rejects invalid priborYear %d", (v) => {
    expect(priborYearSchema.safeParse(v).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// langSchema
// ---------------------------------------------------------------------------
describe("langSchema", () => {
  it.each(["CZ", "EN"])("accepts valid lang %s", (v) => {
    expect(langSchema.safeParse(v).success).toBe(true);
  });

  it.each(["DE", "en"])("rejects invalid lang %s", (v) => {
    expect(langSchema.safeParse(v).success).toBe(false);
  });

  it("defaults to EN when parsing undefined", () => {
    const result = langSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("EN");
  });
});

// ---------------------------------------------------------------------------
// priborPeriodSchema
// ---------------------------------------------------------------------------
describe("priborPeriodSchema", () => {
  it.each(["ONE_DAY", "ONE_YEAR"])("accepts valid period %s", (v) => {
    expect(priborPeriodSchema.safeParse(v).success).toBe(true);
  });

  it.each(["TWO_DAY", ""])("rejects invalid period %s", (v) => {
    expect(priborPeriodSchema.safeParse(v).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// forwardCurrencyPairSchema
// ---------------------------------------------------------------------------
describe("forwardCurrencyPairSchema", () => {
  it.each(["ALL", "EUR_TO_CZK", "USD_TO_CZK"])("accepts valid pair %s", (v) => {
    expect(forwardCurrencyPairSchema.safeParse(v).success).toBe(true);
  });

  it("rejects invalid pair", () => {
    expect(forwardCurrencyPairSchema.safeParse("GBP_TO_CZK").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// forwardMaturitySchema
// ---------------------------------------------------------------------------
describe("forwardMaturitySchema", () => {
  it.each(["ALL", "THREE_MONTH", "SIX_MONTH"])("accepts valid maturity %s", (v) => {
    expect(forwardMaturitySchema.safeParse(v).success).toBe(true);
  });

  it("rejects invalid maturity", () => {
    expect(forwardMaturitySchema.safeParse("ONE_MONTH").success).toBe(false);
  });
});
