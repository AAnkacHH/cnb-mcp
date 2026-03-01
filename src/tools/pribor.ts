import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cnbFetch, CnbApiError } from "../api/client.js";
import type { PriborResponse } from "../types.js";

const PRIBOR_PERIOD = [
  "ONE_DAY",
  "ONE_WEEK",
  "TWO_WEEKS",
  "ONE_MONTH",
  "TWO_MONTH",
  "THREE_MONTH",
  "SIX_MONTH",
  "NINE_MONTH",
  "ONE_YEAR",
] as const;

export function registerPriborTools(server: McpServer): void {
  // ---------- cnb_pribor_daily ----------
  server.tool(
    "cnb_pribor_daily",
    "Get PRIBOR (Prague InterBank Offered Rate) rates for a specific date. " +
      "Returns rates for all terms (1 day to 1 year). " +
      "Important for mortgage and corporate loan pricing in Czechia. " +
      "Note: the pribid field is always null in recent data because PRIBID was discontinued.",
    {
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Date in YYYY-MM-DD format. Defaults to today."),
    },
    async ({ date }) => {
      try {
        const data = await cnbFetch<PriborResponse>("/pribor/daily", { date });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof CnbApiError ? err.message : "Unexpected error";
        return {
          content: [{ type: "text" as const, text: msg }],
          isError: true,
        };
      }
    },
  );

  // ---------- cnb_pribor_year ----------
  server.tool(
    "cnb_pribor_year",
    "Get daily PRIBOR rates for an entire year. " +
      "Optionally filter by a specific term/period (e.g. THREE_MONTH). " +
      "If period is omitted, returns all terms for every business day. " +
      "Note: the pribid field is always null in recent data because PRIBID was discontinued.",
    {
      year: z
        .number()
        .int()
        .min(1999)
        .optional()
        .describe("Year (e.g. 2024). Defaults to the current year."),
      period: z
        .enum(PRIBOR_PERIOD)
        .optional()
        .describe(
          "PRIBOR term/period to filter by. " +
            "Values: ONE_DAY, ONE_WEEK, TWO_WEEKS, ONE_MONTH, TWO_MONTH, THREE_MONTH, SIX_MONTH, NINE_MONTH, ONE_YEAR. " +
            "If omitted, returns all terms.",
        ),
    },
    async ({ year, period }) => {
      try {
        let data: PriborResponse;

        if (period) {
          // Specific term endpoint
          data = await cnbFetch<PriborResponse>("/pribor/daily-year-term", {
            year,
            period,
          });
        } else {
          // All terms endpoint
          data = await cnbFetch<PriborResponse>("/pribor/daily-year", { year });
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof CnbApiError ? err.message : "Unexpected error";
        return {
          content: [{ type: "text" as const, text: msg }],
          isError: true,
        };
      }
    },
  );
}
