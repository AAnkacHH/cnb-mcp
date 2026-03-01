# Comprehensive Testing Plan for cnb-mcp

## 1. Current State Assessment

### Project Overview
- **No existing tests**: The project has zero test files, no test configuration, and no test framework installed.
- **Runtime**: Node.js (ES2022 modules) with TypeScript, `"type": "module"` in `package.json`.
- **Dependencies**: `@modelcontextprotocol/sdk` (v1.27.1), `zod` (v3.25+).
- **Architecture**: Single API client (`cnbFetch`), 8 tool registration modules, 1 resource, 1 prompt. All tool handlers follow the same pattern: call `cnbFetch`, return JSON on success, return error text with `isError: true` on failure.

### Files to Test

| File | Path | What it contains |
|------|------|-----------------|
| `client.ts` | `src/api/client.ts` | `cnbFetch<T>()` generic HTTP client, `CnbApiError` custom error class |
| `types.ts` | `src/types.ts` | All TypeScript interfaces (no runtime logic) |
| `exrates.ts` | `src/tools/exrates.ts` | 6 tools: daily, monthly, year, monthly averages, quarterly averages, cumulative averages. Also contains `ok()`, `fail()` helpers and `registerAverageTool()` factory |
| `fxrates.ts` | `src/tools/fxrates.ts` | 2 tools: monthly FX rates, currency FX history |
| `pribor.ts` | `src/tools/pribor.ts` | 2 tools: daily PRIBOR, yearly PRIBOR (with term routing) |
| `czeonia.ts` | `src/tools/czeonia.ts` | 1 tool: CZEONIA daily or yearly (branching on `year` param) |
| `forward.ts` | `src/tools/forward.ts` | 1 tool: forward rates daily or date-range (branching on `dateFrom`) |
| `omo.ts` | `src/tools/omo.ts` | 1 tool: OMO daily or yearly |
| `skd.ts` | `src/tools/skd.ts` | 1 tool: SKD daily |
| `convert.ts` | `src/tools/convert.ts` | 1 tool: currency converter with `formatAmount()` utility. Most complex tool -- CZK->foreign, foreign->CZK, cross-rate logic |
| `index.ts` | `src/index.ts` | Server bootstrap, tool registration, resource, prompt |

---

## 2. Test Framework: Vitest

### Why Vitest
1. Native ESM support -- critical since the project uses `"type": "module"`.
2. The MCP SDK itself uses Vitest, making it the idiomatic choice.
3. First-class TypeScript support without additional transforms.
4. Compatible API with Jest (describe/it/expect) for familiarity.
5. Built-in mocking via `vi.fn()`, `vi.spyOn()`, `vi.mock()`.

### Dependencies to Add

```json
{
  "devDependencies": {
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0"
  }
}
```

### Configuration: `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    },
  },
});
```

### Scripts to Add in `package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 3. Mocking Strategy

### 3.1 Mocking `cnbFetch` (Primary Strategy)

The central point for all API calls is the `cnbFetch` function in `src/api/client.ts`. Every tool handler calls `cnbFetch`. The strategy is:

**For unit tests of `cnbFetch` itself**: mock the global `fetch` function using `vi.stubGlobal('fetch', ...)` or `vi.spyOn(globalThis, 'fetch')`.

**For unit tests of tool handlers**: mock the entire `../api/client.js` module using `vi.mock()` so that `cnbFetch` returns controlled data without any HTTP calls.

```typescript
// Example: mocking cnbFetch at the module level
import { vi } from "vitest";

vi.mock("../api/client.js", () => ({
  cnbFetch: vi.fn(),
  CnbApiError: (await vi.importActual("../api/client.js")).CnbApiError,
}));
```

Alternative pattern using `vi.spyOn`:

```typescript
import { vi, beforeEach } from "vitest";
import * as clientModule from "../api/client.js";

const cnbFetchMock = vi.spyOn(clientModule, "cnbFetch");

beforeEach(() => {
  cnbFetchMock.mockReset();
});
```

### 3.2 Mocking `fetch` for API Client Tests

For testing `cnbFetch` itself, mock the global `fetch`:

```typescript
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
  } as Response;
}
```

### 3.3 Integration Test Mocking

For MCP server integration tests (using `InMemoryTransport` + `Client`), still mock `cnbFetch` at the module level so that calling tools through the real MCP protocol never hits the network.

---

## 4. Test File Structure

```
src/
  api/
    client.ts
    client.test.ts              # Unit tests for cnbFetch + CnbApiError
  tools/
    exrates.ts
    exrates.test.ts             # Unit tests for 6 exrates tools
    fxrates.ts
    fxrates.test.ts             # Unit tests for 2 fxrates tools
    pribor.ts
    pribor.test.ts              # Unit tests for 2 pribor tools
    czeonia.ts
    czeonia.test.ts             # Unit tests for 1 czeonia tool
    forward.ts
    forward.test.ts             # Unit tests for 1 forward tool
    omo.ts
    omo.test.ts                 # Unit tests for 1 OMO tool
    skd.ts
    skd.test.ts                 # Unit tests for 1 SKD tool
    convert.ts
    convert.test.ts             # Unit tests for converter + formatAmount
  test-fixtures.ts              # Shared mock data constants
  test-helpers.ts               # createTestClient helper
  index.ts
  integration.test.ts           # MCP server integration tests
```

Total: **10 test files**.

---

## 5. Test Fixture Data

Create shared fixtures based on the types in `src/types.ts`:

```typescript
// Fixture: ExRatesDailyResponse
export const MOCK_DAILY_RATES: ExRatesDailyResponse = {
  rates: [
    {
      validFor: "2025-02-24",
      order: 38,
      country: "EMU",
      currency: "euro",
      amount: 1,
      currencyCode: "EUR",
      rate: 25.06,
    },
    {
      validFor: "2025-02-24",
      order: 38,
      country: "United States",
      currency: "dollar",
      amount: 1,
      currencyCode: "USD",
      rate: 23.456,
    },
    {
      validFor: "2025-02-24",
      order: 38,
      country: "Japan",
      currency: "yen",
      amount: 100,
      currencyCode: "JPY",
      rate: 15.623,
    },
    {
      validFor: "2025-02-24",
      order: 38,
      country: "Hungary",
      currency: "forint",
      amount: 100,
      currencyCode: "HUF",
      rate: 6.241,
    },
    {
      validFor: "2025-02-24",
      order: 38,
      country: "United Kingdom",
      currency: "pound",
      amount: 1,
      currencyCode: "GBP",
      rate: 29.85,
    },
  ],
};

// Fixture: PriborResponse
export const MOCK_PRIBOR: PriborResponse = {
  pribs: [
    { validFor: "2025-02-24", period: "ONE_DAY", pribid: null, pribor: 3.92 },
    { validFor: "2025-02-24", period: "ONE_WEEK", pribid: null, pribor: 3.95 },
    { validFor: "2025-02-24", period: "THREE_MONTH", pribid: null, pribor: 4.01 },
    { validFor: "2025-02-24", period: "ONE_YEAR", pribid: null, pribor: 4.15 },
  ],
};

// Additional fixtures for CZEONIA, Forward, OMO, SKD, Averages, FX rates...
```

---

## 6. Detailed Test Cases by Module

### 6.1 `src/api/client.test.ts` -- CnbApiError and cnbFetch

#### CnbApiError

```
describe("CnbApiError")
  it("should store status, endpoint, and message")
  it("should have name property set to 'CnbApiError'")
  it("should be an instance of Error")
```

#### cnbFetch -- URL construction

```
describe("cnbFetch - URL construction")
  it("should call fetch with correct base URL + path")
    -> fetches "https://api.cnb.cz/cnbapi/exrates/daily"
  it("should append query params for string values")
    -> URL contains ?date=2025-02-24&lang=EN
  it("should append query params for number values converted to string")
    -> ?year=2024
  it("should skip undefined params")
  it("should skip null params")
  it("should skip empty string params")
  it("should work with no params at all")
```

#### cnbFetch -- Response handling

```
describe("cnbFetch - successful response")
  it("should parse and return JSON body on 200")
  it("should return typed result matching the generic parameter")

describe("cnbFetch - error handling")
  it("should throw CnbApiError with status 400 for invalid params")
    -> error.message contains "Invalid parameters"
  it("should throw CnbApiError with status 404 with weekend/holiday message")
    -> error.message contains "No data available"
  it("should throw CnbApiError with generic message for 500")
    -> error.message contains "CNB API error: 500"
  it("should throw CnbApiError for other HTTP error codes (e.g. 429, 503)")
  it("should propagate network errors (fetch throws TypeError)")
    -> TypeError propagates unwrapped
```

### 6.2 `src/tools/exrates.test.ts` -- Exchange Rate Tools

#### Test Setup Pattern

Use the MCP SDK's `Client` + `InMemoryTransport` to create a real server-client pair:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

async function createTestClient(registerFn: (server: McpServer) => void) {
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerFn(server);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.1" });
  await client.connect(clientTransport);
  return { client, server };
}
```

#### cnb_exchange_rates_daily

```
describe("cnb_exchange_rates_daily")
  it("should call cnbFetch with /exrates/daily and default params")
  it("should pass date and lang params through to cnbFetch")
  it("should return JSON-stringified rates data")
  it("should not set isError on success")
  it("should return isError true and message on CnbApiError 400")
  it("should return isError true and message on CnbApiError 404")
  it("should return 'Unexpected error' for non-CnbApiError exceptions")
```

#### cnb_exchange_rates_monthly

```
describe("cnb_exchange_rates_monthly")
  it("should call /exrates/daily-currency-month with required currency param")
  it("should pass optional yearMonth param")
  it("should return parsed rate data on success")
  it("should handle API errors gracefully")
```

#### cnb_exchange_rates_year

```
describe("cnb_exchange_rates_year")
  it("should call /exrates/daily-year with optional year param")
  it("should default to no year param when not provided")
  it("should return data on success")
  it("should handle errors")
```

#### Average Tools (monthly, quarterly, cumulative) -- shared `registerAverageTool` factory

```
describe("cnb_exchange_rates_monthly_averages")
  it("should return error when neither currency nor year is provided")
  it("should call the -year endpoint when year is provided")
  it("should call the -currency endpoint when only currency is provided")
  it("should prefer the -year endpoint when both currency and year are provided")
  it("should return averages data on success")
  it("should handle API errors")

describe("cnb_exchange_rates_quarterly_averages")
  // Same tests, different endpoint paths

describe("cnb_exchange_rates_cumulative_averages")
  // Same tests, different endpoint paths
```

### 6.3 `src/tools/fxrates.test.ts`

#### cnb_fx_rates_monthly

```
describe("cnb_fx_rates_monthly")
  it("should call /fxrates/daily-month with optional yearMonth and lang")
  it("should default lang to EN")
  it("should return data on success")
  it("should return CnbApiError message on API error")
  it("should return generic message on unexpected error")
```

#### cnb_fx_rates_currency

```
describe("cnb_fx_rates_currency")
  it("should call /fxrates/daily-range-currency with required currency")
  it("should pass optional yearMonthFrom, yearMonthTo, lang params")
  it("should return data on success")
  it("should handle errors")
```

### 6.4 `src/tools/pribor.test.ts`

#### cnb_pribor_daily

```
describe("cnb_pribor_daily")
  it("should call /pribor/daily with optional date")
  it("should return PRIBOR data including null pribid values")
  it("should handle errors")
```

#### cnb_pribor_year

```
describe("cnb_pribor_year")
  it("should call /pribor/daily-year when no period is given")
  it("should call /pribor/daily-year-term when period is given")
  it("should pass year param to both endpoints")
  it("should handle errors")
```

### 6.5 `src/tools/czeonia.test.ts`

```
describe("cnb_czeonia")
  it("should call /czeonia/daily-year when year param is provided")
  it("should call /czeonia/daily when year is not provided")
  it("should call /czeonia/daily with no params when neither date nor year given")
  it("should return CzeoniaYearResponse when year is given")
  it("should return CzeoniaDailyResponse when date is given")
  it("should handle API errors")
```

### 6.6 `src/tools/forward.test.ts`

```
describe("cnb_forward_rates")
  describe("single date query")
    it("should call /forward/daily when dateFrom is not provided")
    it("should pass date param to /forward/daily")
    it("should return forward points data")

  describe("date range query")
    it("should call /forward/daily-range-currency-pair-maturity when dateFrom is provided")
    it("should default currencyPair to ALL when not specified")
    it("should default maturity to ALL when not specified")
    it("should pass explicit currencyPair and maturity")
    it("should pass dateFrom and dateTo to the range endpoint")

  describe("error handling")
    it("should handle CnbApiError")
    it("should handle unexpected errors")
```

### 6.7 `src/tools/omo.test.ts`

```
describe("cnb_open_market_operations")
  it("should call /omo/daily-year when year is provided")
  it("should call /omo/daily when year is not provided")
  it("should pass date param to daily endpoint")
  it("should return operations data on success")
  it("should handle errors")
```

### 6.8 `src/tools/skd.test.ts`

```
describe("cnb_short_term_bonds")
  it("should call /skd/daily with optional date")
  it("should return bond data on success")
  it("should handle CnbApiError")
  it("should handle unexpected errors")
```

### 6.9 `src/tools/convert.test.ts` -- Currency Converter

#### formatAmount utility

> Note: `formatAmount` needs to be exported from `convert.ts` for direct testing.

```
describe("formatAmount")
  it("should format integer amounts with 2 decimal places")
    -> formatAmount(1000) === "1,000.00"
  it("should format with default 2 decimal places")
    -> formatAmount(25060.5) === "25,060.50"
  it("should handle custom decimal places")
    -> formatAmount(25060.123, 3) === "25,060.123"
  it("should format small numbers without thousands separator")
    -> formatAmount(1.5) === "1.50"
  it("should format zero")
    -> formatAmount(0) === "0.00"
  it("should format very large numbers")
    -> formatAmount(1234567.89) === "1,234,567.89"
  it("should handle negative numbers")
    -> formatAmount(-1000) === "-1,000.00"
```

#### cnb_convert_currency -- Validation

```
describe("cnb_convert_currency - validation")
  it("should return error for amount <= 0")
  it("should return error for negative amount")
  it("should return identity result when from === to")
    -> text contains "No conversion needed"
  it("should handle case-insensitive currency codes (Zod .toUpperCase())")
```

#### cnb_convert_currency -- CZK to foreign

```
describe("cnb_convert_currency - CZK to foreign")
  it("should convert CZK to EUR using rate / amount")
    -> 25060 CZK = 1000.00 EUR
  it("should handle currencies with amount != 1 (e.g. JPY amount=100)")
  it("should return error if target currency not found in rates")
    -> suggests cnb_fx_rates_monthly
  it("should include fixing date in the output")
```

#### cnb_convert_currency -- Foreign to CZK

```
describe("cnb_convert_currency - foreign to CZK")
  it("should convert EUR to CZK")
    -> 100 EUR = 2,506.00 CZK
  it("should handle currencies with amount multiplier (e.g. 100 HUF)")
  it("should return error if source currency not found")
```

#### cnb_convert_currency -- Cross-rate (foreign to foreign)

```
describe("cnb_convert_currency - cross-rate")
  it("should convert EUR to USD via CZK")
    -> EUR=25.06, USD=23.456, result = 100 * 25.06 / 23.456 ≈ 106.84
  it("should convert EUR to GBP via CZK")
  it("should return error when source currency not found in cross-rate")
  it("should return error when target currency not found in cross-rate")
```

#### cnb_convert_currency -- Date handling

```
describe("cnb_convert_currency - date parameter")
  it("should pass date param to cnbFetch")
  it("should handle empty rates array -> currency not found error")
```

#### cnb_convert_currency -- API error handling

```
describe("cnb_convert_currency - API errors")
  it("should return CnbApiError message on API failure")
  it("should return generic error message on unexpected failure")
```

### 6.10 `src/integration.test.ts` -- MCP Server Integration Tests

```
describe("MCP Server Integration")
  describe("tool listing")
    it("should list all 15 tools")
    it("should include correct metadata for each tool")

  describe("tool invocation with mocked cnbFetch")
    it("should call cnb_exchange_rates_daily and return valid JSON")
    it("should call cnb_convert_currency and get conversion result")
    it("should handle tool errors correctly through MCP protocol")

  describe("resource reading")
    it("should list the cnb-info resource")
    it("should read cnb://info and return informational text")
      -> contains "Czech National Bank", "api.cnb.cz", "Update Schedule"

  describe("prompt listing and retrieval")
    it("should list the analyze-currency-trend prompt")
    it("should get the prompt with currency and period arguments")
      -> messages[0].content.text contains "EUR/CZK" and "quarter"
    it("should use default period 'month' when not specified")
```

---

## 7. Edge Cases and Error Handling Scenarios

### 7.1 API Client Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `fetch` throws `TypeError` (DNS failure, no network) | Error propagates unmodified (not wrapped in `CnbApiError`) |
| Response body is not valid JSON | `response.json()` rejects, error propagates |
| Params with value `0` (falsy but valid) | Should be included in URL (code checks `!== undefined && !== null && !== ""`) |
| Params with empty string `""` | Should be skipped |

### 7.2 Converter Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `amount = 0` | Error: "Amount must be greater than zero" |
| `amount = -1` | Error: "Amount must be greater than zero" |
| `amount = 0.001` (very small positive) | Valid conversion |
| `amount = 999999999` (very large) | Valid conversion, formatted with commas |
| `from = "CZK", to = "CZK"` | Identity: "No conversion needed" |
| `from = "eur"` (lowercase) | Zod `.toUpperCase()` converts to "EUR" |
| Currency not in daily rates | Error suggesting cnb_fx_rates_monthly |
| API returns empty rates array | All currency lookups fail -- returns "not found" error |
| Cross-rate with `amount` multiplier on both sides | E.g., HUF (amount=100) to JPY (amount=100) |

### 7.3 Average Tool Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Neither `currency` nor `year` provided | Returns error: "At least one of 'currency' or 'year' must be provided." |
| Both provided | Uses year endpoint (year takes priority) |
| Only currency | Uses currency endpoint |
| Year out of range (< 1991 or > 2100) | Zod validation rejects |
| Invalid currency format | Zod validation rejects (`/^[A-Z]{3}$/`) |

### 7.4 Date Format Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Invalid date format "24-02-2025" | Zod rejects (regex requires YYYY-MM-DD) |
| Valid format but non-existent date "2025-02-30" | Passes Zod, API returns 400 error |
| Weekend date | API returns last business day's data (HTTP 200) |

### 7.5 PRIBOR Routing Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Year only (no period) | Calls `/pribor/daily-year` |
| Period only (no year) | Calls `/pribor/daily-year-term` with year=undefined |
| Both year and period | Calls `/pribor/daily-year-term` with both params |
| Invalid period value | Zod enum rejects |

### 7.6 Forward Rates Routing Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No params at all | Calls `/forward/daily` with no date |
| Only `date` | Calls `/forward/daily` with date |
| `dateFrom` without `dateTo` | Calls range endpoint, dateTo=undefined |
| `dateFrom` without `currencyPair`/`maturity` | Defaults to "ALL" for both |
| `dateFrom` with all filters | Passes all to range endpoint |

---

## 8. Implementation Sequence

### Step 1: Set up test infrastructure
1. Install `vitest` and `@vitest/coverage-v8` as dev dependencies.
2. Create `vitest.config.ts` at the project root.
3. Add `test`, `test:watch`, and `test:coverage` scripts to `package.json`.
4. Verify configuration by running `npx vitest run` (expect 0 tests).

### Step 2: Create test fixtures and helpers
1. Create `src/test-fixtures.ts` with all mock data constants.
2. Create `src/test-helpers.ts` with `createTestClient()` helper.

### Step 3: Unit test the API client
1. Create `src/api/client.test.ts`.
2. Implement all `cnbFetch` and `CnbApiError` test cases.
3. This file mocks only `globalThis.fetch`.

### Step 4: Unit test each tool module (can be parallelized)
1. Create each `.test.ts` file co-located with its source file.
2. Each file mocks `cnbFetch` and uses the `createTestClient` helper.
3. Order by complexity: `skd` (simplest) -> `omo` -> `czeonia` -> `forward` -> `pribor` -> `fxrates` -> `exrates` -> `convert` (most complex).

### Step 5: Integration tests
1. Create `src/integration.test.ts`.
2. Test full MCP protocol round-trips.

### Step 6: Minor source changes needed
1. Export `formatAmount` from `convert.ts` for direct testing.
2. Optionally extract `ok()` and `fail()` helpers for independent testing.

---

## 9. Coverage Targets

| Category | Target | Notes |
|----------|--------|-------|
| Lines | >= 95% | All source in `src/` |
| Branches | >= 90% | Important for routing logic in tools |
| Functions | 100% | All exported functions must be tested |
| Statements | >= 95% | |

The only code expected to be uncovered is the `main()` function in `index.ts` (stdio transport entry point).

---

## 10. Summary of Test Counts

| Test File | Approximate Test Count |
|-----------|----------------------|
| `client.test.ts` | 14 tests |
| `exrates.test.ts` | 28 tests |
| `fxrates.test.ts` | 10 tests |
| `pribor.test.ts` | 10 tests |
| `czeonia.test.ts` | 7 tests |
| `forward.test.ts` | 10 tests |
| `omo.test.ts` | 6 tests |
| `skd.test.ts` | 5 tests |
| `convert.test.ts` | 24 tests |
| `integration.test.ts` | 10 tests |
| **Total** | **~124 tests** |
