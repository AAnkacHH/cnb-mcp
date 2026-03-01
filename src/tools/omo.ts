import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cnbFetch, CnbApiError } from "../api/client.js";
import { dateSchema, yearSchema } from "../validators/schemas.js";
import { validateDateOrYear } from "../validators/base.js";
import type { OmoResponse } from "../types.js";

export function registerOmoTools(server: McpServer): void {
  server.registerTool(
    "cnb_open_market_operations",
    {
      title: "CNB Open Market Operations",
      description:
        "Get CNB open market operations (repo tenders and other money market operations). " +
        "If 'year' is provided, returns all operations for that year. Otherwise returns operations for a specific date.",
      inputSchema: z.object({
        date: dateSchema
          .optional()
          .describe("Date in YYYY-MM-DD format. Defaults to today. Ignored if 'year' is provided."),
        year: yearSchema
          .optional()
          .describe("Year (e.g. 2024). If provided, returns all OMO operations for that year."),
      }),
    },
    async ({ date, year }) => {
      try {
        const route = validateDateOrYear({ date, year });

        if (route.endpoint === "year") {
          const data = await cnbFetch<OmoResponse>("/omo/daily-year", { year: route.year });
          return {
            content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
          };
        }

        const data = await cnbFetch<OmoResponse>("/omo/daily", { date: route.date });
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
