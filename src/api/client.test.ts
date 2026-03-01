import { describe, it, expect, vi, afterEach } from "vitest";
import { CnbApiError, cnbFetch } from "./client.js";

function mockResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
  } as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// CnbApiError
// ---------------------------------------------------------------------------
describe("CnbApiError", () => {
  it("is an instance of Error", () => {
    const err = new CnbApiError(400, "/test", "bad request");
    expect(err).toBeInstanceOf(Error);
  });

  it("has correct name, status, endpoint, and message properties", () => {
    const err = new CnbApiError(404, "/exrates/daily", "not found");
    expect(err.name).toBe("CnbApiError");
    expect(err.status).toBe(404);
    expect(err.endpoint).toBe("/exrates/daily");
    expect(err.message).toBe("not found");
  });
});

// ---------------------------------------------------------------------------
// cnbFetch — URL construction
// ---------------------------------------------------------------------------
describe("cnbFetch — URL construction", () => {
  it("constructs correct base URL with path", async () => {
    const mockFn = vi.fn().mockResolvedValue(mockResponse(200, {}));
    vi.stubGlobal("fetch", mockFn);

    await cnbFetch("/exrates/daily");

    expect(mockFn).toHaveBeenCalledOnce();
    const calledUrl = mockFn.mock.calls[0][0];
    expect(calledUrl).toBe("https://api.cnb.cz/cnbapi/exrates/daily");
  });

  it("appends query params to the URL", async () => {
    const mockFn = vi.fn().mockResolvedValue(mockResponse(200, {}));
    vi.stubGlobal("fetch", mockFn);

    await cnbFetch("/exrates/daily", { date: "2024-01-15", lang: "EN" });

    const calledUrl = mockFn.mock.calls[0][0];
    const url = new URL(calledUrl);
    expect(url.searchParams.get("date")).toBe("2024-01-15");
    expect(url.searchParams.get("lang")).toBe("EN");
  });

  it("filters out undefined params", async () => {
    const mockFn = vi.fn().mockResolvedValue(mockResponse(200, {}));
    vi.stubGlobal("fetch", mockFn);

    await cnbFetch("/exrates/daily", { date: "2024-01-15", lang: undefined });

    const calledUrl = mockFn.mock.calls[0][0];
    const url = new URL(calledUrl);
    expect(url.searchParams.get("date")).toBe("2024-01-15");
    expect(url.searchParams.has("lang")).toBe(false);
  });

  it("filters out null params", async () => {
    const mockFn = vi.fn().mockResolvedValue(mockResponse(200, {}));
    vi.stubGlobal("fetch", mockFn);

    await cnbFetch("/exrates/daily", {
      date: "2024-01-15",
      lang: null as unknown as string,
    });

    const calledUrl = mockFn.mock.calls[0][0];
    const url = new URL(calledUrl);
    expect(url.searchParams.get("date")).toBe("2024-01-15");
    expect(url.searchParams.has("lang")).toBe(false);
  });

  it("filters out empty string params", async () => {
    const mockFn = vi.fn().mockResolvedValue(mockResponse(200, {}));
    vi.stubGlobal("fetch", mockFn);

    await cnbFetch("/exrates/daily", { date: "2024-01-15", lang: "" });

    const calledUrl = mockFn.mock.calls[0][0];
    const url = new URL(calledUrl);
    expect(url.searchParams.get("date")).toBe("2024-01-15");
    expect(url.searchParams.has("lang")).toBe(false);
  });

  it("converts number params to strings", async () => {
    const mockFn = vi.fn().mockResolvedValue(mockResponse(200, {}));
    vi.stubGlobal("fetch", mockFn);

    await cnbFetch("/exrates/daily", { year: 2024 });

    const calledUrl = mockFn.mock.calls[0][0];
    const url = new URL(calledUrl);
    expect(url.searchParams.get("year")).toBe("2024");
  });
});

// ---------------------------------------------------------------------------
// cnbFetch — success
// ---------------------------------------------------------------------------
describe("cnbFetch — success", () => {
  it("returns parsed JSON on 200 response", async () => {
    const payload = { rates: [{ currency: "USD", rate: 22.5 }] };
    const mockFn = vi.fn().mockResolvedValue(mockResponse(200, payload));
    vi.stubGlobal("fetch", mockFn);

    const result = await cnbFetch<typeof payload>("/exrates/daily");

    expect(result).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------
// cnbFetch — error handling
// ---------------------------------------------------------------------------
describe("cnbFetch — error handling", () => {
  it("throws CnbApiError with status 400 and correct message", async () => {
    const mockFn = vi.fn().mockResolvedValue(mockResponse(400));
    vi.stubGlobal("fetch", mockFn);

    await expect(cnbFetch("/exrates/daily")).rejects.toThrowError(CnbApiError);
    await expect(cnbFetch("/exrates/daily")).rejects.toMatchObject({
      status: 400,
      endpoint: "/exrates/daily",
      message:
        "Invalid parameters. Check date format (YYYY-MM-DD), currency code (ISO 4217), and year values.",
    });
  });

  it("throws CnbApiError with status 404 and weekend/holiday message", async () => {
    const mockFn = vi.fn().mockResolvedValue(mockResponse(404));
    vi.stubGlobal("fetch", mockFn);

    await expect(cnbFetch("/exrates/daily")).rejects.toThrowError(CnbApiError);
    await expect(cnbFetch("/exrates/daily")).rejects.toMatchObject({
      status: 404,
      endpoint: "/exrates/daily",
      message:
        "No data available for the specified date/period. This may be a weekend or public holiday.",
    });
  });

  it("throws CnbApiError with generic message on other error statuses", async () => {
    const mockFn = vi.fn().mockResolvedValue(mockResponse(500));
    vi.stubGlobal("fetch", mockFn);

    await expect(cnbFetch("/exrates/daily")).rejects.toThrowError(CnbApiError);
    await expect(cnbFetch("/exrates/daily")).rejects.toMatchObject({
      status: 500,
      endpoint: "/exrates/daily",
      message: "CNB API error: 500 Error",
    });
  });
});
