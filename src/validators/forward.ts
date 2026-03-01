import type { ValidationResult } from "./base.js";
import { valid } from "./base.js";

export type ForwardRoute =
  | {
      endpoint: "range";
      currencyPair: string;
      maturity: string;
      dateFrom: string;
      dateTo?: string;
    }
  | { endpoint: "daily"; date?: string };

export function validateForward(input: {
  date?: string;
  currencyPair?: string;
  maturity?: string;
  dateFrom?: string;
  dateTo?: string;
}): ValidationResult<ForwardRoute> {
  if (input.dateFrom !== undefined) {
    return valid({
      endpoint: "range",
      currencyPair: input.currencyPair ?? "ALL",
      maturity: input.maturity ?? "ALL",
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    });
  }

  return valid({ endpoint: "daily", date: input.date });
}
