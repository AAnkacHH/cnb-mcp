<div align="center">

# MCP server for the Czech National Bank API

[![npm](https://img.shields.io/npm/v/cnb-mcp?color=cb0000)](https://www.npmjs.com/package/cnb-mcp)
[![CI](https://github.com/AAnkacHH/cnb-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/AAnkacHH/cnb-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-compatible-8A2BE2)](https://modelcontextprotocol.io/)

Access exchange rates, interbank rates, forward points, and more from the [Czech National Bank](https://www.cnb.cz/) — directly from your AI assistant via the [Model Context Protocol](https://modelcontextprotocol.io/).

No API key required.

</div>

---

## Features

| Category | Tools | Description |
|----------|:-----:|-------------|
| Exchange Rates | 6 | Daily fixing for ~27 major currencies, monthly/yearly history, averages |
| FX Rates | 2 | ~200 exotic currencies updated monthly |
| PRIBOR | 2 | Prague InterBank Offered Rate for all maturities |
| CZEONIA | 1 | Czech Overnight Index Average |
| Forward Rates | 1 | EUR/CZK and USD/CZK forward points |
| Open Market Ops | 1 | CNB repo tenders and money market operations |
| Short-Term Bonds | 1 | Government bond prices and nominal values |
| Currency Converter | 1 | Cross-rate conversion using official CNB fixing |

Plus a `cnb://info` resource and an `analyze-currency-trend` prompt.

## Quick Start

No installation needed — runs directly via `npx`.

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cnb": {
      "command": "npx",
      "args": ["-y", "cnb-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add cnb -- npx -y cnb-mcp
```

> See [Configuration Guide](docs/configuration.md) for all setup options including manual installation.

## Tools at a Glance

```
cnb_exchange_rates_daily              Today's rates for ~27 currencies
cnb_exchange_rates_monthly            Daily rates for one currency over a month
cnb_exchange_rates_year               All rates for an entire year
cnb_exchange_rates_monthly_averages   Monthly average rates
cnb_exchange_rates_quarterly_averages Quarterly average rates
cnb_exchange_rates_cumulative_averages Cumulative monthly averages
cnb_fx_rates_monthly                  Exotic currency rates (~200)
cnb_fx_rates_currency                 Exotic currency history
cnb_pribor_daily                      PRIBOR rates for a date
cnb_pribor_year                       PRIBOR rates for a year
cnb_czeonia                           Overnight index average
cnb_forward_rates                     Forward currency points
cnb_open_market_operations            Repo tenders and OMO data
cnb_short_term_bonds                  Government bond prices
cnb_convert_currency                  Currency conversion with cross-rates
```

> Full parameter documentation: **[Tools Reference](docs/tools.md)**

## Example Prompts

- "What is today's EUR/CZK exchange rate?"
- "Convert 1000 EUR to CZK"
- "PRIBOR 3-month rate history for 2024"
- "How has the Turkish lira changed over the past 6 months?"
- "100 EUR to GBP at today's CNB rate"

## Documentation

| Document | Description |
|----------|-------------|
| [Configuration](docs/configuration.md) | Installation, setup for Claude Desktop/Code, resource & prompt |
| [Tools Reference](docs/tools.md) | All 15 tools with parameters, types, and example prompts |
| [API Reference](docs/api-reference.md) | CNB API details, update schedule, currencies, error handling |
| [Contributing](docs/contributing.md) | Development setup, project structure, scripts, CI pipeline |

## Disclaimer

> The CNB API returns exchange rates with **3 decimal places** — this is the official precision of the CNB fixing. Converted amounts are rounded to match this precision. For legally binding rates, always verify against the [official CNB website](https://www.cnb.cz/).

## License

[MIT](LICENSE)
