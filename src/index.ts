#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { registerExratesTools } from "./tools/exrates.js";
import { registerFxratesTools } from "./tools/fxrates.js";
import { registerPriborTools } from "./tools/pribor.js";
import { registerCzeoniaTools } from "./tools/czeonia.js";
import { registerForwardTools } from "./tools/forward.js";
import { registerOmoTools } from "./tools/omo.js";
import { registerSkdTools } from "./tools/skd.js";
import { registerConvertTools } from "./tools/convert.js";

const server = new McpServer({
  name: "cnb-mcp",
  version: "1.0.0",
});

// --- Register all tool groups ---
registerExratesTools(server);
registerFxratesTools(server);
registerPriborTools(server);
registerCzeoniaTools(server);
registerForwardTools(server);
registerOmoTools(server);
registerSkdTools(server);
registerConvertTools(server);

// --- Resource: cnb://info ---

server.registerResource(
  "cnb-info",
  "cnb://info",
  {
    title: "CNB API Information",
    description: "Czech National Bank API info: update times, currencies, limits.",
    mimeType: "text/plain",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: `Czech National Bank (ČNB) API Information
============================================
Data Source: https://api.cnb.cz/cnbapi
Swagger: https://api.cnb.cz/cnbapi/swagger-ui.html

Update Schedule:
- Exchange rates: each business day ~14:30 CET
- FX rates (exotic): monthly (last business day)
- PRIBOR/CZEONIA/Forward/OMO/SKD: each business day

Major Currencies (~27): AUD, BGN, BRL, CAD, CHF, CNY, DKK, EUR, GBP, HKD,
  HUF, IDR, ILS, INR, ISK, JPY, KRW, MXN, MYR, NOK, NZD, PHP, PLN, RON,
  SEK, SGD, THB, TRY, USD, XDR, ZAR

Exotic Currencies: ~200 via FX rates (monthly)
Authentication: None required
Timezone: Europe/Prague (CET/CEST)
Weekend/Holiday: API returns last business day rates`,
      },
    ],
  }),
);

// --- Prompt: analyze-currency-trend ---

server.registerPrompt(
  "analyze-currency-trend",
  {
    title: "Analyze Currency Trend",
    description: "Analyze the trend of a currency against CZK over a chosen period.",
    argsSchema: {
      currency: z.string().describe("ISO 4217 currency code (e.g., EUR, USD)"),
      period: z
        .enum(["month", "quarter", "year"])
        .optional()
        .default("month")
        .describe("Time period for the analysis (default: month)"),
    },
  },
  ({ currency, period }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Analyze the ${currency}/CZK exchange rate trend over the last ${period}.

Steps:
1. Fetch ${currency} data for the relevant period using available CNB tools.
2. Calculate: opening rate, closing rate, high, low, percentage change.
3. Provide analysis: trend direction, key turning points, volatility assessment.`,
        },
      },
    ],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
