# Code Review: Testing Implementation

## Overview
The project uses **Vitest** for testing, with a good mix of unit tests for validators/API client and integration-style tests for MCP tool handlers. The testing implementation is generally solid, but there are several areas where it can be improved for maintainability and type safety.

## Issues & Observations

### 1. Massive Mock Duplication
Every tool test (e.g., `convert.test.ts`, `pribor.test.ts`, etc.) re-implements the same `createMockServer` helper and manually mocks `CnbApiError`.
- **Problem:** This leads to hundreds of lines of duplicated code across the `src/**/*.test.ts` files.
- **Risk:** If the tool registration API or `CnbApiError` structure changes, dozens of test files will need manual updates.

### 2. Brittle Error Mocking
Instead of using the actual `CnbApiError` class, tests re-define it:
```typescript
CnbApiError: class CnbApiError extends Error { ... }
```
This "fake" class might not behave exactly like the real one (e.g., missing properties or different inheritance chain), potentially hiding bugs in error handling logic.

### 3. Weak Type Safety (`as never`)
In tool tests, the mock server is often passed using `as never`:
```typescript
registerConvertTools(server as never);
```
This is a "code smell" indicating that the mock server's interface diverges from the real `McpServer`. Using `as never` effectively disables TypeScript's protection for the very interface that connects tools to the server.

### 4. Incomplete `fetch` Mocking
The `mockResponse` helper in `client.test.ts` only implements the `json()` method.
- **Observation:** While sufficient for current needs, it makes the tests fragile. Any future change that uses `response.text()` or checks headers will crash the tests.
- **Recommendation:** Use a more complete mock or a dedicated library like `msw` for network-level mocking.

### 5. Colocation vs. Separation
Tests are colocated within the `src/` directory (e.g., `src/tools/convert.test.ts`).
- **Observation:** This is a matter of preference, but in this project, it significantly clutters the directory structure, especially since every source file has a corresponding test file.

### 6. Edge Case Coverage
While "happy paths" are well-covered, some complex routing logic in validators (e.g., `validateForward`, `validateAverages`) could benefit from more exhaustive combinatorial testing of optional parameters.

## Recommendations

1. **Create a `src/tests/` Utility Folder:**
   - Move `createMockServer` to a shared utility.
   - Provide a properly typed `MockMcpServer` that matches the `McpServer` interface (or a sufficient subset of it) without requiring `as never`.
2. **Refactor Mocking Strategy:**
   - Use `vi.mock` with `factory` to mock only `cnbFetch` while keeping the real `CnbApiError`.
   - Use a shared `Response` factory for `fetch` mocks that provides a more complete Web API surface.
3. **Enhance Validator Tests:**
   - Add tests for "impossible" dates (e.g., February 31st) to confirm whether the validation layer or the API should handle them.
4. **Standardize Test naming:** Ensure all test files consistently follow the `*.test.ts` naming convention (which is already mostly the case).
