import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cnbFetch, CnbApiError } from "../api/client.js";
import {
  dateSchema,
  forwardCurrencyPairSchema,
  forwardMaturitySchema,
} from "../validators/schemas.js";
import { validateForward } from "../validators/forward.js";
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
        date: dateSchema
          .optional()
          .describe(
            "Date in YYYY-MM-DD format. Defaults to today. Used when 'dateFrom' is not provided.",
          ),
        currencyPair: forwardCurrencyPairSchema
          .optional()
          .describe("Currency pair filter. Defaults to ALL. Used only with date range queries."),
        maturity: forwardMaturitySchema
          .optional()
          .describe("Maturity filter. Defaults to ALL. Used only with date range queries."),
        dateFrom: dateSchema
          .optional()
          .describe(
            "Start date for range query in YYYY-MM-DD format. If provided, triggers range endpoint.",
          ),
        dateTo: dateSchema
          .optional()
          .describe("End date for range query in YYYY-MM-DD format. Defaults to today."),
      }),
    },
    async ({ date, currencyPair, maturity, dateFrom, dateTo }) => {
      try {
        const route = validateForward({ date, currencyPair, maturity, dateFrom, dateTo });
        if (!route.ok) {
          return {
            content: [{ type: "text" as const, text: route.error }],
            isError: true,
          };
        }

        if (route.data.endpoint === "range") {
          const data = await cnbFetch<ForwardResponse>(
            "/forward/daily-range-currency-pair-maturity",
            {
              currencyPair: route.data.currencyPair,
              dateFrom: route.data.dateFrom,
              dateTo: route.data.dateTo,
              maturity: route.data.maturity,
            },
          );
          return {
            content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
          };
        }

        const data = await cnbFetch<ForwardResponse>("/forward/daily", {
          date: route.data.date,
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
