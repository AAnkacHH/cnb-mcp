# CNB API Reference

This MCP server wraps the Czech National Bank public REST API.

## Base URL

```
https://api.cnb.cz/cnbapi
```

## Documentation

- **Swagger UI:** https://api.cnb.cz/cnbapi/swagger-ui.html
- **CNB website:** https://www.cnb.cz/

## Authentication

No API key or authentication is required. The API is fully public.

## Data Update Schedule

| Data Type          | Frequency                           | Time           |
|--------------------|-------------------------------------|----------------|
| Exchange rates     | Each business day                   | ~14:30 CET     |
| FX rates (exotic)  | Monthly (last business day)        | —              |
| PRIBOR             | Each business day                   | —              |
| CZEONIA            | Each business day                   | —              |
| Forward rates      | Each business day                   | —              |
| Open market ops    | Each business day                   | —              |
| Short-term bonds   | Each business day                   | —              |

## Supported Currencies

### Major (~27 currencies, daily fixing)

AUD, BGN, BRL, CAD, CHF, CNY, DKK, EUR, GBP, HKD, HUF, IDR, ILS, INR, ISK, JPY, KRW, MXN, MYR, NOK, NZD, PHP, PLN, RON, SEK, SGD, THB, TRY, USD, XDR, ZAR

### Exotic (~200 currencies, monthly)

Available via the `cnb_fx_rates_monthly` and `cnb_fx_rates_currency` tools.

## Timezone

All dates and times use **Europe/Prague (CET/CEST)**.

## Weekend & Holiday Behavior

On weekends and public holidays, the API returns the last business day's data. Requesting a specific weekend date may return a 404 error — the server translates this to a human-readable message.

## Response Format

All responses are JSON. The MCP server returns them as formatted JSON text content.

## Error Handling

The server handles three error categories:

| HTTP Status | Meaning                                                       |
|-------------|---------------------------------------------------------------|
| 400         | Invalid parameters (bad date format, unknown currency, etc.)  |
| 404         | No data for the specified date (weekend, holiday, or future)  |
| Other       | Generic API error with status code and message                |

All errors are returned as MCP error responses with `isError: true`.
