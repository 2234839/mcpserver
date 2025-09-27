import { getEnv } from '../../utils/helpers.js';
import { logger } from '../../utils/logger.js';
import { SearchWebResult } from './types.js';
import { searchWeb } from './client.js';
import axios from 'axios';
import { withRetry, withTimeout, handleApiError } from './errors.js';

// Define the Sonar search parameters interface
interface SonarSearchParams {
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
  sonar_model?: 'sonar' | 'sonar-pro' | 'sonar-reasoning' | 'sonar-reasoning-pro' | 'sonar-deep-research';
}

/**
 * Generate an answer using a Sonar model with citations
 * @param params Search parameters including Sonar model specification
 * @returns Search results with Sonar-generated answer and citations
 */
export async function generateAnswerWithSonar(params: SonarSearchParams): Promise<SearchWebResult> {
  try {
    logger.info('Generating answer with Sonar model', {
      query: params.q,
      model: params.sonar_model
    });

    // First, perform a raw search to get evidence base
    const searchResults = await searchWeb(params);

    // Get API key
    const env = getEnv();
    if (!env.PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }
    const apiKey = env.PERPLEXITY_API_KEY;

    // Validate Sonar model
    if (!params.sonar_model) {
      throw new Error('Sonar model is required for sonar_answer engine');
    }

    // Start timing
    const startTime = Date.now();

    // Make API request to Sonar model
    const sonarResult = await makeSonarRequest(apiKey, {
      ...params,
      model: params.sonar_model,
      evidence: searchResults.results
    });

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Process and normalize Sonar results
    const normalizedResults = normalizeSonarResults(sonarResult);

    // Create result object with Sonar enhancements
    const result: SearchWebResult = {
      results: searchResults.results, // Original search results
      meta: {
        query: params.q,
        top_k: params.top_k || 10,
        time_range: params.time_range || 'any',
        cost_estimate: calculateSonarCost(params.sonar_model, searchResults.results.length),
        cache_hit: false,
        response_time: searchResults.meta.response_time + responseTime,
      },
      clusters: normalizedResults.clusters || [],
      highlights: normalizedResults.highlights || [],
      citations: normalizedResults.citations || searchResults.results
    };

    logger.info('Sonar answer generation completed successfully', {
      query: params.q,
      model: params.sonar_model,
      resultCount: result.results.length,
      citationCount: result.citations?.length || 0
    });

    return result;
  } catch (error) {
    logger.error('Error in generateAnswerWithSonar', { error, params });
    throw error;
  }
}

/**
 * Make a request to the Sonar model API
 * @param apiKey API key
 * @param payload Request payload
 * @returns API response
 */
async function makeSonarRequest(apiKey: string, payload: any): Promise<any> {
  try {
    // Get timeout from environment or use default
    const timeout = parseInt(getEnv().WEB_SEARCH_TIMEOUT_MS || '10000', 10);

    // Prepare request payload for Sonar API
    const sonarPayload = {
      model: payload.model,
      query: payload.q,
      search_domain: 'scholarly',
      citations: 'markdown',
      ...('evidence' in payload && { evidence: payload.evidence })
    };

    // Make API request with timeout and retry
    const response = await withRetry(async () => {
      return await withTimeout(async () => {
        const result = await axios.post('https://api.perplexity.ai/chat/completions', sonarPayload, {
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
    logger.error('Error making Sonar API request', { error, payload });
    throw handleApiError(error);
  }
}

/**
 * Normalize Sonar model results to a consistent format
 * @param sonarResult Raw result from Sonar API
 * @returns Normalized results with Sonar enhancements
 */
function normalizeSonarResults(sonarResult: any): any {
  // Handle different response formats from Sonar API
  if (!sonarResult) {
    return {
      answer: '',
      clusters: [],
      highlights: [],
      citations: []
    };
  }

  // Extract answer from choices array (if present)
  let answer = '';
  if (sonarResult.choices && Array.isArray(sonarResult.choices) && sonarResult.choices.length > 0) {
    const choice = sonarResult.choices[0];
    if (choice.message && choice.message.content) {
      answer = choice.message.content;
    } else if (typeof choice === 'string') {
      answer = choice;
    }
  } else if (sonarResult.answer) {
    answer = sonarResult.answer;
  }

  // Extract citations from citations array (if present)
  let citations: any[] = [];
  if (Array.isArray(sonarResult.citations)) {
    citations = sonarResult.citations.map((citation: any) => ({
      title: citation.title || '',
      url: citation.url || '',
      snippet: citation.snippet || ''
    }));
  }

  // Extract highlights from highlights array (if present)
  let highlights: string[] = [];
  if (Array.isArray(sonarResult.highlights)) {
    highlights = sonarResult.highlights.filter((h: any) => typeof h === 'string');
  }

  // Extract clusters from clusters array (if present)
  let clusters: any[] = [];
  if (Array.isArray(sonarResult.clusters)) {
    clusters = sonarResult.clusters;
  }

  return {
    answer,
    clusters,
    highlights,
    citations
  };
}

/**
 * Calculate estimated cost of using a Sonar model
 * @param model Sonar model type
 * @param evidenceCount Number of evidence items
 * @returns Estimated cost
 */
function calculateSonarCost(
  model: string,
  evidenceCount: number
): number {
  // This is a simplified cost calculation based on the model type
  // In reality, this would depend on the actual Perplexity API pricing
  let baseCost = 0.01;

  switch (model) {
    case 'sonar-pro':
      baseCost = 0.02;
      break;
    case 'sonar-reasoning':
      baseCost = 0.03;
      break;
    case 'sonar-reasoning-pro':
      baseCost = 0.04;
      break;
    case 'sonar-deep-research':
      baseCost = 0.05;
      break;
    default:
      // 'sonar' base model
      baseCost = 0.01;
  }

  // Add cost for evidence processing
  return baseCost + (evidenceCount * 0.001);
}