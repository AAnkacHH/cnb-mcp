import { vi } from "vitest";

/**
 * Factory for vi.mock("../../src/api/client.js") that keeps the real CnbApiError
 * but replaces cnbFetch with a vi.fn().
 *
 * Usage in test files:
 *   vi.mock("../../src/api/client.js", async (importOriginal) => {
 *     const original = await importOriginal<typeof import("../../src/api/client.js")>();
 *     return { ...original, cnbFetch: vi.fn() };
 *   });
 */
export function mockCnbFetchFactory() {
  return async (importOriginal: () => Promise<typeof import("../../src/api/client.js")>) => {
    const original = await importOriginal();
    return {
      ...original,
      cnbFetch: vi.fn(),
    };
  };
}
