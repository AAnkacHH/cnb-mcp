# Tools Reference

cnb-mcp provides 15 tools organized into 8 categories. All tools return JSON data from the Czech National Bank API.

## Exchange Rates (Major Currencies)

Official CZK fixing published each business day around 14:30 CET for ~27 major currencies.

### `cnb_exchange_rates_daily`

Get official CZK exchange rates for a specific date.

| Parameter | Type     | Required | Default | Description                       |
|-----------|----------|----------|---------|-----------------------------------|
| `date`    | `string` | No       | today   | Date in `YYYY-MM-DD` format      |
| `lang`    | `string` | No       | `EN`    | Language for names: `CZ` or `EN` |

**Example prompts:**
- "What is today's EUR/CZK exchange rate?"
- "Show all exchange rates for 2025-01-15"

### `cnb_exchange_rates_monthly`

Daily rates for a specific currency over a given month.

| Parameter   | Type     | Required | Default       | Description                |
|-------------|----------|----------|---------------|----------------------------|
| `currency`  | `string` | **Yes**  | —             | ISO 4217 code (e.g. `EUR`) |
| `yearMonth` | `string` | No       | current month | Month in `YYYY-MM` format  |

**Example prompts:**
- "How did EUR/CZK change during January 2025?"
- "USD daily rates for last month"

### `cnb_exchange_rates_year`

All daily exchange rates for an entire year.

| Parameter | Type      | Required | Default      | Description |
|-----------|-----------|----------|--------------|-------------|
| `year`    | `integer` | No       | current year | Year        |

**Example prompts:**
- "All exchange rates for 2024"
- "Yearly EUR/CZK dynamics"

### `cnb_exchange_rates_monthly_averages`

Monthly average exchange rates. Provide at least one of `currency` or `year`.

| Parameter  | Type      | Required | Default | Description            |
|------------|-----------|----------|---------|------------------------|
| `currency` | `string`  | No\*    | —       | ISO 4217 currency code |
| `year`     | `integer` | No\*    | —       | Year                   |

\* At least one parameter is required. If both are given, `year` takes priority.

**Example prompts:**
- "Average EUR/CZK rate for each month of 2024"
- "Monthly averages for USD across all years"

### `cnb_exchange_rates_quarterly_averages`

Quarterly average exchange rates. Same parameter logic as monthly averages.

| Parameter  | Type      | Required | Default | Description            |
|------------|-----------|----------|---------|------------------------|
| `currency` | `string`  | No\*    | —       | ISO 4217 currency code |
| `year`     | `integer` | No\*    | —       | Year                   |

\* At least one parameter is required.

**Example prompts:**
- "Quarterly EUR averages for 2024"
- "Q1-Q4 comparison for all currencies in 2023"

### `cnb_exchange_rates_cumulative_averages`

Cumulative monthly averages (running average from the start of the year). Same parameter logic.

| Parameter  | Type      | Required | Default | Description            |
|------------|-----------|----------|---------|------------------------|
| `currency` | `string`  | No\*    | —       | ISO 4217 currency code |
| `year`     | `integer` | No\*    | —       | Year                   |

\* At least one parameter is required.

**Example prompts:**
- "Year-to-date average EUR/CZK rate per month"
- "Cumulative average for GBP in 2024"

---

## FX Rates (Exotic Currencies)

Rates for ~200 less common currencies, updated on the last business day of each month.

### `cnb_fx_rates_monthly`

All exotic currency rates for a given month.

| Parameter   | Type     | Required | Default       | Description                       |
|-------------|----------|----------|---------------|-----------------------------------|
| `yearMonth` | `string` | No       | current month | Month in `YYYY-MM` format        |
| `lang`      | `string` | No       | `EN`          | Language for names: `CZ` or `EN` |

**Example prompts:**
- "What is the Thai baht rate?"
- "List all exotic currency rates"

### `cnb_fx_rates_currency`

Historical rates for a specific exotic currency over a range of months.

| Parameter       | Type     | Required | Default       | Description                       |
|-----------------|----------|----------|---------------|-----------------------------------|
| `currency`      | `string` | **Yes**  | —             | ISO 4217 currency code            |
| `yearMonthFrom` | `string` | No       | —             | Start month `YYYY-MM`             |
| `yearMonthTo`   | `string` | No       | current month | End month `YYYY-MM`               |
| `lang`          | `string` | No       | `EN`          | Language for names: `CZ` or `EN` |

**Example prompts:**
- "ARS/CZK history from 2024-01 to 2024-12"
- "How has the Turkish lira changed over the past 6 months?"

---

## PRIBOR (Interbank Rates)

Prague InterBank Offered Rate — key reference for mortgages and corporate lending in Czechia.

### `cnb_pribor_daily`

PRIBOR rates for all maturities on a specific date.

| Parameter | Type     | Required | Default | Description                  |
|-----------|----------|----------|---------|------------------------------|
| `date`    | `string` | No       | today   | Date in `YYYY-MM-DD` format |

Returns rates for: 1 day, 1 week, 2 weeks, 1/2/3/6/9 months, 1 year.

**Example prompts:**
- "What is the current PRIBOR rate?"
- "Show interbank rates for 2025-02-01"

### `cnb_pribor_year`

Daily PRIBOR rates for an entire year, optionally filtered by maturity.

| Parameter | Type      | Required | Default      | Description                        |
|-----------|-----------|----------|--------------|------------------------------------|
| `year`    | `integer` | No       | current year | Year                               |
| `period`  | `string`  | No       | all periods  | Maturity period (see values below) |

**Period values:** `ONE_DAY`, `ONE_WEEK`, `TWO_WEEKS`, `ONE_MONTH`, `TWO_MONTH`, `THREE_MONTH`, `SIX_MONTH`, `NINE_MONTH`, `ONE_YEAR`

**Example prompts:**
- "PRIBOR 3-month rate history for 2024"
- "All PRIBOR maturities for the current year"

---

## CZEONIA (Overnight Rate)

Czech Overnight Index Average — the actual rate on unsecured overnight deposits.

### `cnb_czeonia`

CZEONIA rate for a single date or all rates for a year.

| Parameter | Type      | Required | Default | Description                      |
|-----------|-----------|----------|---------|----------------------------------|
| `date`    | `string`  | No       | today   | Date in `YYYY-MM-DD` format     |
| `year`    | `integer` | No       | —       | Year (returns full year of data) |

If `year` is provided, returns all daily rates for that year. Otherwise, returns the rate for a single date.

**Example prompts:**
- "What is the CZEONIA rate today?"
- "CZEONIA rates for all of 2024"

---

## Forward Rates

Forward points for EUR/CZK and USD/CZK currency pairs.

### `cnb_forward_rates`

Forward points for a single date or a date range.

| Parameter      | Type     | Required | Default | Description                                        |
|----------------|----------|----------|---------|----------------------------------------------------|
| `date`         | `string` | No       | today   | Date in `YYYY-MM-DD` (for single-day query)       |
| `currencyPair` | `string` | No       | `ALL`   | `EUR_TO_CZK`, `USD_TO_CZK`, or `ALL`             |
| `maturity`     | `string` | No       | `ALL`   | `THREE_MONTH`, `SIX_MONTH`, or `ALL`              |
| `dateFrom`     | `string` | No       | —       | Start date `YYYY-MM-DD` (switches to range query) |
| `dateTo`       | `string` | No       | today   | End date `YYYY-MM-DD`                             |

If `dateFrom` is provided, returns data for the date range. Otherwise, returns data for a single date.

**Example prompts:**
- "EUR/CZK forward points today"
- "3-month USD/CZK forward points from 2025-01-01 to 2025-02-01"

---

## Open Market Operations

CNB repo tenders and other money market operations.

### `cnb_open_market_operations`

OMO data for a single date or an entire year.

| Parameter | Type      | Required | Default | Description                      |
|-----------|-----------|----------|---------|----------------------------------|
| `date`    | `string`  | No       | today   | Date in `YYYY-MM-DD` format     |
| `year`    | `integer` | No       | —       | Year (returns full year of data) |

If `year` is provided, returns all operations for that year. Otherwise, returns operations for a single date.

**Example prompts:**
- "Latest CNB repo tender results"
- "All open market operations in 2024"

---

## Short-Term Bonds

Government short-term bond prices and settlement data.

### `cnb_short_term_bonds`

Short-term bond data for a specific date.

| Parameter | Type     | Required | Default | Description                  |
|-----------|----------|----------|---------|------------------------------|
| `date`    | `string` | No       | today   | Date in `YYYY-MM-DD` format |

**Example prompts:**
- "Current short-term bond prices"
- "SKD settlement data for 2025-02-20"

---

## Currency Converter

### `cnb_convert_currency`

Convert between any two currencies using official CNB exchange rates. Supports cross-rate conversion (e.g. EUR to GBP via CZK).

| Parameter | Type     | Required | Default | Description                       |
|-----------|----------|----------|---------|-----------------------------------|
| `amount`  | `number` | **Yes**  | —       | Amount to convert                 |
| `from`    | `string` | **Yes**  | —       | Source currency (ISO 4217 code)   |
| `to`      | `string` | **Yes**  | —       | Target currency (ISO 4217 code)   |
| `date`    | `string` | No       | today   | Rate date in `YYYY-MM-DD` format |

**Example prompts:**
- "Convert 1000 EUR to CZK"
- "How many USD is 5000 CZK?"
- "100 EUR to GBP at today's CNB rate"
