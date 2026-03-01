import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cnbFetch } from "../api/client.js";
import { dateSchema } from "../validators/schemas.js";
import { ok, fail } from "./response.js";
import type { SkdResponse } from "../types.js";

export function registerSkdTools(server: McpServer): void {
  server.registerTool(
    "cnb_short_term_bonds",
    {
      title: "CNB Short-Term Bonds",
      description:
        "Get short-term government bond (SKD) prices and nominal values for a specific date.",
      inputSchema: z.object({
        date: dateSchema.optional().describe("Date in YYYY-MM-DD format. Defaults to today."),
      }),
    },
    async ({ date }) => {
      try {
        const data = await cnbFetch<SkdResponse>("/skd/daily", { date });
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );
}
