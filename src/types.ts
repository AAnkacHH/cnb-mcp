// === EXRATES ===
export interface ExRate {
  validFor: string; // "2025-02-24"
  order: number;
  country: string; // "EMU"
  currency: string; // "euro"
  amount: number; // 1, 100, or 1000
  currencyCode: string; // "EUR"
  rate: number; // 25.060
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
  month: string; // "JAN", "JAN_TO_MAR", etc.
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
  period: string; // "ONE_DAY", "ONE_WEEK", etc.
  pribid: number | null; // null in recent data (PRIBID discontinued)
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
  ccyPair: string; // "EUR_TO_CZK"
  maturity: string; // "THREE_MONTH"
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
