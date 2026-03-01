import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cnbFetch, CnbApiError } from "../api/client.js";
import { dateSchema, yearSchema } from "../validators/schemas.js";
import { validateDateOrYear } from "../validators/base.js";
import type { CzeoniaDailyResponse, CzeoniaYearResponse } from "../types.js";

export function registerCzeoniaTools(server: McpServer): void {
  server.registerTool(
    "cnb_czeonia",
    {
      title: "CNB CZEONIA Rate",
      description:
        "Get CZEONIA (Czech Overnight Index Average) rate — the actual rate on unsecured overnight CZK deposits. " +
        "If 'year' is provided, returns all daily rates for that year. Otherwise returns the rate for a specific date.",
      inputSchema: z.object({
        date: dateSchema
          .optional()
          .describe("Date in YYYY-MM-DD format. Defaults to today. Ignored if 'year' is provided."),
        year: yearSchema
          .optional()
          .describe("Year (e.g. 2024). If provided, returns all CZEONIA rates for that year."),
      }),
    },
    async ({ date, year }) => {
      try {
        const route = validateDateOrYear({ date, year });

        if (route.endpoint === "year") {
          const data = await cnbFetch<CzeoniaYearResponse>("/czeonia/daily-year", {
            year: route.year,
          });
          return {
            content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
          };
        }

        const data = await cnbFetch<CzeoniaDailyResponse>("/czeonia/daily", {
          date: route.date,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof CnbApiError ? err.message : "Unexpected error";
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    },
  );
}
