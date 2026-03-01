// ---------------------------------------------------------------------------
// Core validation types and helpers
// ---------------------------------------------------------------------------

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function valid<T>(data: T): ValidationResult<T> {
  return { ok: true, data };
}

export function invalid<T>(error: string): ValidationResult<T> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// Shared date-or-year routing (used by czeonia.ts and omo.ts)
// ---------------------------------------------------------------------------

type DateOrYearRoute = { endpoint: "year"; year: number } | { endpoint: "daily"; date?: string };

export function validateDateOrYear(input: { date?: string; year?: number }): DateOrYearRoute {
  if (input.year !== undefined) {
    return { endpoint: "year", year: input.year };
  }
  return { endpoint: "daily", date: input.date };
}
