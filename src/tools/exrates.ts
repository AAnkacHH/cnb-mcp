import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cnbFetch } from "../api/client.js";
import {
  dateSchema,
  currencyCodeSchema,
  yearMonthSchema,
  yearSchema,
  langSchema,
} from "../validators/schemas.js";
import { validateAverages } from "../validators/exrates.js";
import type {
  ExRatesDailyResponse,
  ExRatesCurrencyMonthResponse,
  ExRateAveragesResponse,
} from "../types.js";

import { ok, fail } from "./response.js";

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
        currency: currencyCodeSchema
          .optional()
          .describe(
            "ISO 4217 currency code (e.g., EUR, USD). Returns all years for this currency.",
          ),
        year: yearSchema
          .optional()
          .describe("Year (e.g., 2024). Returns all currencies for this year."),
      }),
    },
    async ({ currency, year }) => {
      try {
        const validation = validateAverages({ currency, year });
        if (!validation.ok) return fail(validation.error);

        if (validation.data.endpoint === "year") {
          const data = await cnbFetch<ExRateAveragesResponse>(endpoints.year, {
            year: validation.data.year,
          });
          return ok(data);
        }

        const data = await cnbFetch<ExRateAveragesResponse>(endpoints.currency, {
          currency: validation.data.currency,
        });
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
        date: dateSchema.optional().describe("Date in YYYY-MM-DD format. Defaults to today."),
        lang: langSchema.optional().describe("Language for country/currency names."),
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
        currency: currencyCodeSchema.describe("ISO 4217 currency code (e.g., EUR, USD)."),
        yearMonth: yearMonthSchema
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
        year: yearSchema.optional().describe("Year (e.g., 2024). Defaults to the current year."),
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
