# Extract Input Validation into Dedicated Validators

## Status: Completed

## Context

The cnb-mcp project had scattered input validation across 8 tool files: repeated Zod regex patterns (dates, currencies, year ranges), inline business-logic checks (`amount > 0`, "at least one param required"), and conditional endpoint routing. This led to inconsistency (e.g. `convert.ts` lacked currency code format validation that `exrates.ts` had). The goal was to centralize shared Zod schemas and extract business-logic validation into dedicated validator functions — one per operation that needs it.

## Plan

### File Structure

```
src/validators/
  schemas.ts        — shared reusable Zod schemas (date, currency, year, yearMonth, lang, enums)
  base.ts           — ValidationResult<T> type, valid/invalid helpers, validationError helper, validateDateOrYear
  convert.ts        — validateConvert (amount > 0, same-currency flag)
  exrates.ts        — validateAverages (at-least-one-of currency/year, endpoint routing)
  pribor.ts         — validatePriborYear (endpoint routing by period)
  forward.ts        — validateForward (endpoint routing + default values for currencyPair/maturity)
```

### Phase 1: Shared infrastructure (new files, no tool changes)

#### `src/validators/schemas.ts` — Shared Zod schemas
- `dateSchema` — `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")`
- `currencyCodeSchema` — `z.string().toUpperCase().regex(/^[A-Z]{3}$/, ...)` (fixes missing regex in convert.ts)
- `yearMonthSchema` — `z.string().regex(/^\d{4}-\d{2}$/, ...)`
- `yearSchema` — `z.number().int().min(1991).max(2100)`
- `priborYearSchema` — `z.number().int().min(1999).max(2100)`
- `langSchema` — `z.enum(["CZ", "EN"]).default("EN")`
- `PRIBOR_PERIOD` const + `priborPeriodSchema` (moved from `src/tools/pribor.ts`)
- `forwardCurrencyPairSchema`, `forwardMaturitySchema`

#### `src/validators/base.ts` — Core types and helpers
- `ValidationResult<T>` discriminated union: `{ ok: true; data: T } | { ok: false; error: string }`
- `valid<T>(data)` / `invalid<T>(error)` constructors
- `validationError(message)` — returns MCP-compatible `{ content, isError }` for quick handler integration
- `validateDateOrYear(input)` — shared routing for czeonia.ts and omo.ts (`year` → year endpoint, else → daily)

### Phase 2: Individual validators (new files, no tool changes)

#### `src/validators/convert.ts` — `validateConvert`
- Checks `amount > 0`, returns `invalid` if not
- Sets `sameCurrency: boolean` flag (replaces inline `from === to` check)
- Does NOT move "currency not found in API response" checks (those depend on API response data)

#### `src/validators/exrates.ts` — `validateAverages`
- Checks at least one of `currency`/`year` is provided
- Returns discriminated `AveragesRoute`: `{ endpoint: "year", year }` or `{ endpoint: "currency", currency }`

#### `src/validators/pribor.ts` — `validatePriborYear`
- Routes to `"specific-term"` or `"all-terms"` endpoint based on `period` presence

#### `src/validators/forward.ts` — `validateForward`
- Routes to `"range"` or `"daily"` endpoint based on `dateFrom` presence
- Applies defaults: `currencyPair ?? "ALL"`, `maturity ?? "ALL"`

### Phase 3: Migrate tool files (one at a time)

Each tool file: replace inline Zod patterns with imports from `schemas.ts`, integrate validator in execute handler.

| Order | File | Changes |
|-------|------|---------|
| 1 | `src/tools/skd.ts` | Import `dateSchema`. No validator needed. |
| 2 | `src/tools/czeonia.ts` | Import schemas + `validateDateOrYear`. Replace routing `if`. |
| 3 | `src/tools/omo.ts` | Same as czeonia. |
| 4 | `src/tools/pribor.ts` | Import schemas (remove local `PRIBOR_PERIOD`). Use `validatePriborYear`. |
| 5 | `src/tools/forward.ts` | Import schemas + `validateForward`. Replace routing + defaults. |
| 6 | `src/tools/fxrates.ts` | Import schemas only. No validator needed. |
| 7 | `src/tools/exrates.ts` | Import schemas + `validateAverages`. Use in `registerAverageTool` factory. |
| 8 | `src/tools/convert.ts` | Import `currencyCodeSchema` + `dateSchema` + `validateConvert`. Fixes missing currency regex. |

#### Integration pattern in handlers:
```typescript
const validation = validateConvert({ amount, from, to, date });
if (!validation.ok) return validationError(validation.error);
const { sameCurrency } = validation.data;
```

### Tools that get NO validator (Zod schema is sufficient):
- `cnb_exchange_rates_daily`, `cnb_exchange_rates_monthly`, `cnb_exchange_rates_year`
- `cnb_fx_rates_monthly`, `cnb_fx_rates_currency`
- `cnb_pribor_daily`
- `cnb_short_term_bonds`

### Phase 4: Verification
1. `npm run typecheck` — no type errors
2. `npm run lint` — no lint issues
3. `npm run format` — code formatted
4. `npm run check` — all three pass
5. `npm run build` — compiles successfully

---

## Summary of Changes

### Phase 1 — Shared infrastructure (new files):
- `src/validators/schemas.ts` — 8 reusable Zod schemas: `dateSchema`, `currencyCodeSchema`, `yearMonthSchema`, `yearSchema`, `priborYearSchema`, `langSchema`, `PRIBOR_PERIOD` + `priborPeriodSchema`, `forwardCurrencyPairSchema`, `forwardMaturitySchema`
- `src/validators/base.ts` — `ValidationResult<T>` discriminated union, `valid`/`invalid` helpers, `validationError` for MCP-compatible error responses, `validateDateOrYear` shared router

### Phase 2 — Individual validators (new files):
- `src/validators/convert.ts` — `validateConvert` (amount > 0, sameCurrency flag)
- `src/validators/exrates.ts` — `validateAverages` (at-least-one-of check, endpoint routing)
- `src/validators/pribor.ts` — `validatePriborYear` (specific-term vs all-terms routing)
- `src/validators/forward.ts` — `validateForward` (range vs daily routing with defaults)

### Phase 3 — All 8 tool files migrated:
- `skd.ts` — uses `dateSchema`
- `czeonia.ts` — uses schemas + `validateDateOrYear`
- `omo.ts` — uses schemas + `validateDateOrYear`
- `pribor.ts` — uses schemas (local `PRIBOR_PERIOD` removed) + `validatePriborYear`
- `forward.ts` — uses schemas + `validateForward`
- `fxrates.ts` — uses `yearMonthSchema`, `langSchema`, `currencyCodeSchema`
- `exrates.ts` — uses schemas + `validateAverages` + `validationError`
- `convert.ts` — uses `currencyCodeSchema` (fixes missing regex), `dateSchema` + `validateConvert`

### Phase 4 — All verified:
- `npm run typecheck` — no errors
- `npm run lint` — no errors
- `npm run format:check` — all formatted
- `npm run check` — all three pass
- `npm run build` — compiles successfully
