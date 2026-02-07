/**
 * Finance types for Story 2.14: Multi-Currency Support
 */

export interface ExchangeRate {
  id: string;
  month: number;
  year: number;
  rate: number;
  created_at: string | null;
}

export interface ExchangeRateCreate {
  month: number;
  year: number;
  rate: number;
}

export interface ExchangeRateUpdate {
  rate: number;
}

export interface ExchangeRatesResponse {
  data: ExchangeRate[];
  count: number;
}
