// Search Result interface
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  published_at?: string;
  source?: string;
  score?: number;
}

// Search Response interface
export interface SearchWebResult {
  results: SearchResult[];
  meta: {
    query: string;
    top_k: number;
    time_range: string;
    cost_estimate: number;
    cache_hit: boolean;
    response_time: number;
  };
  clusters?: any[];
  highlights?: string[];
  citations?: SearchResult[];
}

// Web Search Parameters interface
export interface WebSearchParams {
  q: string;
  top_k?: number;
  time_range?: 'any' | 'day' | 'week' | 'month' | 'year';
  site?: string;
  lang?: string;
  region?: string;
  safe_mode?: boolean;
  include_snippets?: boolean;
}

// Advanced Web Search Parameters interface
export interface AdvancedWebSearchParams extends WebSearchParams {
  operators?: string[];
  exclude_sites?: string[];
  from?: string;
  to?: string;
  dedupe?: 'none' | 'domain' | 'title';
  aggregate?: boolean;
  engine?: 'raw_search' | 'sonar_answer';
  sonar_model?: 'sonar' | 'sonar-pro' | 'sonar-reasoning' | 'sonar-reasoning-pro' | 'sonar-deep-research';
}