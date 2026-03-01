# Code Review: Extract Input Validation (Commit a11b47e)

## Overview
The commit successfully centralizes input validation and endpoint routing logic into a dedicated `validators` directory. This significantly improves consistency across tools and reduces code duplication.

## Issues & Observations

### 1. Inconsistent Tool Registration Schema
In `src/tools/skd.ts`, the `inputSchema` was changed from a `z.object()` to a plain object:
```typescript
// src/tools/skd.ts
inputSchema: {
  date: dateSchema.optional().describe("Date in YYYY-MM-DD format. Defaults to today."),
}
```
While the MCP SDK might support this, it is inconsistent with all other tools in the codebase (e.g., `czeonia.ts`, `convert.ts`, `exrates.ts`) which use `z.object({...})`. This could lead to confusing patterns or potential issues if the SDK version changes.

### 2. Partial Adoption of `validationError` Helper
The `validationError` helper was introduced in `src/validators/base.ts` to standardize MCP error responses. However, it is not used in all tools:
- **Used in:** `convert.ts`, `exrates.ts`.
- **Not used in:** `forward.ts`, `pribor.ts`.

Example from `forward.ts`:
```typescript
if (!route.ok) {
  return {
    content: [{ type: "text" as const, text: route.error }],
    isError: true,
  };
}
```
This should be replaced with `return validationError(route.error);` for consistency.

### 3. Date Validation Precision
The `dateSchema` in `src/validators/schemas.ts` uses a regex for format validation:
```typescript
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");
```
While this ensures the string looks like a date, it doesn't prevent invalid dates like `2024-13-45`. While the CNB API will likely reject these, catching them at the validator level would be more robust.

### 4. Type Casting in `validateAverages`
In `src/validators/exrates.ts`, there is an explicit type cast:
```typescript
return valid({ endpoint: "currency", currency: input.currency as string });
```
Although safe due to the preceding `undefined` check, this could be avoided by using a temporary variable or more refined type guards to keep the code cleaner and truly type-safe without "escape hatches".

### 5. `forward.ts` Error Handling Inconsistency
In `forward.ts`, the error response for a failed validation is manually constructed and doesn't use the standard `validationError` helper, which is a missed opportunity for standardization introduced in this very commit.

## Recommendations
1. Wrap the `inputSchema` in `src/tools/skd.ts` with `z.object()`.
2. Refactor `forward.ts` and `pribor.ts` to use the `validationError` helper.
3. Consider using a more robust date validator if business logic requires strictly valid dates before hitting the API.
