import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerSkdTools } from "../../src/tools/skd.js";
import { createMockServer } from "../helpers/mock-server.js";

vi.mock("../../src/api/client.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/api/client.js")>();
  return { ...original, cnbFetch: vi.fn() };
});

import { cnbFetch, CnbApiError } from "../../src/api/client.js";

const mockCnbFetch = vi.mocked(cnbFetch);

describe("registerSkdTools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockCnbFetch.mockReset();
    server = createMockServer();
    registerSkdTools(server as never);
  });

  it("registers the cnb_short_term_bonds tool", () => {
    expect(server.registerTool).toHaveBeenCalledWith(
      "cnb_short_term_bonds",
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("calls cnbFetch with /skd/daily and the provided date", async () => {
    const mockData = { skds: [{ isin: "CZ0001234567" }] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_short_term_bonds");
    const result = await handler({ date: "2024-01-15" });

    expect(mockCnbFetch).toHaveBeenCalledWith("/skd/daily", { date: "2024-01-15" });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
    });
  });

  it("calls cnbFetch with date undefined when no date is provided", async () => {
    const mockData = { skds: [] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_short_term_bonds");
    await handler({ date: undefined });

    expect(mockCnbFetch).toHaveBeenCalledWith("/skd/daily", { date: undefined });
  });

  it("returns error message when CnbApiError is thrown", async () => {
    mockCnbFetch.mockRejectedValue(new CnbApiError(404, "/skd/daily", "No data available"));

    const handler = server.getHandler("cnb_short_term_bonds");
    const result = await handler({ date: "2024-01-15" });

    expect(result).toEqual({
      content: [{ type: "text", text: "No data available" }],
      isError: true,
    });
  });

  it("returns 'Unexpected error' for non-CnbApiError exceptions", async () => {
    mockCnbFetch.mockRejectedValue(new Error("network failure"));

    const handler = server.getHandler("cnb_short_term_bonds");
    const result = await handler({ date: "2024-01-15" });

    expect(result).toEqual({
      content: [{ type: "text", text: "Unexpected error" }],
      isError: true,
    });
  });
});
