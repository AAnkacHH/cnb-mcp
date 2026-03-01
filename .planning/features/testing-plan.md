# Testing Plan

## Status: Planned

## Context

The cnb-mcp project currently has **zero tests** and **no test framework** configured. The codebase consists of:

- **6 validator files** (`src/validators/`) — pure functions, ideal for unit testing
- **1 API client** (`src/api/client.ts`) — `cnbFetch` with URL construction and error handling
- **8 tool files** (`src/tools/`) — MCP tool handlers with routing logic, API calls, and formatting
- **1 entry point** (`src/index.ts`) — server registration

The project uses ESM (`"type": "module"` in package.json), TypeScript strict mode, and Node16 module resolution.

## Test Framework Choice: Vitest

**Why Vitest over Jest:**

- Native ESM support (no transform hacks for `.js` imports)
- Built-in TypeScript support without `ts-jest`
- Compatible with existing `tsconfig.json` (ES2022 + Node16)
- Fast startup, watch mode out of the box
- Same `describe`/`it`/`expect` API

## Phase 0: Setup Infrastructure

### Install dependencies

```bash
npm install -D vitest
```

### Create `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
```

### Add scripts to `package.json`

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### Update `tsconfig.json`

Add `"types": ["vitest/globals"]` to compilerOptions if using globals.
Exclude test files from build output — either via `tsconfig.build.json` or adjust `"exclude"` in tsconfig.

### Update `check` script

```json
"check": "npm run typecheck && npm run lint && npm run format:check && npm run test"
```

## Phase 1: Validator Unit Tests (pure functions, no mocking)

These are the highest-value, lowest-effort tests. All validators are pure functions with no side effects.

### File structure

```
src/validators/
  schemas.test.ts
  base.test.ts
  convert.test.ts
  exrates.test.ts
  pribor.test.ts
  forward.test.ts
```

### `src/validators/schemas.test.ts`

Test each Zod schema for valid and invalid inputs.

| Schema | Valid inputs | Invalid inputs |
| --- | --- | --- |
| `dateSchema` | `"2024-01-15"`, `"1991-12-31"` | `"2024/01/15"`, `"24-01-15"`, `"not-a-date"`, `""` |
| `currencyCodeSchema` | `"EUR"`, `"usd"` (lowercased, should uppercase) | `"EU"`, `"EURO"`, `"12E"`, `""` |
| `yearMonthSchema` | `"2024-01"`, `"1991-12"` | `"2024-1"`, `"2024/01"`, `""` |
| `yearSchema` | `1991`, `2024`, `2100` | `1990`, `2101`, `1991.5`, `NaN` |
| `priborYearSchema` | `1999`, `2024`, `2100` | `1998`, `2101` |
| `langSchema` | `"CZ"`, `"EN"`, `undefined` (defaults to `"EN"`) | `"DE"`, `"en"` |
| `priborPeriodSchema` | `"ONE_DAY"`, `"ONE_YEAR"` | `"TWO_DAY"`, `""` |
| `forwardCurrencyPairSchema` | `"ALL"`, `"EUR_TO_CZK"`, `"USD_TO_CZK"` | `"GBP_TO_CZK"` |
| `forwardMaturitySchema` | `"ALL"`, `"THREE_MONTH"`, `"SIX_MONTH"` | `"ONE_MONTH"` |

### `src/validators/base.test.ts`

- `valid()` returns `{ ok: true, data }` with correct data
- `invalid()` returns `{ ok: false, error }` with correct message
- `validationError()` returns MCP-compatible shape `{ content: [{ type: "text", text }], isError: true }`
- `validateDateOrYear({ year: 2024 })` returns `{ endpoint: "year", year: 2024 }`
- `validateDateOrYear({ date: "2024-01-15" })` returns `{ endpoint: "daily", date: "2024-01-15" }`
- `validateDateOrYear({})` returns `{ endpoint: "daily", date: undefined }`
- `validateDateOrYear({ date: "2024-01-15", year: 2024 })` year takes priority

### `src/validators/convert.test.ts`

- `validateConvert({ amount: 100, from: "EUR", to: "CZK" })` returns `{ ok: true, data: { sameCurrency: false } }`
- `validateConvert({ amount: 100, from: "EUR", to: "EUR" })` returns `{ ok: true, data: { sameCurrency: true } }`
- `validateConvert({ amount: 0, from: "EUR", to: "CZK" })` returns `{ ok: false, error: "..." }`
- `validateConvert({ amount: -5, from: "EUR", to: "CZK" })` returns `{ ok: false, error: "..." }`

### `src/validators/exrates.test.ts`

- `validateAverages({ currency: "EUR" })` returns `{ ok: true, data: { endpoint: "currency", currency: "EUR" } }`
- `validateAverages({ year: 2024 })` returns `{ ok: true, data: { endpoint: "year", year: 2024 } }`
- `validateAverages({ currency: "EUR", year: 2024 })` year takes priority
- `validateAverages({})` returns `{ ok: false, error: "..." }`

### `src/validators/pribor.test.ts`

- `validatePriborYear({ period: "THREE_MONTH" })` returns specific-term route
- `validatePriborYear({ year: 2024, period: "ONE_DAY" })` returns specific-term with year
- `validatePriborYear({ year: 2024 })` returns all-terms route
- `validatePriborYear({})` returns all-terms with `year: undefined`

### `src/validators/forward.test.ts`

- `validateForward({ dateFrom: "2024-01-01" })` returns range with defaults (`currencyPair: "ALL"`, `maturity: "ALL"`)
- `validateForward({ dateFrom: "2024-01-01", currencyPair: "EUR_TO_CZK", maturity: "THREE_MONTH", dateTo: "2024-06-01" })` returns range with explicit values
- `validateForward({ date: "2024-01-15" })` returns daily route
- `validateForward({})` returns daily with `date: undefined`

## Phase 2: API Client Tests (requires fetch mocking)

### `src/api/client.test.ts`

Mock global `fetch` using `vi.fn()`.

**`cnbFetch` tests:**

- Constructs correct URL from path + params
- Filters out `undefined`, `null`, and `""` params
- Returns parsed JSON on 200 response
- Throws `CnbApiError(400, ...)` on status 400
- Throws `CnbApiError(404, ...)` on status 404 with weekend/holiday message
- Throws `CnbApiError(status, ...)` on other error statuses (e.g. 500)

**`CnbApiError` tests:**

- Is an instance of `Error`
- Has correct `name`, `status`, `endpoint`, `message` properties

## Phase 3: Tool Handler Tests (integration, mocked API)

These tests verify tool handler logic (routing, formatting, error handling) with `cnbFetch` mocked via `vi.mock`.

### File structure

```
src/tools/
  convert.test.ts
  exrates.test.ts
  fxrates.test.ts
  pribor.test.ts
  czeonia.test.ts
  forward.test.ts
  omo.test.ts
  skd.test.ts
```

### Testing approach

Each tool file exports a `registerXxxTools(server)` function that calls `server.registerTool()` or `server.tool()`. To test handlers in isolation:

**Option A — Extract and call handlers directly:**
Create a mock `McpServer` that captures registered handlers, then call them with test inputs.

```typescript
import { vi } from "vitest";
import { registerConvertTools } from "./convert.js";

function createMockServer() {
  const tools = new Map<string, Function>();
  return {
    registerTool: vi.fn((name: string, _meta: unknown, handler: Function) => {
      tools.set(name, handler);
    }),
    tool: vi.fn((name: string, _desc: string, _schema: unknown, handler: Function) => {
      tools.set(name, handler);
    }),
    getHandler: (name: string) => tools.get(name),
  };
}
```

**Option B — Use MCP SDK's `Client` for e2e-like tests:**
Create a real `McpServer` + in-memory transport + `Client`, call tools via the protocol. More realistic but heavier.

**Recommendation:** Start with Option A (mock server) for speed and simplicity. Add Option B for a few smoke tests later.

### `src/tools/convert.test.ts`

Mock `cnbFetch` to return sample `ExRatesDailyResponse`.

- **amount <= 0** returns error
- **same currency** returns identity message with no API call
- **CZK to EUR** calculates correct result using rate/amount
- **EUR to CZK** calculates correct result
- **EUR to USD** cross-rate calculation
- **unknown currency** returns helpful error mentioning `cnb_fx_rates_monthly`
- **API error (weekend)** returns error message from `CnbApiError`
- **formatAmount** — verify thousands separators in output (`1,234.56`)

### `src/tools/exrates.test.ts`

- **daily tool** calls `/exrates/daily` with date and lang
- **monthly tool** calls `/exrates/daily-currency-month` with currency and yearMonth
- **year tool** calls `/exrates/daily-year` with year
- **average tools** (monthly/quarterly/cumulative):
  - currency only calls currency endpoint
  - year only calls year endpoint
  - both provided calls year endpoint (year priority)
  - neither provided returns validation error
- **API error** returns fail response

### `src/tools/fxrates.test.ts`

- **monthly tool** calls `/fxrates/daily-month` with yearMonth and lang
- **currency history tool** calls `/fxrates/daily-range-currency` with all params
- **API error** returns error message

### `src/tools/pribor.test.ts`

- **daily tool** calls `/pribor/daily` with date
- **year tool without period** calls `/pribor/daily-year`
- **year tool with period** calls `/pribor/daily-year-term` with period
- **API error** returns error message

### `src/tools/czeonia.test.ts`

- **with year** calls `/czeonia/daily-year`
- **with date** calls `/czeonia/daily`
- **no params** calls `/czeonia/daily` with `date: undefined`
- **both date and year** year takes priority
- **API error** returns error message

### `src/tools/forward.test.ts`

- **with dateFrom** calls range endpoint with defaults (`ALL`/`ALL`)
- **with dateFrom + explicit filters** calls range endpoint with specified values
- **without dateFrom** calls `/forward/daily`
- **API error** returns error message

### `src/tools/omo.test.ts`

- **with year** calls `/omo/daily-year`
- **with date** calls `/omo/daily`
- **both** year takes priority
- **API error** returns error message

### `src/tools/skd.test.ts`

- **with date** calls `/skd/daily` with date
- **no date** calls `/skd/daily` with `date: undefined`
- **API error** returns error message

## Phase 4: Verification

1. `npm run test` — all tests pass
2. `npm run typecheck` — no type errors (including test files)
3. `npm run lint` — no lint issues
4. `npm run check` — full suite passes
5. Coverage report shows all validators at 100%, API client at 100%, tool handlers at high coverage

## Priority Order

| Priority | What | Why | Effort |
| --- | --- | --- | --- |
| P0 | Phase 0 (setup) | Everything depends on this | Low |
| P1 | Phase 1 (validator tests) | Pure functions, highest value/effort ratio | Low |
| P2 | Phase 2 (API client tests) | Core infra, fetch mocking pattern reused in Phase 3 | Medium |
| P3 | Phase 3 (tool handler tests) | Integration coverage, catches routing bugs | Medium-High |

## Notes

- All test files live next to source files (`*.test.ts`) for easy navigation
- `tsconfig.json` exclude pattern should prevent test files from being emitted to `dist/`
- Vitest handles `.js` extension imports in ESM mode without extra config
- No snapshot tests needed — outputs are simple strings/objects, assert directly
