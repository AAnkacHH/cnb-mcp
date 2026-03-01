import { type ValidationResult, valid, invalid } from "./base.js";

export type AveragesRoute =
  | { endpoint: "year"; year: number }
  | { endpoint: "currency"; currency: string };

export function validateAverages(input: {
  currency?: string;
  year?: number;
}): ValidationResult<AveragesRoute> {
  if (input.year !== undefined) {
    return valid({ endpoint: "year", year: input.year });
  }

  if (input.currency !== undefined) {
    return valid({ endpoint: "currency", currency: input.currency });
  }

  return invalid("At least one of 'currency' or 'year' must be provided.");
}
