# Refactoring Plan: Address Code Review Findings

Based on two code reviews:
- `testing-implation.review.md` — Testing Implementation review
- `extract-input-validation.review.md` — Validator Extraction review

---

## Phase 1: Shared Test Infrastructure

**Goal:** Eliminate massive mock duplication across 8 tool test files.

### 1.1 Create `src/tests/mock-server.ts`

Extract the `createMockServer` helper (duplicated in every tool test file) into a single shared module.

```typescript
import { vi } from "vitest";

type ToolHandler = (...args: never[]) => Promise<unknown>;

export function createMockServer() {
  const tools = new Map<string, ToolHandler>();
  return {
    registerTool: vi.fn((name: string, _meta: unknown, handler: ToolHandler) => {
      tools.set(name, handler);
    }),
    tool: vi.fn((name: string, _desc: string, _schema: unknown, handler: ToolHandler) => {
      tools.set(name, handler);
    }),
    getHandler(name: string): ToolHandler {
      const h = tools.get(name);
      if (!h) throw new Error(`Tool "${name}" not registered`);
      return h;
    },
  };
}

export type MockServer = ReturnType<typeof createMockServer>;
```

**Update all 8 tool test files** to import from `src/tests/mock-server.ts` instead of defining locally:
- `src/tools/exrates.test.ts`
- `src/tools/convert.test.ts`
- `src/tools/fxrates.test.ts`
- `src/tools/forward.test.ts`
- `src/tools/pribor.test.ts`
- `src/tools/czeonia.test.ts` (if exists)
- `src/tools/omo.test.ts` (if exists)
- `src/tools/skd.test.ts` (if exists)

### 1.2 Create `src/tests/mock-client.ts`

Extract the shared `vi.mock("../api/client.js")` setup and `CnbApiError` re-definition into a reusable mock setup.

**Option A (recommended):** Use `vi.mock` with `importOriginal` to keep the **real** `CnbApiError` while mocking only `cnbFetch`:

```typescript
// src/tests/mock-client.ts
import { vi } from "vitest";
import type { cnbFetch as CnbFetchType } from "../api/client.js";

/**
 * Call this in vi.mock("../api/client.js", ...) factory.
 * Returns a factory function for vi.mock that keeps real CnbApiError
 * but mocks cnbFetch.
 */
export function createClientMockFactory() {
  return async (importOriginal: () => Promise<typeof import("../api/client.js")>) => {
    const original = await importOriginal();
    return {
      ...original,
      cnbFetch: vi.fn(),
    };
  };
}

export type MockCnbFetch = ReturnType<typeof vi.fn<typeof CnbFetchType>>;
```

This fixes **Review Issue #2 (Brittle Error Mocking)** — tests will use the real `CnbApiError` class instead of a re-defined fake.

### 1.3 Create `src/tests/mock-response.ts`

Extract the `mockResponse` helper from `client.test.ts` into a shared utility with a more complete Response surface:

```typescript
export function mockResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
  } as Response;
}
```

This addresses **Review Issue #4 (Incomplete fetch Mocking)** partially — adds `text()` and `headers` without pulling in a full library.

**Files changed in Phase 1:**
- New: `src/tests/mock-server.ts`
- New: `src/tests/mock-client.ts`
- New: `src/tests/mock-response.ts`
- Modified: all 8 `src/tools/*.test.ts` — remove local `createMockServer` + `vi.mock` boilerplate, import from `src/tests/`
- Modified: `src/api/client.test.ts` — import `mockResponse` from shared utility

---

## Phase 2: Fix Validator Review Issues

**Goal:** Address the 5 issues from the validation extraction review.

### 2.1 Fix `skd.ts` inputSchema (Review Issue #1)

Wrap the plain object `inputSchema` in `z.object()` for consistency with all other tools:

```typescript
// Before (skd.ts)
inputSchema: {
  date: dateSchema.optional().describe("..."),
}

// After
inputSchema: z.object({
  date: dateSchema.optional().describe("..."),
})
```

**Files changed:** `src/tools/skd.ts`

### 2.2 Use `validationError` in `forward.ts` and `pribor.ts` (Review Issues #2, #5)

Replace manual error construction with the `validationError` helper in:

**`src/tools/forward.ts` (line 46-50):**
```typescript
// Before
if (!route.ok) {
  return {
    content: [{ type: "text" as const, text: route.error }],
    isError: true,
  };
}

// After
if (!route.ok) return validationError(route.error);
```

**`src/tools/pribor.ts` (line 59-63):**
```typescript
// Before
if (!route.ok) {
  return {
    content: [{ type: "text" as const, text: route.error }],
    isError: true,
  };
}

// After
if (!route.ok) return validationError(route.error);
```

**Files changed:** `src/tools/forward.ts`, `src/tools/pribor.ts`

### 2.3 Fix type cast in `validateAverages` (Review Issue #4)

Replace `as string` with a properly narrowed type:

```typescript
// Before (src/validators/exrates.ts)
return valid({ endpoint: "currency", currency: input.currency as string });

// After — use destructuring with a const to narrow the type
const currency = input.currency;
if (currency === undefined) {
  return invalid("At least one of 'currency' or 'year' must be provided.");
}
return valid({ endpoint: "currency", currency });
```

Restructure the function to check `currency === undefined` early, so TS narrows without a cast.

**Files changed:** `src/validators/exrates.ts`

### 2.4 Enhance `dateSchema` with semantic validation (Review Issue #3)

Add a `.refine()` to reject impossible dates like `2024-13-45`:

```typescript
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(
    (s) => !isNaN(new Date(s).getTime()),
    "Date is not a valid calendar date",
  );
```

**Files changed:** `src/validators/schemas.ts`, `src/validators/schemas.test.ts` (add tests for invalid dates)

---

## Phase 3: Standardize Error Handling Across Tools

**Goal:** Reduce error handling boilerplate — every tool manually constructs error responses.

### 3.1 Introduce `ok()` and `fail()` as shared response helpers in `base.ts`

The `exrates.ts` tool already has local `ok()` and `fail()` helpers. Promote them to `src/validators/base.ts`:

```typescript
export function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function fail(err: unknown, fallbackMessage = "Unexpected error") {
  const msg = err instanceof CnbApiError ? err.message : fallbackMessage;
  return {
    content: [{ type: "text" as const, text: msg }],
    isError: true as const,
  };
}
```

**Note:** `fail()` needs `CnbApiError` import. Consider placing `ok`/`fail` in a separate `src/tools/response.ts` helper to avoid circular dependency between validators and API client.

### 3.2 Migrate all tools to use `ok()` / `fail()`

Replace repeated patterns across all tool files:
- `czeonia.ts` — 2 occurrences of manual `content` + 1 `catch`
- `omo.ts` — 2 + 1
- `skd.ts` — 1 + 1
- `pribor.ts` — 2 + 2 (two tools)
- `forward.ts` — 2 + 1
- `fxrates.ts` — 2 + 2 (two tools, each with custom fallback messages)
- `convert.ts` — 1 success + 1 catch (keep custom error messages for currency-not-found)

`exrates.ts` already uses `ok()`/`fail()` locally — just replace with the imported versions and delete the local definitions.

**Files changed:**
- New: `src/tools/response.ts`
- Modified: `src/tools/exrates.ts` (remove local `ok`/`fail`, import shared)
- Modified: all other 7 tool files (import and use `ok`/`fail`)

---

## Phase 4: Verification

1. `npm run typecheck` — no type errors
2. `npm run lint` — no lint issues
3. `npm run format:check` — code formatted
4. `npm run test` — all 159+ tests pass
5. `npm run build` — compiles successfully

---

## Summary of Review Issues Addressed

| # | Review | Issue | Phase |
|---|--------|-------|-------|
| 1 | Testing | Massive mock duplication | 1.1 |
| 2 | Testing | Brittle error mocking (fake CnbApiError) | 1.2 |
| 3 | Testing | Weak type safety (`as never`) | 1.1 |
| 4 | Testing | Incomplete `fetch` mocking | 1.3 |
| 5 | Testing | Edge case coverage | 2.4 |
| 6 | Validation | Inconsistent `skd.ts` inputSchema | 2.1 |
| 7 | Validation | Partial `validationError` adoption | 2.2 |
| 8 | Validation | Date validation precision | 2.4 |
| 9 | Validation | Type casting in `validateAverages` | 2.3 |
| 10 | Validation | `forward.ts` error handling inconsistency | 2.2 |

### Not addressed (deliberate):
- **Test colocation** (Review #5): keeping colocated `*.test.ts` — this is a project convention and the `tsconfig.json` already excludes them from build.
- **Full Response mock** (msw library): adding `text()` + `headers` to the mock is sufficient; msw is overkill for this project's scope.
