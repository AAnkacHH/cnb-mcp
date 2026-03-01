import type { ValidationResult } from "./base.js";
import { valid } from "./base.js";
import type { PRIBOR_PERIOD } from "./schemas.js";

type PriborPeriod = (typeof PRIBOR_PERIOD)[number];

export type PriborYearRoute =
  | { endpoint: "specific-term"; year?: number; period: PriborPeriod }
  | { endpoint: "all-terms"; year?: number };

export function validatePriborYear(input: {
  year?: number;
  period?: PriborPeriod;
}): ValidationResult<PriborYearRoute> {
  if (input.period) {
    return valid({
      endpoint: "specific-term",
      year: input.year,
      period: input.period,
    });
  }

  return valid({ endpoint: "all-terms", year: input.year });
}
