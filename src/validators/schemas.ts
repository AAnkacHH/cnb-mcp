import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared reusable Zod schemas
// ---------------------------------------------------------------------------

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const currencyCodeSchema = z
  .string()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Currency code must be a 3-letter ISO 4217 code (e.g., EUR, USD)");

export const yearMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Must be in YYYY-MM format");

export const yearSchema = z.number().int().min(1991).max(2100);

export const priborYearSchema = z.number().int().min(1999).max(2100);

export const langSchema = z.enum(["CZ", "EN"]).default("EN");

// ---------------------------------------------------------------------------
// PRIBOR periods
// ---------------------------------------------------------------------------

export const PRIBOR_PERIOD = [
  "ONE_DAY",
  "ONE_WEEK",
  "TWO_WEEKS",
  "ONE_MONTH",
  "TWO_MONTH",
  "THREE_MONTH",
  "SIX_MONTH",
  "NINE_MONTH",
  "ONE_YEAR",
] as const;

export const priborPeriodSchema = z.enum(PRIBOR_PERIOD);

// ---------------------------------------------------------------------------
// Forward schemas
// ---------------------------------------------------------------------------

export const forwardCurrencyPairSchema = z.enum(["ALL", "EUR_TO_CZK", "USD_TO_CZK"]);

export const forwardMaturitySchema = z.enum(["ALL", "THREE_MONTH", "SIX_MONTH"]);
