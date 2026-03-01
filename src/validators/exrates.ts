import { type ValidationResult, valid, invalid } from "./base.js";

export type AveragesRoute =
  | { endpoint: "year"; year: number }
  | { endpoint: "currency"; currency: string };

export function validateAverages(input: {
  currency?: string;
  year?: number;
}): ValidationResult<AveragesRoute> {
  if (input.currency === undefined && input.year === undefined) {
    return invalid("At least one of 'currency' or 'year' must be provided.");
  }

  // If year is given (or both), prefer the year endpoint (returns all currencies).
  if (input.year !== undefined) {
    return valid({ endpoint: "year", year: input.year });
  }

  // Only currency is given (guaranteed defined by the check above).
  return valid({ endpoint: "currency", currency: input.currency as string });
}
