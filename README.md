# cnb-mcp

MCP server for the [Czech National Bank (ČNB)](https://www.cnb.cz/) public REST API. Provides 15 tools for accessing exchange rates, interbank rates, overnight rates, forward points, open market operations, and short-term bond data — all directly from your AI assistant via the [Model Context Protocol](https://modelcontextprotocol.io/).

No API key required. Data sourced from `https://api.cnb.cz/cnbapi`.

## Features

- **Exchange rates** — daily fixing for ~27 major currencies, monthly/yearly history, monthly/quarterly/cumulative averages
- **FX rates** — ~200 exotic currencies updated monthly
- **PRIBOR** — Prague InterBank Offered Rate for all maturities
- **CZEONIA** — Czech Overnight Index Average
- **Forward rates** — EUR/CZK and USD/CZK forward points
- **Open market operations** — CNB repo tenders and money market operations
- **Short-term bonds** — government bond prices and nominal values
- **Currency converter** — cross-rate conversion using official CNB fixing
- **Resource** — static info about the CNB API (update schedule, supported currencies)
- **Prompt** — guided currency trend analysis

## Installation

```bash
git clone https://github.com/your-username/cnb-mcp.git
cd cnb-mcp
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cnb": {
      "command": "node",
      "args": ["/absolute/path/to/cnb-mcp/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/cnb-mcp` with the actual path where you cloned the repository.

### Claude Code

```bash
claude mcp add cnb node /absolute/path/to/cnb-mcp/dist/index.js
```

## Tools

### Exchange Rates (Major Currencies)

Official CZK fixing published each business day around 14:30 CET for ~27 major currencies.

#### `cnb_exchange_rates_daily`

Get official CZK exchange rates for a specific date.

| Parameter | Type     | Required | Default | Description                          |
|-----------|----------|----------|---------|--------------------------------------|
| `date`    | `string` | No       | today   | Date in `YYYY-MM-DD` format         |
| `lang`    | `string` | No       | `EN`    | Language for names: `CZ` or `EN`    |

**Example use cases:**
- "What is today's EUR/CZK exchange rate?"
- "Show all exchange rates for 2025-01-15"

#### `cnb_exchange_rates_monthly`

Daily rates for a specific currency over a given month.

| Parameter   | Type     | Required | Default       | Description                    |
|-------------|----------|----------|---------------|--------------------------------|
| `currency`  | `string` | **Yes**  | —             | ISO 4217 code (e.g. `EUR`)    |
| `yearMonth` | `string` | No       | current month | Month in `YYYY-MM` format     |

**Example use cases:**
- "How did EUR/CZK change during January 2025?"
- "USD daily rates for last month"

#### `cnb_exchange_rates_year`

All daily exchange rates for an entire year.

| Parameter | Type      | Required | Default      | Description |
|-----------|-----------|----------|--------------|-------------|
| `year`    | `integer` | No       | current year | Year        |

**Example use cases:**
- "All exchange rates for 2024"
- "Yearly EUR/CZK dynamics"

#### `cnb_exchange_rates_monthly_averages`

Monthly average exchange rates. Provide at least one of `currency` or `year`.

| Parameter  | Type      | Required | Default      | Description                  |
|------------|-----------|----------|--------------|------------------------------|
| `currency` | `string`  | No*      | —            | ISO 4217 currency code       |
| `year`     | `integer` | No*      | current year | Year                         |

\* At least one parameter is required. If `currency` is given, returns all years for that currency. If `year` is given, returns all currencies for that year.

**Example use cases:**
- "Average EUR/CZK rate for each month of 2024"
- "Monthly averages for USD across all years"

#### `cnb_exchange_rates_quarterly_averages`

Quarterly average exchange rates. Same parameter logic as monthly averages.

| Parameter  | Type      | Required | Default      | Description                  |
|------------|-----------|----------|--------------|------------------------------|
| `currency` | `string`  | No*      | —            | ISO 4217 currency code       |
| `year`     | `integer` | No*      | current year | Year                         |

\* At least one parameter is required.

**Example use cases:**
- "Quarterly EUR averages for 2024"
- "Q1-Q4 comparison for all currencies in 2023"

#### `cnb_exchange_rates_cumulative_averages`

Cumulative monthly averages (running average from the start of the year). Same parameter logic as monthly averages.

| Parameter  | Type      | Required | Default      | Description                  |
|------------|-----------|----------|--------------|------------------------------|
| `currency` | `string`  | No*      | —            | ISO 4217 currency code       |
| `year`     | `integer` | No*      | current year | Year                         |

\* At least one parameter is required.

**Example use cases:**
- "Year-to-date average EUR/CZK rate per month"
- "Cumulative average for GBP in 2024"

---

### FX Rates (Exotic Currencies)

Rates for ~200 less common currencies, updated on the last business day of each month.

#### `cnb_fx_rates_monthly`

All exotic currency rates for a given month.

| Parameter   | Type     | Required | Default       | Description                       |
|-------------|----------|----------|---------------|-----------------------------------|
| `yearMonth` | `string` | No       | current month | Month in `YYYY-MM` format        |
| `lang`      | `string` | No       | `EN`          | Language for names: `CZ` or `EN` |

**Example use cases:**
- "What is the Thai baht rate?"
- "List all exotic currency rates"

#### `cnb_fx_rates_currency`

Historical rates for a specific exotic currency over a range of months.

| Parameter      | Type     | Required | Default       | Description                       |
|----------------|----------|----------|---------------|-----------------------------------|
| `currency`     | `string` | **Yes**  | —             | ISO 4217 currency code            |
| `yearMonthFrom`| `string` | No       | —             | Start month `YYYY-MM`             |
| `yearMonthTo`  | `string` | No       | current month | End month `YYYY-MM`               |
| `lang`         | `string` | No       | `EN`          | Language for names: `CZ` or `EN` |

**Example use cases:**
- "ARS/CZK history from 2024-01 to 2024-12"
- "How has the Turkish lira changed over the past 6 months?"

---

### PRIBOR (Interbank Rates)

Prague InterBank Offered Rate — key reference for mortgages and corporate lending in the Czech Republic.

#### `cnb_pribor_daily`

PRIBOR rates for all maturities on a specific date.

| Parameter | Type     | Required | Default | Description                  |
|-----------|----------|----------|---------|------------------------------|
| `date`    | `string` | No       | today   | Date in `YYYY-MM-DD` format |

Returns rates for: 1 day, 1 week, 2 weeks, 1/2/3/6/9 months, 1 year.

**Example use cases:**
- "What is the current PRIBOR rate?"
- "Show interbank rates for 2025-02-01"

#### `cnb_pribor_year`

Daily PRIBOR rates for an entire year, optionally filtered by maturity.

| Parameter | Type      | Required | Default      | Description                              |
|-----------|-----------|----------|--------------|------------------------------------------|
| `year`    | `integer` | No       | current year | Year                                     |
| `period`  | `string`  | No       | all periods  | Maturity period (see values below)       |

**Period values:** `ONE_DAY`, `ONE_WEEK`, `TWO_WEEKS`, `ONE_MONTH`, `TWO_MONTH`, `THREE_MONTH`, `SIX_MONTH`, `NINE_MONTH`, `ONE_YEAR`

**Example use cases:**
- "PRIBOR 3-month rate history for 2024"
- "All PRIBOR maturities for the current year"

---

### CZEONIA (Overnight Rate)

Czech Overnight Index Average — the actual rate on unsecured overnight deposits.

#### `cnb_czeonia`

CZEONIA rate for a single date or all rates for a year.

| Parameter | Type      | Required | Default      | Description                          |
|-----------|-----------|----------|--------------|--------------------------------------|
| `date`    | `string`  | No       | today        | Date in `YYYY-MM-DD` format         |
| `year`    | `integer` | No       | —            | Year (returns full year of data)     |

If `year` is provided, returns all daily rates for that year. Otherwise, returns the rate for a single date.

**Example use cases:**
- "What is the CZEONIA rate today?"
- "CZEONIA rates for all of 2024"

---

### Forward Rates

Forward points for EUR/CZK and USD/CZK currency pairs.

#### `cnb_forward_rates`

Forward points for a single date or a date range.

| Parameter      | Type     | Required | Default | Description                                          |
|----------------|----------|----------|---------|------------------------------------------------------|
| `date`         | `string` | No       | today   | Date in `YYYY-MM-DD` (for single-day query)         |
| `currencyPair` | `string` | No       | `ALL`   | `EUR_TO_CZK`, `USD_TO_CZK`, or `ALL`               |
| `maturity`     | `string` | No       | `ALL`   | `THREE_MONTH`, `SIX_MONTH`, or `ALL`                |
| `dateFrom`     | `string` | No       | —       | Start date `YYYY-MM-DD` (switches to range query)   |
| `dateTo`       | `string` | No       | today   | End date `YYYY-MM-DD`                               |

If `dateFrom` is provided, returns data for the date range. Otherwise, returns data for a single date.

**Example use cases:**
- "EUR/CZK forward points today"
- "3-month USD/CZK forward points from 2025-01-01 to 2025-02-01"

---

### Open Market Operations

CNB repo tenders and other money market operations.

#### `cnb_open_market_operations`

OMO data for a single date or an entire year.

| Parameter | Type      | Required | Default      | Description                          |
|-----------|-----------|----------|--------------|--------------------------------------|
| `date`    | `string`  | No       | today        | Date in `YYYY-MM-DD` format         |
| `year`    | `integer` | No       | —            | Year (returns full year of data)     |

If `year` is provided, returns all operations for that year. Otherwise, returns operations for a single date.

**Example use cases:**
- "Latest CNB repo tender results"
- "All open market operations in 2024"

---

### Short-Term Bonds

Government short-term bond prices and settlement data.

#### `cnb_short_term_bonds`

Short-term bond data for a specific date.

| Parameter | Type     | Required | Default | Description                  |
|-----------|----------|----------|---------|------------------------------|
| `date`    | `string` | No       | today   | Date in `YYYY-MM-DD` format |

**Example use cases:**
- "Current short-term bond prices"
- "SKD settlement data for 2025-02-20"

---

### Currency Converter

#### `cnb_convert_currency`

Convert between any two currencies using official CNB exchange rates. Supports cross-rate conversion (e.g. EUR to GBP via CZK).

| Parameter | Type     | Required | Default | Description                         |
|-----------|----------|----------|---------|-------------------------------------|
| `amount`  | `number` | **Yes**  | —       | Amount to convert                   |
| `from`    | `string` | **Yes**  | —       | Source currency (ISO 4217 code)     |
| `to`      | `string` | **Yes**  | —       | Target currency (ISO 4217 code)    |
| `date`    | `string` | No       | today   | Rate date in `YYYY-MM-DD` format   |

**Example use cases:**
- "Convert 1000 EUR to CZK"
- "How many USD is 5000 CZK?"
- "100 EUR to GBP at today's CNB rate"

## Resource

### `cnb://info`

Static resource providing information about the CNB API: data update schedule, list of supported major and exotic currencies, timezone, and authentication details.

Access it by asking your assistant to read the `cnb://info` resource.

**Contents include:**
- Data source and Swagger documentation URLs
- Update schedule (exchange rates ~14:30 CET on business days, FX rates monthly, etc.)
- List of ~27 major currencies
- Note on ~200 exotic currencies via FX rates
- Timezone: Europe/Prague (CET/CEST)
- Weekend/holiday behavior

## Prompt

### `analyze-currency-trend`

A guided prompt that helps analyze the trend of a currency against CZK over a chosen period.

| Parameter  | Type     | Required | Default | Description                            |
|------------|----------|----------|---------|----------------------------------------|
| `currency` | `string` | **Yes**  | —       | ISO 4217 currency code (e.g. EUR, USD) |
| `period`   | `string` | No       | `month` | `month`, `quarter`, or `year`          |

When invoked, the prompt instructs the assistant to:

1. Fetch exchange rate data for the relevant period
2. Calculate opening rate, closing rate, high, low, and percentage change
3. Provide analysis of trend direction, key turning points, and volatility

## API Reference

This server wraps the Czech National Bank public REST API. Full API documentation is available at:

**https://api.cnb.cz/cnbapi/swagger-ui.html**

Key details:
- No authentication required
- JSON responses
- Exchange rates updated each business day around 14:30 CET
- FX (exotic) rates updated on the last business day of each month
- On weekends and public holidays, the API returns the last business day's data

## Project Structure

```
cnb-mcp/
├── src/
│   ├── index.ts              # Entry point, server setup, resource & prompt
│   ├── types.ts              # TypeScript interfaces for API responses
│   ├── api/
│   │   └── client.ts         # HTTP client for api.cnb.cz
│   └── tools/
│       ├── exrates.ts        # Exchange rate tools (6)
│       ├── fxrates.ts        # FX rate tools (2)
│       ├── pribor.ts         # PRIBOR tools (2)
│       ├── czeonia.ts        # CZEONIA tool (1)
│       ├── forward.ts        # Forward rates tool (1)
│       ├── omo.ts            # Open market operations tool (1)
│       ├── skd.ts            # Short-term bonds tool (1)
│       └── convert.ts        # Currency converter tool (1)
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT
