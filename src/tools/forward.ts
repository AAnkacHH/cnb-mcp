import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cnbFetch, CnbApiError } from "../api/client.js";
import type { ForwardResponse } from "../types.js";

export function registerForwardTools(server: McpServer): void {
  server.registerTool(
    "cnb_forward_rates",
    {
      title: "CNB Forward Rates",
      description:
        "Get forward currency points for EUR/CZK and USD/CZK. " +
        "If 'dateFrom' is provided, returns data for a date range (with optional currency pair and maturity filters). " +
        "Otherwise returns all forward points for a single date.",
      inputSchema: z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe(
            "Date in YYYY-MM-DD format. Defaults to today. Used when 'dateFrom' is not provided.",
          ),
        currencyPair: z
          .enum(["ALL", "EUR_TO_CZK", "USD_TO_CZK"])
          .optional()
          .describe("Currency pair filter. Defaults to ALL. Used only with date range queries."),
        maturity: z
          .enum(["ALL", "THREE_MONTH", "SIX_MONTH"])
          .optional()
          .describe("Maturity filter. Defaults to ALL. Used only with date range queries."),
        dateFrom: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe(
            "Start date for range query in YYYY-MM-DD format. If provided, triggers range endpoint.",
          ),
        dateTo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("End date for range query in YYYY-MM-DD format. Defaults to today."),
      }),
    },
    async ({ date, currencyPair, maturity, dateFrom, dateTo }) => {
      try {
        if (dateFrom !== undefined) {
          const data = await cnbFetch<ForwardResponse>(
            "/forward/daily-range-currency-pair-maturity",
            {
              currencyPair: currencyPair ?? "ALL",
              dateFrom,
              dateTo,
              maturity: maturity ?? "ALL",
            },
          );
          return {
            content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
          };
        }

        const data = await cnbFetch<ForwardResponse>("/forward/daily", { date });
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
