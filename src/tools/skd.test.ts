import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerSkdTools } from "./skd.js";

vi.mock("../api/client.js", () => ({
  cnbFetch: vi.fn(),
  CnbApiError: class CnbApiError extends Error {
    constructor(
      public status: number,
      public endpoint: string,
      message: string,
    ) {
      super(message);
      this.name = "CnbApiError";
    }
  },
}));

import { cnbFetch, CnbApiError } from "../api/client.js";

const mockCnbFetch = vi.mocked(cnbFetch);

type ToolHandler = (...args: never[]) => Promise<unknown>;

function createMockServer() {
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
