import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCzeoniaTools } from "../../src/tools/czeonia.js";
import { createMockServer } from "../helpers/mock-server.js";

vi.mock("../../src/api/client.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/api/client.js")>();
  return { ...original, cnbFetch: vi.fn() };
});

import { cnbFetch, CnbApiError } from "../../src/api/client.js";

const mockCnbFetch = vi.mocked(cnbFetch);

describe("registerCzeoniaTools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockCnbFetch.mockReset();
    server = createMockServer();
    registerCzeoniaTools(server as never);
  });

  it("registers the cnb_czeonia tool", () => {
    expect(server.registerTool).toHaveBeenCalledWith(
      "cnb_czeonia",
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("calls /czeonia/daily-year when year is provided", async () => {
    const mockData = { rates: [{ validFor: "2024-01-02", rate: 7.05, volumeInCZKmio: 100 }] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_czeonia");
    const result = await handler({ year: 2024 });

    expect(mockCnbFetch).toHaveBeenCalledWith("/czeonia/daily-year", { year: 2024 });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
    });
  });

  it("calls /czeonia/daily when only date is provided", async () => {
    const mockData = { czeoniaDaily: { validFor: "2024-01-15", rate: 7.05, volumeInCZKmio: 100 } };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_czeonia");
    const result = await handler({ date: "2024-01-15" });

    expect(mockCnbFetch).toHaveBeenCalledWith("/czeonia/daily", { date: "2024-01-15" });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
    });
  });

  it("year takes priority when both date and year are provided", async () => {
    const mockData = { rates: [] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_czeonia");
    await handler({ date: "2024-01-15", year: 2024 });

    expect(mockCnbFetch).toHaveBeenCalledWith("/czeonia/daily-year", { year: 2024 });
  });

  it("calls /czeonia/daily with date undefined when no params are given", async () => {
    const mockData = { czeoniaDaily: { validFor: "2024-01-15", rate: 7.05, volumeInCZKmio: 100 } };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_czeonia");
    await handler({});

    expect(mockCnbFetch).toHaveBeenCalledWith("/czeonia/daily", { date: undefined });
  });

  it("returns error message when CnbApiError is thrown", async () => {
    mockCnbFetch.mockRejectedValue(new CnbApiError(404, "/czeonia/daily", "No data available"));

    const handler = server.getHandler("cnb_czeonia");
    const result = await handler({ date: "2024-01-15" });

    expect(result).toEqual({
      content: [{ type: "text", text: "No data available" }],
      isError: true,
    });
  });
});
