export interface SearchOptions {
  sites: string[];
  timeout: number | null;
  proxy: string | null;
  use_tor: boolean;
  include_nsfw: boolean;
  expand_variants: boolean;
  verbose: boolean;
  print_all: boolean;
  browse_found: boolean;
  use_local_data: boolean;
  custom_json: string | null;
  output_dir: string | null;
  output_format: string[];
}

export interface SearchResult {
  username: string;
  site: string;
  url: string;
  found: boolean;
}

export interface SiteInfo {
  url: string;
  category: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  usernames: string[];
  found_count: number;
  total_sites: number;
  duration: number;
  results: SearchResult[];
  options: SearchOptions;
  stopped?: boolean;
}

export type Page = "search" | "history";
export type Theme = "light" | "dark";
export type ResultFilter = "all" | "found" | "not_found";
