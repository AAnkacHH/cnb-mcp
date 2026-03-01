# Специфікація MCP Сервера: cnb-mcp

## Загальна інформація

- **Назва:** `cnb-mcp`
- **Опис:** MCP сервер для доступу до публічних API Чеського національного банку (ČNB)
- **Протокол:** Model Context Protocol (MCP)
- **Базове API:** `https://api.cnb.cz/cnbapi` (REST JSON, без автентифікації)
- **Транспорт:** stdio

---

## Джерела даних ČNB

ČNB надає 5 категорій API:

| API | URL | Auth | Формат | Статус в MCP |
|-----|-----|------|--------|--------------|
| **CNB REST API** | `api.cnb.cz/cnbapi` | Немає | JSON | **v1 - основне** |
| Legacy TXT/XML | `www.cnb.cz` | Немає | TXT/XML | Не потрібно (дублює REST) |
| ARAD Time Series | `www.cnb.cz/aradb/api/v1` | API key (безкоштовний) | CSV | **v2 - опціональне** |
| WS JERRS (SOAP) | `aplc.cnb.cz/jerrsws/ws` | SSL сертифікат | XML | Поза скоупом |
| PSD2 Open Banking | `developers.cnb.cz` | OAuth 2.0 + mTLS | JSON | Поза скоупом |

**Swagger документація:** https://api.cnb.cz/cnbapi/swagger-ui.html

---

## Tools (14 інструментів)

### Група 1: Курси валют - основні (~27 валют)

Офіційний fixing ČNB. Оновлюється кожного робочого дня ~14:30 CET.

#### 1.1 `cnb_exchange_rates_daily`

Актуальні курси валют на вибрану дату.

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `date` | `string` | ні | сьогодні | Дата у форматі `YYYY-MM-DD` |
| `lang` | `string` | ні | `EN` | Мова: `CZ` або `EN` |

**API:** `GET /cnbapi/exrates/daily?date={date}&lang={lang}`

**Юзкейси:**
- "Який сьогодні курс EUR/CZK?"
- "Який був курс долара 15 січня 2024?"
- "Покажи всі курси валют на сьогодні"

---

#### 1.2 `cnb_exchange_rates_monthly`

Щоденні курси конкретної валюти за вибраний місяць.

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `currency` | `string` | **так** | - | ISO код валюти (EUR, USD, GBP...) |
| `yearMonth` | `string` | ні | поточний місяць | Місяць у форматі `YYYY-MM` |

**API:** `GET /cnbapi/exrates/daily-currency-month?currency={currency}&yearMonth={yearMonth}`

**Юзкейси:**
- "Як змінювався курс EUR протягом січня 2025?"
- "Історія USD/CZK за минулий місяць"

---

#### 1.3 `cnb_exchange_rates_year`

Всі щоденні курси за цілий рік.

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `year` | `integer` | ні | поточний рік | Рік |

**API:** `GET /cnbapi/exrates/daily-year?year={year}`

**Юзкейси:**
- "Всі курси валют за 2024 рік"
- "Річна динаміка EUR/CZK"

---

#### 1.4 `cnb_exchange_rates_monthly_averages`

Місячні середні курси валют.

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `currency` | `string` | ні* | - | ISO код валюти |
| `year` | `integer` | ні* | поточний рік | Рік |

*Потрібен хоча б один параметр. Якщо `currency` - повертає всі роки для валюти. Якщо `year` - повертає всі валюти за рік.

**API:**
- `GET /cnbapi/exrates/monthly-averages-currency?currency={currency}`
- `GET /cnbapi/exrates/monthly-averages-year?year={year}`

**Юзкейси:**
- "Середній курс EUR за кожен місяць 2024"
- "Місячні середні для USD за всі роки"

---

#### 1.5 `cnb_exchange_rates_quarterly_averages`

Квартальні середні курси валют.

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `currency` | `string` | ні* | - | ISO код валюти |
| `year` | `integer` | ні* | поточний рік | Рік |

**API:**
- `GET /cnbapi/exrates/quarterly-averages-currency?currency={currency}`
- `GET /cnbapi/exrates/quarterly-averages-year?year={year}`

---

#### 1.6 `cnb_exchange_rates_cumulative_averages`

Кумулятивні місячні середні (зростаючий середній з початку року).

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `currency` | `string` | ні* | - | ISO код валюти |
| `year` | `integer` | ні* | поточний рік | Рік |

**API:**
- `GET /cnbapi/exrates/monthly-cumulative-averages-currency?currency={currency}`
- `GET /cnbapi/exrates/monthly-cumulative-averages-year?year={year}`

---

### Група 2: FX курси - екзотичні валюти (~200 валют)

Оновлюються **щомісяця** (в останній робочий день місяця, дійсні на наступний місяць).

#### 2.1 `cnb_fx_rates_monthly`

Курси менш поширених валют за вибраний місяць.

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `yearMonth` | `string` | ні | поточний місяць | Місяць `YYYY-MM` |
| `lang` | `string` | ні | `EN` | Мова: `CZ` або `EN` |

**API:** `GET /cnbapi/fxrates/daily-month?yearMonth={yearMonth}&lang={lang}`

**Юзкейси:**
- "Курс тайського бату до крони"
- "Курси екзотичних валют"

---

#### 2.2 `cnb_fx_rates_currency`

Історія курсу конкретної екзотичної валюти за діапазон місяців.

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `currency` | `string` | **так** | - | ISO код валюти |
| `yearMonthFrom` | `string` | ні | - | Початок діапазону `YYYY-MM` |
| `yearMonthTo` | `string` | ні | поточний місяць | Кінець діапазону `YYYY-MM` |
| `lang` | `string` | ні | `EN` | Мова |

**API:** `GET /cnbapi/fxrates/daily-range-currency?currency={currency}&yearMonthFrom={yearMonthFrom}&yearMonthTo={yearMonthTo}&lang={lang}`

---

### Група 3: PRIBOR (міжбанківські ставки)

Prague InterBank Offered Rate. Важливо для іпотек та корпоративного кредитування.

#### 3.1 `cnb_pribor_daily`

PRIBOR/PRIBID ставки на конкретну дату.

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `date` | `string` | ні | сьогодні | Дата `YYYY-MM-DD` |

**API:** `GET /cnbapi/pribor/daily?date={date}`

**Відповідь:** Масив ставок для різних термінів (1 день, 1 тиждень, 2 тижні, 1/2/3/6/9 міс., 1 рік)

**Юзкейси:**
- "Яка зараз ставка PRIBOR?"
- "Поточні міжбанківські ставки"

---

#### 3.2 `cnb_pribor_year`

Щоденні PRIBOR ставки за цілий рік (опціонально для конкретного терміну).

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `year` | `integer` | ні | поточний рік | Рік |
| `period` | `string` | ні | всі терміни | Конкретний термін |

**Значення `period`:** `ONE_DAY`, `ONE_WEEK`, `TWO_WEEKS`, `ONE_MONTH`, `TWO_MONTH`, `THREE_MONTH`, `SIX_MONTH`, `NINE_MONTH`, `ONE_YEAR`

**API:**
- `GET /cnbapi/pribor/daily-year?year={year}`
- `GET /cnbapi/pribor/daily-year-term?year={year}&period={period}`

---

### Група 4: CZEONIA (овернайт ставка)

Czech Overnight Index Average - фактична ставка за незабезпеченими овернайт-депозитами.

#### 4.1 `cnb_czeonia`

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `date` | `string` | ні | сьогодні | Дата `YYYY-MM-DD` |
| `year` | `integer` | ні | - | Рік (для річних даних) |

Якщо вказано `year` - повертає річні дані, інакше - дані на конкретну дату.

**API:**
- `GET /cnbapi/czeonia/daily?date={date}`
- `GET /cnbapi/czeonia/daily-year?year={year}`

---

### Група 5: Форвардні курси

Форвардні валютні пункти для EUR/CZK та USD/CZK.

#### 5.1 `cnb_forward_rates`

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `date` | `string` | ні | сьогодні | Дата (для одного дня) |
| `currencyPair` | `string` | ні | `ALL` | `EUR_TO_CZK`, `USD_TO_CZK`, `ALL` |
| `maturity` | `string` | ні | `ALL` | `THREE_MONTH`, `SIX_MONTH`, `ALL` |
| `dateFrom` | `string` | ні | - | Початок діапазону `YYYY-MM-DD` |
| `dateTo` | `string` | ні | сьогодні | Кінець діапазону `YYYY-MM-DD` |

Якщо вказано `dateFrom` - повертає дані за діапазон, інакше - за конкретну дату.

**API:**
- `GET /cnbapi/forward/daily?date={date}`
- `GET /cnbapi/forward/daily-range-currency-pair-maturity?currencyPair={}&dateFrom={}&dateTo={}&maturity={}`

---

### Група 6: Операції на відкритому ринку (OMO)

Репо-тендери та інші операції ČNB на грошовому ринку.

#### 6.1 `cnb_open_market_operations`

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `date` | `string` | ні | сьогодні | Дата `YYYY-MM-DD` |
| `year` | `integer` | ні | - | Рік (для річних даних) |

**API:**
- `GET /cnbapi/omo/daily?date={date}`
- `GET /cnbapi/omo/daily-year?year={year}`

---

### Група 7: Короткострокові облігації (SKD)

Ціни та номінальні вартості короткострокових державних облігацій.

#### 7.1 `cnb_short_term_bonds`

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `date` | `string` | ні | сьогодні | Дата `YYYY-MM-DD` |

**API:** `GET /cnbapi/skd/daily?date={date}`

---

### Утилітарний інструмент

#### `cnb_convert_currency`

Конвертація валют на основі актуального курсу ČNB.

| Параметр | Тип | Обов'язковий | Default | Опис |
|----------|-----|--------------|---------|------|
| `amount` | `number` | **так** | - | Сума для конвертації |
| `from` | `string` | **так** | - | Вихідна валюта (ISO код) |
| `to` | `string` | **так** | - | Цільова валюта (ISO код) |
| `date` | `string` | ні | сьогодні | Дата курсу `YYYY-MM-DD` |

**Логіка:** Отримує курси обох валют до CZK та розраховує крос-курс.

**Юзкейси:**
- "Конвертуй 1000 EUR в CZK"
- "Скільки доларів в 5000 кронах?"
- "100 EUR в GBP за курсом ЧНБ"

---

## Resources

### `cnb://info`
Статична інформація: час оновлення даних, список підтримуваних валют, обмеження API.

---

## Prompts

### `analyze-currency-trend`
Аналізує тренд валюти за вибраний період. Автоматично викликає потрібні tools.

| Параметр | Тип | Обов'язковий | Опис |
|----------|-----|--------------|------|
| `currency` | `string` | **так** | ISO код валюти |
| `period` | `string` | ні | `month`, `quarter`, `year` |

---

## Архітектура

### Стек технологій
- **Runtime:** Node.js (TypeScript)
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **HTTP Client:** native `fetch` (Node 18+)
- **Build:** `tsc`
- **Transport:** stdio

### Структура проекту

```
cnb-mcp/
├── src/
│   ├── index.ts              # Entry point, MCP server setup, tool registration
│   ├── tools/
│   │   ├── exrates.ts        # Курси валют (daily, monthly, yearly, averages)
│   │   ├── fxrates.ts        # FX курси екзотичних валют
│   │   ├── pribor.ts         # PRIBOR ставки
│   │   ├── czeonia.ts        # CZEONIA овернайт ставка
│   │   ├── forward.ts        # Форвардні курси
│   │   ├── omo.ts            # Операції на відкритому ринку
│   │   ├── skd.ts            # Короткострокові облігації
│   │   └── convert.ts        # Конвертація валют
│   ├── api/
│   │   └── client.ts         # HTTP клієнт для api.cnb.cz
│   └── types.ts              # TypeScript типи для API відповідей
├── package.json
├── tsconfig.json
└── README.md
```

### Обробка помилок
- **400** - невалідні параметри → повідомлення про правильний формат
- **404** - немає даних → "Дані за вибрану дату недоступні (вихідний/свято?)"
- **500** - помилка сервера → "API ČNB тимчасово недоступне"
- Валідація параметрів до виклику API

### HTTP коди відповіді API
| Код | Опис |
|-----|------|
| 200 | Успіх |
| 400 | Помилка валідації параметрів |
| 404 | Дані не знайдені |
| 500 | Внутрішня помилка сервера |

---

## Підсумок інструментів

| Група | К-ть | Опис |
|-------|------|------|
| Курси валют (основні) | 6 | Daily, monthly, yearly, averages |
| FX курси (екзотичні) | 2 | Monthly, currency history |
| PRIBOR | 2 | Daily, yearly |
| CZEONIA | 1 | Daily/yearly |
| Форвардні курси | 1 | Daily/range |
| Операції на ринку | 1 | Daily/yearly |
| Облігації | 1 | Daily |
| Конвертація | 1 | Утилітарний tool |
| **Разом** | **15** | |

---

## Поза скоупом (v1)

| Фіча | Причина |
|-------|---------|
| ARAD Time Series | Потребує API key - можна додати у v2 |
| WS JERRS (SOAP) | Потребує комерційний SSL сертифікат |
| PSD2 Open Banking | Потребує OAuth 2.0 + mTLS |
| Legacy TXT/XML | REST JSON API покриває ті самі дані |

## Можливі покращення (v2)

1. **ARAD інтеграція** - опціональний API key для макроекономічних часових рядів (ВВП, інфляція, безробіття)
2. **Кешування** - курси оновлюються раз на день ~14:30 CET, можна кешувати
3. **Rate alerts** - порівняння поточних курсів з порогами
4. **Історичний аналіз** - min/max/average за діапазон дат
