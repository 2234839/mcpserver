import { getEnv } from '../../utils/helpers.js';
import { logger } from '../../utils/logger.js';
import { SearchWebResult } from './types.js';
import { Cache } from './cache.js';
import { RateLimiter } from './rate-limiter.js';
import { sanitizeUrl, isValidUrl } from './security.js';
import axios from 'axios';
import { withRetry, withTimeout, handleApiError } from './errors.js';

// Initialize cache and rate limiter
const cache = new Cache();
const rateLimiter = new RateLimiter();

// Define the search parameters interface
interface SearchWebParams {
  q: string;
  top_k?: number;
  time_range?: 'any' | 'day' | 'week' | 'month' | 'year';
  site?: string;
  lang?: string;
  region?: string;
  safe_mode?: boolean;
  include_snippets?: boolean;
  operators?: string[];
  exclude_sites?: string[];
  from?: string;
  to?: string;
  dedupe?: 'none' | 'domain' | 'title';
  aggregate?: boolean;
}

/**
 * Search the web using Perplexity API
 * @param params Search parameters
 * @returns Search results
 */
export async function searchWeb(params: SearchWebParams): Promise<SearchWebResult> {
  try {
    // Check rate limit
    if (!rateLimiter.checkLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Create cache key
    const cacheKey = createCacheKey(params);

    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      logger.info('Returning cached result for web search', { query: params.q });
      return {
        ...cachedResult,
        meta: {
          ...cachedResult.meta,
          cache_hit: true
        }
      };
    }

    // Get API key
    const env = getEnv();
    if (!env.PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }
    const apiKey = env.PERPLEXITY_API_KEY;

    // Build query string
    let query = params.q;
    if (params.operators && params.operators.length > 0) {
      query = `${query} ${params.operators.join(' ')}`;
    }

    // Build API request payload
    const payload: any = {
      query: query,
      top_k: params.top_k || 10,
      time_range: params.time_range || 'any',
      safe_mode: params.safe_mode !== false, // default to true
      include_snippets: params.include_snippets !== false, // default to true
    };

    // Add optional parameters
    if (params.site) {
      payload.site = params.site;
    }

    if (params.lang) {
      payload.lang = params.lang;
    }

    if (params.region) {
      payload.region = params.region;
    }

    if (params.from) {
      payload.from = params.from;
    }

    if (params.to) {
      payload.to = params.to;
    }

    // Add advanced parameters if they exist
    if (params.exclude_sites && params.exclude_sites.length > 0) {
      payload.exclude_sites = params.exclude_sites;
    }

    if (params.dedupe) {
      payload.dedupe = params.dedupe;
    }

    if (params.aggregate !== undefined) {
      payload.aggregate = params.aggregate;
    }

    // Start timing
    const startTime = Date.now();

    // Make API request to Perplexity
    const response = await makePerplexityRequest(apiKey, payload);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Process and normalize results
    const normalizedResults = normalizeResults(response.results);

    // Apply deduplication if requested
    let finalResults = normalizedResults;
    if (params.dedupe && params.dedupe !== 'none') {
      finalResults = deduplicateResults(normalizedResults, params.dedupe);
    }

    // Create result object
    const result: SearchWebResult = {
      results: finalResults,
      meta: {
        query: params.q,
        top_k: params.top_k || 10,
        time_range: params.time_range || 'any',
        cost_estimate: calculateCost(normalizedResults.length),
        cache_hit: false,
        response_time: responseTime,
      }
    };

    // Cache the result
    cache.set(cacheKey, result);

    // Update rate limiter
    rateLimiter.increment();

    return result;
  } catch (error) {
    logger.error('Error in searchWeb', { error, params });
    throw error;
  }
}

/**
 * Make a request to the Perplexity API
 * @param apiKey API key
 * @param payload Request payload
 * @returns API response
 */
async function makePerplexityRequest(apiKey: string, payload: any): Promise<any> {
  try {
    // Get timeout from environment or use default
    const timeout = parseInt(getEnv().WEB_SEARCH_TIMEOUT_MS || '10000', 10);

    // Make API request with timeout and retry
    const response = await withRetry(async () => {
      return await withTimeout(async () => {
        const result = await axios.post('https://api.perplexity.ai/search', payload, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: timeout
        });
        return result.data;
      }, timeout);
    });

    return response;
  } catch (error) {
    logger.error('Error making Perplexity API request', { error, payload });
    throw handleApiError(error);
  }
}

/**
 * Normalize search results to a consistent format
 * @param results Raw results from API
 * @returns Normalized results
 */
function normalizeResults(results: any[]): any[] {
  return results.map(result => ({
    title: result.title || '',
    url: sanitizeUrl(result.url) || '',
    snippet: result.snippet || '',
    published_at: result.published_at || null,
    source: result.source || null,
    score: result.score || null
  })).filter(result => result.title && result.url && isValidUrl(result.url));
}

/**
 * Deduplicate search results
 * @param results Search results
 * @param strategy Deduplication strategy
 * @returns Deduplicated results
 */
function deduplicateResults(results: any[], strategy: 'domain' | 'title'): any[] {
  const seen = new Set();

  return results.filter(result => {
    let key: string;

    if (strategy === 'domain') {
      try {
        const url = new URL(result.url);
        key = url.hostname;
      } catch (e) {
        // If URL is invalid, use the full URL as key
        key = result.url;
      }
    } else {
      // strategy === 'title'
      key = result.title;
    }

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

/**
 * Calculate estimated cost of the search
 * @param resultCount Number of results
 * @returns Estimated cost
 */
function calculateCost(resultCount: number): number {
  // This is a simplified cost calculation
  // In reality, this would depend on the Perplexity API pricing
  return resultCount * 0.0001;
}

/**
 * Create a cache key from search parameters
 * @param params Search parameters
 * @returns Cache key string
 */
function createCacheKey(params: SearchWebParams): string {
  // Create a string representation of the parameters for caching
  const keyParts = [
    params.q,
    params.top_k,
    params.time_range,
    params.site,
    params.lang,
    params.region,
    params.safe_mode,
    params.include_snippets,
    params.from,
    params.to,
    params.dedupe
  ];

  // Handle array parameters
  if (params.operators) {
    keyParts.push(params.operators.join(','));
  }

  if (params.exclude_sites) {
    keyParts.push(params.exclude_sites.join(','));
  }

  return keyParts.filter(part => part !== undefined).join('|');
}