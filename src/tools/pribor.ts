import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { cnbFetch, CnbApiError } from "../api/client.js";
import {
  dateSchema,
  priborYearSchema,
  PRIBOR_PERIOD,
  priborPeriodSchema,
} from "../validators/schemas.js";
import { validatePriborYear } from "../validators/pribor.js";
import type { PriborResponse } from "../types.js";

export function registerPriborTools(server: McpServer): void {
  // ---------- cnb_pribor_daily ----------
  server.tool(
    "cnb_pribor_daily",
    "Get PRIBOR (Prague InterBank Offered Rate) rates for a specific date. " +
      "Returns rates for all terms (1 day to 1 year). " +
      "Important for mortgage and corporate loan pricing in Czechia. " +
      "Note: the pribid field is always null in recent data because PRIBID was discontinued.",
    {
      date: dateSchema.optional().describe("Date in YYYY-MM-DD format. Defaults to today."),
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
      year: priborYearSchema.optional().describe("Year (e.g. 2024). Defaults to the current year."),
      period: priborPeriodSchema
        .optional()
        .describe(
          "PRIBOR term/period to filter by. " +
            `Values: ${PRIBOR_PERIOD.join(", ")}. ` +
            "If omitted, returns all terms.",
        ),
    },
    async ({ year, period }) => {
      try {
        const route = validatePriborYear({ year, period });
        if (!route.ok) {
          return {
            content: [{ type: "text" as const, text: route.error }],
            isError: true,
          };
        }

        let data: PriborResponse;

        if (route.data.endpoint === "specific-term") {
          data = await cnbFetch<PriborResponse>("/pribor/daily-year-term", {
            year: route.data.year,
            period: route.data.period,
          });
        } else {
          data = await cnbFetch<PriborResponse>("/pribor/daily-year", {
            year: route.data.year,
          });
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
