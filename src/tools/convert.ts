import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cnbFetch, CnbApiError } from "../api/client.js";
import { currencyCodeSchema, dateSchema } from "../validators/schemas.js";
import { validationError } from "../validators/base.js";
import { validateConvert } from "../validators/convert.js";
import type { ExRatesDailyResponse, ExRate } from "../types.js";

/**
 * Formats a number with thousands separators and fixed decimal places.
 * Uses comma as thousands separator and dot as decimal separator.
 */
function formatAmount(value: number, decimals: number = 2): string {
  const parts = value.toFixed(decimals).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function registerConvertTools(server: McpServer): void {
  server.registerTool(
    "cnb_convert_currency",
    {
      title: "CNB Currency Converter",
      description:
        "Convert between currencies using official CNB (Czech National Bank) exchange rates. " +
        "Supports conversion between CZK and ~27 major currencies, as well as cross-rates " +
        "(e.g. EUR to USD). Uses the daily fixing rate for the specified date.",
      inputSchema: z.object({
        amount: z.number().describe("Amount to convert. Must be greater than zero."),
        from: currencyCodeSchema.describe("Source currency ISO 4217 code (e.g. EUR, USD, CZK)."),
        to: currencyCodeSchema.describe("Target currency ISO 4217 code (e.g. CZK, GBP, JPY)."),
        date: dateSchema
          .optional()
          .describe(
            "Date for the exchange rate in YYYY-MM-DD format. Defaults to today (latest available fixing).",
          ),
      }),
    },
    async ({ amount, from, to, date }) => {
      // --- Validation ---
      const validation = validateConvert({ amount, from, to });
      if (!validation.ok) return validationError(validation.error);

      // --- Same currency: return identity ---
      if (validation.data.sameCurrency) {
        return {
          content: [
            {
              type: "text" as const,
              text: `${formatAmount(amount)} ${from} = ${formatAmount(amount)} ${to}\nNo conversion needed (same currency).`,
            },
          ],
        };
      }

      try {
        // Fetch daily exchange rates
        const data = await cnbFetch<ExRatesDailyResponse>("/exrates/daily", {
          date,
          lang: "EN",
        });

        const rates = data.rates;

        // Determine the fixing date from the first rate entry
        const fixingDate = rates.length > 0 ? rates[0].validFor : (date ?? "today");

        // Helper to find a rate for a given currency code
        function findRate(currencyCode: string): ExRate | undefined {
          return rates.find((r) => r.currencyCode === currencyCode);
        }

        let result: number;
        let rateDisplay: string;

        if (from === "CZK") {
          // Converting FROM CZK to foreign currency
          const toRateEntry = findRate(to);
          if (!toRateEntry) {
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    `Error: Currency "${to}" not found in CNB daily exchange rates. ` +
                    `This currency may be an exotic/less common currency — try using the cnb_fx_rates_monthly ` +
                    `tool to check FX rates for exotic currencies.`,
                },
              ],
              isError: true,
            };
          }

          // CZK -> foreign: result = amount / (rate / amount_multiplier)
          const ratePerUnit = toRateEntry.rate / toRateEntry.amount;
          result = amount / ratePerUnit;
          rateDisplay = `1 ${to} = ${ratePerUnit.toFixed(3)} CZK`;
        } else if (to === "CZK") {
          // Converting FROM foreign currency TO CZK
          const fromRateEntry = findRate(from);
          if (!fromRateEntry) {
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    `Error: Currency "${from}" not found in CNB daily exchange rates. ` +
                    `This currency may be an exotic/less common currency — try using the cnb_fx_rates_monthly ` +
                    `tool to check FX rates for exotic currencies.`,
                },
              ],
              isError: true,
            };
          }

          // Foreign -> CZK: result = amount * (rate / amount_multiplier)
          const ratePerUnit = fromRateEntry.rate / fromRateEntry.amount;
          result = amount * ratePerUnit;
          rateDisplay = `1 ${from} = ${ratePerUnit.toFixed(3)} CZK`;
        } else {
          // Cross-rate: foreign -> foreign via CZK
          const fromRateEntry = findRate(from);
          const toRateEntry = findRate(to);

          if (!fromRateEntry) {
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    `Error: Currency "${from}" not found in CNB daily exchange rates. ` +
                    `This currency may be an exotic/less common currency — try using the cnb_fx_rates_monthly ` +
                    `tool to check FX rates for exotic currencies.`,
                },
              ],
              isError: true,
            };
          }
          if (!toRateEntry) {
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    `Error: Currency "${to}" not found in CNB daily exchange rates. ` +
                    `This currency may be an exotic/less common currency — try using the cnb_fx_rates_monthly ` +
                    `tool to check FX rates for exotic currencies.`,
                },
              ],
              isError: true,
            };
          }

          // Cross-rate: result = amount * (fromRate / fromAmount) / (toRate / toAmount)
          const fromRatePerUnit = fromRateEntry.rate / fromRateEntry.amount;
          const toRatePerUnit = toRateEntry.rate / toRateEntry.amount;
          result = (amount * fromRatePerUnit) / toRatePerUnit;

          const crossRate = fromRatePerUnit / toRatePerUnit;
          rateDisplay = `1 ${from} = ${crossRate.toFixed(3)} ${to}`;
        }

        const output =
          `${formatAmount(amount)} ${from} = ${formatAmount(result)} ${to}\n` +
          `Rate: ${rateDisplay} (CNB fixing for ${fixingDate})`;

        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (err) {
        const msg =
          err instanceof CnbApiError
            ? err.message
            : "Unexpected error occurred during currency conversion.";
        return {
          content: [{ type: "text" as const, text: msg }],
          isError: true,
        };
      }
    },
  );
}
