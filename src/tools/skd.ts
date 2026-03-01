import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cnbFetch, CnbApiError } from "../api/client.js";
import type { SkdResponse } from "../types.js";

export function registerSkdTools(server: McpServer): void {
  server.registerTool(
    "cnb_short_term_bonds",
    {
      title: "CNB Short-Term Bonds",
      description:
        "Get short-term government bond (SKD) prices and nominal values for a specific date.",
      inputSchema: z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Date in YYYY-MM-DD format. Defaults to today."),
      }),
    },
    async ({ date }) => {
      try {
        const data = await cnbFetch<SkdResponse>("/skd/daily", { date });
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
