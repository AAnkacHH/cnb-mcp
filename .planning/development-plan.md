# План розробки: cnb-mcp

## Огляд

План розбитий на **8 задач**: 1 послідовна (фундамент) + 7 паралельних.
Загалом: **15 tools** + 1 resource + 1 prompt, **12 source files**.

---

## Граф залежностей

```
TASK 0: Scaffolding (ПОСЛІДОВНО — має бути першим)
  │
  ├──→ TASK 1: exrates.ts (6 tools)            ─┐
  ├──→ TASK 2: fxrates.ts (2 tools)             │
  ├──→ TASK 3: pribor.ts (2 tools)              │
  ├──→ TASK 4: czeonia/forward/omo/skd (4 tools) ├──→ TASK 7: Фінальна інтеграція + README
  ├──→ TASK 5: convert.ts (1 tool)              │
  ├──→ TASK 6: Resource + Prompt                │
  └──→ TASK 7: README (чернетка паралельно)    ─┘
```

---

## TASK 0: Scaffolding (ПОСЛІДОВНО — має бути першим)

**Блокує:** Всі інші задачі залежать від цієї.

### Файли для створення

#### `package.json`

```json
{
  "name": "cnb-mcp",
  "version": "1.0.0",
  "description": "MCP server for Czech National Bank (ČNB) public API",
  "type": "module",
  "main": "dist/index.js",
  "bin": { "cnb-mcp": "dist/index.js" },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

> **Примітка:** Перевірити peer dependency MCP SDK на Zod v3 vs v4 під час імплементації.

#### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src"]
}
```

#### `src/types.ts`

Всі TypeScript інтерфейси для відповідей API — контракт для всіх паралельних задач.

```typescript
// === EXRATES ===
export interface ExRate {
  validFor: string;       // "2025-02-24"
  order: number;
  country: string;        // "EMU"
  currency: string;       // "euro"
  amount: number;         // 1, 100, or 1000
  currencyCode: string;   // "EUR"
  rate: number;           // 25.060
}

export interface ExRatesDailyResponse {
  rates: ExRate[];
}

export interface ExRateCurrencyMonth {
  currencyCode: string;
  amount: number;
  validFor: string;
  rate: number;
}

export interface ExRatesCurrencyMonthResponse {
  rates: ExRateCurrencyMonth[];
}

export interface ExRateAverage {
  month: string;           // "JAN", "JAN_TO_MAR", etc.
  average: number;
  year: number;
  currencyCode: string;
  amount: number;
}

export interface ExRateAveragesResponse {
  averages: ExRateAverage[];
}

// === FXRATES ===
export interface FxRatesDailyMonthResponse {
  rates: ExRate[];
}

export interface FxRatesCurrencyRangeResponse {
  rates: ExRateCurrencyMonth[];
}

// === PRIBOR ===
export interface PriborEntry {
  validFor: string;
  period: string;          // "ONE_DAY", "ONE_WEEK", etc.
  pribid: number | null;   // null в нових даних (PRIBID припинений)
  pribor: number;
}

export interface PriborResponse {
  pribs: PriborEntry[];
}

// === CZEONIA ===
export interface CzeoniaEntry {
  validFor: string;
  volumeInCZKmio: number;
  rate: number;
}

export interface CzeoniaDailyResponse {
  czeoniaDaily: CzeoniaEntry;
}

export interface CzeoniaYearResponse {
  rates: CzeoniaEntry[];
}

// === FORWARD ===
export interface ForwardPointEntry {
  validFor: string;
  ccyPair: string;         // "EUR_TO_CZK"
  maturity: string;        // "THREE_MONTH"
  forwardPoints: number;
}

export interface ForwardResponse {
  forwardPoints: ForwardPointEntry[];
}

// === OMO ===
export interface OmoOperation {
  operationType: string;
  liquidityImpact: string;
  tradeDate: string;
  settlementDate: string;
  maturityDate: string;
  marginalRateInPercent: number;
  totalBidVolumeInCZKbln: number;
  totalNumberOfBids: number;
  minimumBidRateInPercent: number;
  averageBidRateInPercent: number;
  maximumBidRateInPercent: number;
  totalAllotedVolumeInCZKbln: number;
  totalNumberOfAllotedBids: number;
  minimumAllotedRateInPercent: number;
  averageAllotedRateInPercent: number;
  maximumAllotedRateInPercent: number;
  allotmentPercentage: number;
}

export interface OmoResponse {
  operations: OmoOperation[];
}

// === SKD ===
export interface SkdBond {
  settlementDate: string;
  isin: string;
  issueCode: string;
  issueName: string;
  nominalValueCZK: string;
  averagePriceToValue: number;
  nominalValueOfSettlementCZK: number | null;
}

export interface SkdResponse {
  skds: SkdBond[];
}
```

#### `src/api/client.ts`

```typescript
const BASE_URL = "https://api.cnb.cz/cnbapi";

export class CnbApiError extends Error {
  constructor(public status: number, public endpoint: string, message: string) {
    super(message);
    this.name = "CnbApiError";
  }
}

export async function cnbFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    if (response.status === 400) {
      throw new CnbApiError(400, path, "Invalid parameters. Check date format (YYYY-MM-DD), currency code (ISO 4217), and year values.");
    }
    if (response.status === 404) {
      throw new CnbApiError(404, path, "No data available for the specified date/period. This may be a weekend or public holiday.");
    }
    throw new CnbApiError(response.status, path, `CNB API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
```

#### `src/index.ts` (скелет)

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "cnb-mcp",
  version: "1.0.0",
});

// --- Tool registrations added by parallel tasks ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

### Конвенція для tool-модулів

Кожен файл в `tools/` експортує одну функцію:

```typescript
export function registerXxxTools(server: McpServer): void {
  server.registerTool("tool_name", { ... }, async (params) => { ... });
}
```

Це дозволяє паралельну розробку без merge-конфліктів — кожен розробник додає лише 1 import + 1 виклик в `index.ts`.

### Acceptance criteria

- `npm install` успішно
- `npm run build` компілюється без помилок
- `src/types.ts` експортує всі інтерфейси
- `src/api/client.ts` експортує `cnbFetch` та `CnbApiError`
- `node dist/index.js` стартує сервер без crash

---

## TASK 1: Exchange Rate Tools (ПАРАЛЕЛЬНО)

**Залежить від:** Task 0
**Файли:** `src/tools/exrates.ts`, додати import/registration в `src/index.ts`

### 6 tools

| Tool | Параметри | API endpoint |
|------|-----------|-------------|
| `cnb_exchange_rates_daily` | `date?`, `lang?` | `GET /exrates/daily` |
| `cnb_exchange_rates_monthly` | `currency` (req), `yearMonth?` | `GET /exrates/daily-currency-month` |
| `cnb_exchange_rates_year` | `year?` | `GET /exrates/daily-year` |
| `cnb_exchange_rates_monthly_averages` | `currency?`, `year?` (min 1) | `GET /exrates/monthly-averages-currency` або `-year` |
| `cnb_exchange_rates_quarterly_averages` | `currency?`, `year?` (min 1) | `GET /exrates/quarterly-averages-currency` або `-year` |
| `cnb_exchange_rates_cumulative_averages` | `currency?`, `year?` (min 1) | `GET /exrates/monthly-cumulative-averages-currency` або `-year` |

### Паттерн реєстрації

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cnbFetch, CnbApiError } from "../api/client.js";
import type { ExRatesDailyResponse } from "../types.js";

export function registerExratesTools(server: McpServer): void {
  server.registerTool(
    "cnb_exchange_rates_daily",
    {
      title: "CNB Daily Exchange Rates",
      description: "Get official CZK exchange rates for a specific date (~27 major currencies).",
      inputSchema: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
          .describe("Date in YYYY-MM-DD format. Defaults to today."),
        lang: z.enum(["CZ", "EN"]).optional().default("EN")
          .describe("Language for country/currency names."),
      }),
    },
    async ({ date, lang }) => {
      try {
        const data = await cnbFetch<ExRatesDailyResponse>("/exrates/daily", { date, lang });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        const msg = err instanceof CnbApiError ? err.message : "Unexpected error";
        return { content: [{ type: "text", text: msg }], isError: true };
      }
    }
  );
  // ... ще 5 tools аналогічно
}
```

### Важливо для tools 4-6 (averages)

- Потрібен хоча б один з `currency` або `year`
- Якщо є `currency` — викликати endpoint `-currency`
- Якщо є `year` — викликати endpoint `-year`
- Якщо обидва — пріоритет `year` (повертає всі валюти)

### Acceptance criteria

- Всі 6 tools реєструються без помилок
- Zod валідація параметрів працює
- Average tools правильно маршрутизують між currency/year endpoint

---

## TASK 2: FX Rates Tools (ПАРАЛЕЛЬНО)

**Залежить від:** Task 0
**Файли:** `src/tools/fxrates.ts`, додати import/registration в `src/index.ts`

### 2 tools

| Tool | Параметри | API endpoint |
|------|-----------|-------------|
| `cnb_fx_rates_monthly` | `yearMonth?`, `lang?` | `GET /fxrates/daily-month` |
| `cnb_fx_rates_currency` | `currency` (req), `yearMonthFrom?`, `yearMonthTo?`, `lang?` | `GET /fxrates/daily-range-currency` |

### Примітка

FX rates response використовує ту саму структуру `rates[]` що і EXRATES. Інтерфейс `ExRate` підходить для обох.

### Acceptance criteria

- Обидва tools реєструються, приймають параметри, викликають правильний endpoint
- `cnb_fx_rates_currency` вимагає параметр `currency`

---

## TASK 3: PRIBOR Tools (ПАРАЛЕЛЬНО)

**Залежить від:** Task 0
**Файли:** `src/tools/pribor.ts`, додати import/registration в `src/index.ts`

### 2 tools

| Tool | Параметри | API endpoint |
|------|-----------|-------------|
| `cnb_pribor_daily` | `date?` | `GET /pribor/daily` |
| `cnb_pribor_year` | `year?`, `period?` | `GET /pribor/daily-year` або `/daily-year-term` |

### Значення period

`ONE_DAY`, `ONE_WEEK`, `TWO_WEEKS`, `ONE_MONTH`, `TWO_MONTH`, `THREE_MONTH`, `SIX_MONTH`, `NINE_MONTH`, `ONE_YEAR`

### Примітка

Поле `pribid` завжди `null` в нових даних (PRIBID припинений). Tool повинен включати його в тип, але може зазначити це в description.

### Логіка маршрутизації cnb_pribor_year

- Якщо `period` вказано → `GET /pribor/daily-year-term?year={year}&period={period}`
- Інакше → `GET /pribor/daily-year?year={year}`

### Acceptance criteria

- Обидва tools працюють коректно
- `cnb_pribor_year` правильно маршрутизує між двома endpoint

---

## TASK 4: CZEONIA + Forward + OMO + SKD (ПАРАЛЕЛЬНО)

**Залежить від:** Task 0
**Файли:** `src/tools/czeonia.ts`, `src/tools/forward.ts`, `src/tools/omo.ts`, `src/tools/skd.ts`, додати imports в `src/index.ts`

4 малі tool-групи (по 1 tool), об'єднані в одну задачу. Можна також розділити між 4 розробниками.

### 4.1 `cnb_czeonia` (czeonia.ts)

- Параметри: `date?`, `year?`
- Якщо `year` → `GET /czeonia/daily-year` (повертає `{ rates: [...] }`)
- Інакше → `GET /czeonia/daily` (повертає `{ czeoniaDaily: {...} }`)
- **Критично:** daily і year мають різні response shapes!

### 4.2 `cnb_forward_rates` (forward.ts)

- Параметри: `date?`, `currencyPair?`, `maturity?`, `dateFrom?`, `dateTo?`
- Якщо `dateFrom` → range endpoint (currencyPair/maturity default to `ALL`)
- Інакше → `GET /forward/daily?date={date}`
- Currency pairs: `ALL`, `EUR_TO_CZK`, `USD_TO_CZK`
- Maturities: `ALL`, `THREE_MONTH`, `SIX_MONTH`

### 4.3 `cnb_open_market_operations` (omo.ts)

- Параметри: `date?`, `year?`
- Якщо `year` → `GET /omo/daily-year?year={year}`
- Інакше → `GET /omo/daily?date={date}`

### 4.4 `cnb_short_term_bonds` (skd.ts)

- Параметри: `date?`
- `GET /skd/daily?date={date}`
- Найпростіший tool — один endpoint, один параметр

### Acceptance criteria

- Всі 4 tools реєструються та працюють
- CZEONIA коректно обробляє різні response shapes
- Forward rates при `dateFrom` автоматично ставить defaults для `currencyPair`/`maturity`

---

## TASK 5: Currency Converter (ПАРАЛЕЛЬНО)

**Залежить від:** Task 0
**Файли:** `src/tools/convert.ts`, додати import/registration в `src/index.ts`

### Tool: `cnb_convert_currency`

- Параметри: `amount` (req), `from` (req), `to` (req), `date?`
- Не має прямого API endpoint — derived tool

### Логіка конвертації

```
1. Fetch daily rates: GET /exrates/daily?date={date}&lang=EN
2. Знайти fromRate та toRate
3. If from === "CZK": result = amount / (toRate / toAmount)
4. If to === "CZK":   result = amount * (fromRate / fromAmount)
5. Else (cross-rate): result = amount * (fromRate / fromAmount) / (toRate / toAmount)
```

> **Важливо:** `amount` в API означає множник (наприклад, 100 HUF = 6.241 CZK).

### Формат відповіді

```
1000.00 EUR = 25,060.00 CZK
Rate: 1 EUR = 25.060 CZK (CNB fixing for 2025-02-24)
```

### Edge cases

- Валюта не знайдена → помилка з порадою перевірити FX rates для екзотичних валют
- `from === to` → повернути ту саму суму
- `amount <= 0` → валідувати і відхилити

### Acceptance criteria

- Правильна конвертація між будь-якими двома валютами з daily fixing
- Коректна обробка `amount` множника (100 HUF, 1000 IDR, тощо)
- Зрозуміле повідомлення про помилку коли валюту не знайдено

---

## TASK 6: Resource + Prompt (ПАРАЛЕЛЬНО)

**Залежить від:** Task 0
**Файли:** модифікація `src/index.ts`

### Resource: `cnb://info`

Статичний ресурс з метаінформацією:

```typescript
server.registerResource(
  "cnb-info",
  "cnb://info",
  {
    title: "CNB API Information",
    description: "Czech National Bank API info: update times, currencies, limits.",
    mimeType: "text/plain",
  },
  async (uri) => ({
    contents: [{
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
    }],
  })
);
```

### Prompt: `analyze-currency-trend`

```typescript
server.registerPrompt(
  "analyze-currency-trend",
  {
    title: "Analyze Currency Trend",
    description: "Analyze the trend of a currency against CZK over a chosen period.",
    argsSchema: z.object({
      currency: z.string().describe("ISO 4217 currency code (e.g., EUR, USD)"),
      period: z.enum(["month", "quarter", "year"]).optional().default("month"),
    }),
  },
  ({ currency, period }) => ({
    messages: [{
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `Analyze the ${currency}/CZK exchange rate trend over the last ${period}.
Steps:
1. Fetch ${currency} data for the relevant period.
2. Calculate: opening rate, closing rate, high, low, percentage change.
3. Provide analysis: trend direction, key turning points, volatility.`,
      },
    }],
  })
);
```

### Acceptance criteria

- `cnb://info` повертає статичний текст
- `analyze-currency-trend` приймає `currency` (req) та `period` (optional, default "month")

---

## TASK 7: README + Фінальна інтеграція (ПАРАЛЕЛЬНО, фіналізація останньою)

**Залежить від:** Task 0 для чернетки; Tasks 1-6 для фіналізації
**Файли:** `README.md`, фінальний `src/index.ts`

### README.md

- Опис проекту
- Встановлення (`npm install && npm run build`)
- Конфігурація Claude Desktop:
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
- Повний список tools з параметрами та прикладами
- Документація resource та prompt
- Посилання на Swagger API

### Фінальний `src/index.ts`

```typescript
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

const server = new McpServer({ name: "cnb-mcp", version: "1.0.0" });

registerExratesTools(server);
registerFxratesTools(server);
registerPriborTools(server);
registerCzeoniaTools(server);
registerForwardTools(server);
registerOmoTools(server);
registerSkdTools(server);
registerConvertTools(server);

// + resource cnb://info
// + prompt analyze-currency-trend

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

### Acceptance criteria

- `npm run build` без помилок
- Listing tools повертає всі 15 tools
- Listing resources повертає `cnb://info`
- Listing prompts повертає `analyze-currency-trend`
- README повний та точний

---

## Зведена таблиця

| Task | Файли | Tools/Features | Залежить від | Паралельно? |
|------|-------|----------------|--------------|-------------|
| **0** | `package.json`, `tsconfig.json`, `types.ts`, `client.ts`, `index.ts` | Фундамент проекту | - | Ні (першим) |
| **1** | `src/tools/exrates.ts` | 6 exchange rate tools | Task 0 | Так |
| **2** | `src/tools/fxrates.ts` | 2 FX rate tools | Task 0 | Так |
| **3** | `src/tools/pribor.ts` | 2 PRIBOR tools | Task 0 | Так |
| **4** | `czeonia.ts`, `forward.ts`, `omo.ts`, `skd.ts` | 4 tools (1 кожен) | Task 0 | Так |
| **5** | `src/tools/convert.ts` | 1 converter tool | Task 0 | Так |
| **6** | `src/index.ts` | 1 resource + 1 prompt | Task 0 | Так |
| **7** | `README.md`, final `src/index.ts` | Документація + збірка | Tasks 0-6 | Частково |
