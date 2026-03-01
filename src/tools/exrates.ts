import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cnbFetch, CnbApiError } from "../api/client.js";
import type {
  ExRatesDailyResponse,
  ExRatesCurrencyMonthResponse,
  ExRateAveragesResponse,
} from "../types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function fail(err: unknown) {
  const msg = err instanceof CnbApiError ? err.message : "Unexpected error";
  return {
    content: [{ type: "text" as const, text: msg }],
    isError: true as const,
  };
}

// ---------------------------------------------------------------------------
// Average-style tool factory (tools 4-6 share the same pattern)
// ---------------------------------------------------------------------------

interface AverageEndpoints {
  currency: string; // e.g. "/exrates/monthly-averages-currency"
  year: string; // e.g. "/exrates/monthly-averages-year"
}

function registerAverageTool(
  server: McpServer,
  name: string,
  title: string,
  description: string,
  endpoints: AverageEndpoints,
): void {
  server.registerTool(
    name,
    {
      title,
      description,
      inputSchema: z.object({
        currency: z
          .string()
          .regex(/^[A-Z]{3}$/)
          .optional()
          .describe(
            "ISO 4217 currency code (e.g., EUR, USD). Returns all years for this currency.",
          ),
        year: z
          .number()
          .int()
          .min(1991)
          .max(2100)
          .optional()
          .describe("Year (e.g., 2024). Returns all currencies for this year."),
      }),
    },
    async ({ currency, year }) => {
      try {
        if (currency === undefined && year === undefined) {
          return fail(
            new CnbApiError(
              400,
              endpoints.year,
              "At least one of 'currency' or 'year' must be provided.",
            ),
          );
        }

        // If year is given (or both), prefer the year endpoint (returns all currencies).
        if (year !== undefined) {
          const data = await cnbFetch<ExRateAveragesResponse>(endpoints.year, {
            year,
          });
          return ok(data);
        }

        // Only currency is given.
        const data = await cnbFetch<ExRateAveragesResponse>(endpoints.currency, { currency });
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerExratesTools(server: McpServer): void {
  // -----------------------------------------------------------------------
  // 1. cnb_exchange_rates_daily
  // -----------------------------------------------------------------------
  server.registerTool(
    "cnb_exchange_rates_daily",
    {
      title: "CNB Daily Exchange Rates",
      description: "Get official CZK exchange rates for a specific date (~27 major currencies).",
      inputSchema: z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Date in YYYY-MM-DD format. Defaults to today."),
        lang: z
          .enum(["CZ", "EN"])
          .optional()
          .default("EN")
          .describe("Language for country/currency names."),
      }),
    },
    async ({ date, lang }) => {
      try {
        const data = await cnbFetch<ExRatesDailyResponse>("/exrates/daily", {
          date,
          lang,
        });
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 2. cnb_exchange_rates_monthly
  // -----------------------------------------------------------------------
  server.registerTool(
    "cnb_exchange_rates_monthly",
    {
      title: "CNB Monthly Exchange Rates",
      description: "Get daily exchange rates for a specific currency during a given month.",
      inputSchema: z.object({
        currency: z
          .string()
          .regex(/^[A-Z]{3}$/)
          .describe("ISO 4217 currency code (e.g., EUR, USD)."),
        yearMonth: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional()
          .describe("Month in YYYY-MM format. Defaults to the current month."),
      }),
    },
    async ({ currency, yearMonth }) => {
      try {
        const data = await cnbFetch<ExRatesCurrencyMonthResponse>("/exrates/daily-currency-month", {
          currency,
          yearMonth,
        });
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 3. cnb_exchange_rates_year
  // -----------------------------------------------------------------------
  server.registerTool(
    "cnb_exchange_rates_year",
    {
      title: "CNB Yearly Exchange Rates",
      description:
        "Get all daily exchange rates for an entire year. Returns data for all currencies.",
      inputSchema: z.object({
        year: z
          .number()
          .int()
          .min(1991)
          .max(2100)
          .optional()
          .describe("Year (e.g., 2024). Defaults to the current year."),
      }),
    },
    async ({ year }) => {
      try {
        const data = await cnbFetch<ExRatesDailyResponse>("/exrates/daily-year", { year });
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 4. cnb_exchange_rates_monthly_averages
  // -----------------------------------------------------------------------
  registerAverageTool(
    server,
    "cnb_exchange_rates_monthly_averages",
    "CNB Monthly Average Exchange Rates",
    "Get monthly average exchange rates. Provide 'currency' for all years of that currency, or 'year' for all currencies in that year. If both are given, year takes priority.",
    {
      currency: "/exrates/monthly-averages-currency",
      year: "/exrates/monthly-averages-year",
    },
  );

  // -----------------------------------------------------------------------
  // 5. cnb_exchange_rates_quarterly_averages
  // -----------------------------------------------------------------------
  registerAverageTool(
    server,
    "cnb_exchange_rates_quarterly_averages",
    "CNB Quarterly Average Exchange Rates",
    "Get quarterly average exchange rates. Provide 'currency' for all years of that currency, or 'year' for all currencies in that year. If both are given, year takes priority.",
    {
      currency: "/exrates/quarterly-averages-currency",
      year: "/exrates/quarterly-averages-year",
    },
  );

  // -----------------------------------------------------------------------
  // 6. cnb_exchange_rates_cumulative_averages
  // -----------------------------------------------------------------------
  registerAverageTool(
    server,
    "cnb_exchange_rates_cumulative_averages",
    "CNB Cumulative Monthly Average Exchange Rates",
    "Get cumulative monthly average exchange rates (running average from start of year). Provide 'currency' for all years of that currency, or 'year' for all currencies in that year. If both are given, year takes priority.",
    {
      currency: "/exrates/monthly-cumulative-averages-currency",
      year: "/exrates/monthly-cumulative-averages-year",
    },
  );
}
