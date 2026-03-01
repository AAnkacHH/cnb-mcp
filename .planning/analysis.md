# Аналіз API Чеського національного банку (ČNB)

## Огляд

ČNB надає 5 категорій публічних API. Для MCP сервера найкраще підходить **CNB REST API** - сучасний JSON API без автентифікації.

## CNB REST API (основне джерело)

**Base URL:** `https://api.cnb.cz/cnbapi`
**Swagger:** https://api.cnb.cz/cnbapi/swagger-ui.html
**Формат:** JSON
**Auth:** Не потрібна
**Rate limits:** Не задокументовані, але ČNB попереджає проти зловживань

### Контролери та ендпоінти (19 ендпоінтів, 7 контролерів)

#### EXRATES - Основні валюти (~27)
| Ендпоінт | Опис | Параметри |
|----------|------|-----------|
| `GET /exrates/daily` | Курси на дату | `date` (YYYY-MM-DD), `lang` (CZ/EN) |
| `GET /exrates/daily-currency-month` | Валюта за місяць | `currency` (required), `yearMonth` |
| `GET /exrates/daily-year` | Курси за рік | `year` |
| `GET /exrates/monthly-averages-currency` | Місячні середні (валюта) | `currency` (required) |
| `GET /exrates/monthly-averages-year` | Місячні середні (рік) | `year` |
| `GET /exrates/monthly-cumulative-averages-currency` | Кумулятивні середні (валюта) | `currency` (required) |
| `GET /exrates/monthly-cumulative-averages-year` | Кумулятивні середні (рік) | `year` |
| `GET /exrates/quarterly-averages-currency` | Квартальні середні (валюта) | `currency` (required) |
| `GET /exrates/quarterly-averages-year` | Квартальні середні (рік) | `year` |

#### FXRATES - Екзотичні валюти (~200)
| Ендпоінт | Опис | Параметри |
|----------|------|-----------|
| `GET /fxrates/daily-month` | Курси за місяць | `yearMonth`, `lang` |
| `GET /fxrates/daily-range-currency` | Валюта за діапазон | `currency` (req), `yearMonthFrom`, `yearMonthTo`, `lang` |
| `GET /fxrates/daily-year` | Курси за рік | `year`, `lang` |

#### PRIBOR - Міжбанківські ставки
| Ендпоінт | Опис | Параметри |
|----------|------|-----------|
| `GET /pribor/daily` | Ставки на дату | `date` |
| `GET /pribor/daily-year` | Ставки за рік | `year` |
| `GET /pribor/daily-year-term` | Ставки за рік+термін | `year`, `period` (required) |

**Терміни PRIBOR:** ONE_DAY, ONE_WEEK, TWO_WEEKS, ONE_MONTH, TWO_MONTH, THREE_MONTH, SIX_MONTH, NINE_MONTH, ONE_YEAR

#### CZEONIA - Овернайт ставка
| Ендпоінт | Опис | Параметри |
|----------|------|-----------|
| `GET /czeonia/daily` | На дату | `date` |
| `GET /czeonia/daily-year` | За рік | `year` |

**Відповідь:** `rate`, `validFor`, `volumeInCZKmio`

#### FORWARD - Форвардні курси
| Ендпоінт | Опис | Параметри |
|----------|------|-----------|
| `GET /forward/daily` | На дату | `date` |
| `GET /forward/daily-range-currency-pair-maturity` | За діапазон | `currencyPair` (req), `dateFrom` (req), `dateTo`, `maturity` (req) |

**Валютні пари:** ALL, EUR_TO_CZK, USD_TO_CZK
**Терміни:** ALL, THREE_MONTH, SIX_MONTH

#### OMO - Операції на відкритому ринку
| Ендпоінт | Опис | Параметри |
|----------|------|-----------|
| `GET /omo/daily` | На дату | `date` |
| `GET /omo/daily-year` | За рік | `year` |

#### SKD - Короткострокові облігації
| Ендпоінт | Опис | Параметри |
|----------|------|-----------|
| `GET /skd/daily` | На дату | `date` |

### HTTP статуси
- **200** - Успіх
- **400** - Помилка валідації
- **404** - Дані не знайдені
- **500** - Внутрішня помилка

---

## Legacy TXT/XML ендпоінти (для довідки)

На `www.cnb.cz` доступні ті ж дані у форматах TXT, XML, HTML. Формат дат: `DD.MM.YYYY`. Чеський TXT використовує кому як десятковий роздільник. Для MCP не потрібні - REST API покриває все.

---

## ARAD REST API (потенціал для v2)

**URL:** `https://www.cnb.cz/aradb/api/v1`
**Auth:** API key (безкоштовна реєстрація на https://www.cnb.cz/arad/)
**Формат:** CSV (;-розділений, Windows-1250, кома як десятковий)

### Ендпоінти
- `GET /data` - Дані індикаторів (часові ряди)
- `GET /indicators` - Список індикаторів
- `GET /indicators-dims` - Індикатори з вимірами
- `GET /indicators-tree` - Ієрархічна класифікація
- `GET /snapshots` - Ревізії даних
- `GET /updates` - Інформація про оновлення

### Дані ARAD
- Монетарна політика (ставки, грошова маса, курси)
- Фінансовий ринок (банківський сектор, ринок капіталу)
- Макроекономічна статистика (ВВП, інфляція, зайнятість)
- Платіжний баланс
- Міжнародні порівняння

---

## Ключові технічні нотатки

1. **Час оновлення:** Курси публікуються ~14:30 CET кожного робочого дня
2. **Вихідні/свята:** API повертає курси за останній робочий день
3. **PRIBOR:** Дані для внутрішнього/персонального використання, перерозповсюдження заборонене без домовленості
4. **Часовий пояс:** Europe/Prague (CET/CEST)
