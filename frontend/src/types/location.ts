/**
 * Location types for Story 2.8: Transport Master Data
 */

export interface Location {
  id: string;
  name: string;
  country: string;
  type: string | null;
  created_at: string | null;
}

export interface LocationCreate {
  name: string;
  country: string;
  type?: string;
}

export interface LocationUpdate {
  name?: string;
  country?: string;
  type?: string;
}

export interface LocationsResponse {
  data: Location[];
  count: number;
}

export interface Country {
  id: string;
  name: string;
  code: string | null;
  sorting: number;
  created_at: string | null;
  cities?: City[]; // For frontend tree structure
  children?: City[]; // For AntD Table tree data
  key?: string; // For AntD
}

export interface CountryCreate {
  name: string;
  code?: string;
  sorting?: number;
}

export interface CountryUpdate {
  name?: string;
  code?: string;
  sorting?: number;
}

export interface CountriesResponse {
  data: Country[];
  count: number;
}

export interface City {
  id: string;
  name: string;
  country_id: string;
  sorting: number;
  created_at: string | null;
  country?: Country;
  key?: string; // For AntD
}

export interface CityCreate {
  name: string;
  country_id: string;
  sorting?: number;
}

export interface CityUpdate {
  name?: string;
  country_id?: string;
  sorting?: number;
}

export interface CitiesResponse {
  data: City[];
  count: number;
}