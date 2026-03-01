import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cnbFetch, CnbApiError } from "../api/client.js";
import type { FxRatesDailyMonthResponse, FxRatesCurrencyRangeResponse } from "../types.js";

export function registerFxratesTools(server: McpServer): void {
  // --- Tool 1: cnb_fx_rates_monthly ---
  server.registerTool(
    "cnb_fx_rates_monthly",
    {
      title: "CNB FX Rates Monthly",
      description:
        "Get FX rates for less common (exotic) currencies for a given month (~200 currencies). " +
        "These rates are published monthly (last business day of the month, valid for the next month). " +
        "Use this when the standard exchange rates tool does not include the currency you need.",
      inputSchema: z.object({
        yearMonth: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional()
          .describe("Month in YYYY-MM format. Defaults to the current month."),
        lang: z
          .enum(["CZ", "EN"])
          .optional()
          .default("EN")
          .describe("Language for country/currency names."),
      }),
    },
    async ({ yearMonth, lang }) => {
      try {
        const data = await cnbFetch<FxRatesDailyMonthResponse>("/fxrates/daily-month", {
          yearMonth,
          lang,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        const msg =
          err instanceof CnbApiError ? err.message : "Unexpected error while fetching FX rates.";
        return {
          content: [{ type: "text" as const, text: msg }],
          isError: true,
        };
      }
    },
  );

  // --- Tool 2: cnb_fx_rates_currency ---
  server.registerTool(
    "cnb_fx_rates_currency",
    {
      title: "CNB FX Rates Currency History",
      description:
        "Get the history of FX rates for a specific exotic currency over a range of months. " +
        "Useful for tracking how less common currencies changed against CZK over time.",
      inputSchema: z.object({
        currency: z.string().describe("ISO 4217 currency code (e.g., THB, KES, ARS). Required."),
        yearMonthFrom: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional()
          .describe("Start of the range in YYYY-MM format."),
        yearMonthTo: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional()
          .describe("End of the range in YYYY-MM format. Defaults to the current month."),
        lang: z
          .enum(["CZ", "EN"])
          .optional()
          .default("EN")
          .describe("Language for country/currency names."),
      }),
    },
    async ({ currency, yearMonthFrom, yearMonthTo, lang }) => {
      try {
        const data = await cnbFetch<FxRatesCurrencyRangeResponse>("/fxrates/daily-range-currency", {
          currency,
          yearMonthFrom,
          yearMonthTo,
          lang,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        const msg =
          err instanceof CnbApiError
            ? err.message
            : "Unexpected error while fetching FX rate history.";
        return {
          content: [{ type: "text" as const, text: msg }],
          isError: true,
        };
      }
    },
  );
}
