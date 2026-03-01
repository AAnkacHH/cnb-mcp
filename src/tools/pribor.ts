import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { cnbFetch } from "../api/client.js";
import {
  dateSchema,
  priborYearSchema,
  PRIBOR_PERIOD,
  priborPeriodSchema,
} from "../validators/schemas.js";
import { validatePriborYear } from "../validators/pribor.js";
import { validationError } from "../validators/base.js";
import { ok, fail } from "./response.js";
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
        return ok(data);
      } catch (err) {
        return fail(err);
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
        if (!route.ok) return validationError(route.error);

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

        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );
}
