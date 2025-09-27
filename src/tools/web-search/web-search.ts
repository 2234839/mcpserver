import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse } from '../../utils/common.js';
import { logger } from '../../utils/logger.js';
import { searchWeb } from './client.js';
import { getEnv } from '../../utils/helpers.js';

// Define the input schema for web search
const webSearchInputSchema = z.object({
  q: z.string().describe('查询语句'),
  top_k: z.number().min(1).max(20).default(10).optional().describe('返回结果数量 (1-20)'),
  time_range: z.enum(['any', 'day', 'week', 'month', 'year']).default('any').optional().describe('时间范围过滤'),
  site: z.string().optional().describe('可选的site:domain 过滤'),
  lang: z.string().optional().describe('ISO 语言代码，如 en, zh, fr'),
  region: z.string().optional().describe('地域/国家偏好，如 US, EU'),
  safe_mode: z.boolean().default(true).optional().describe('启用安全搜索过滤'),
  include_snippets: z.boolean().default(true).optional().describe('包含文本片段')
});

// Define types based on the schema
type WebSearchInput = z.infer<typeof webSearchInputSchema>;

export async function performWebSearch(params: WebSearchInput) {
  try {
    logger.info('web_search called', { params });

    // Validate parameters
    const validatedParams = webSearchInputSchema.parse(params);

    // Check if Perplexity API key is configured
    const env = getEnv();
    if (!env.PERPLEXITY_API_KEY) {
      return createErrorResponse('PERPLEXITY_API_KEY is not configured in environment variables');
    }

    // Perform the search
    const result = await searchWeb(validatedParams);

    logger.info('Web search completed successfully', {
      query: validatedParams.q,
      resultCount: result.results.length,
      responseTime: result.meta.response_time
    });

    return createSuccessResponse(result);
  } catch (error) {
    logger.error('Error in web_search tool', { error, params });
    return createErrorResponse(`Error performing web search: ${error}`);
  }
}

export function registerWebSearchTool(server: McpServer) {
  server.tool(
    'web_search',
    '快速检索并返回原始搜索结果（不做自动成文）。',
    webSearchInputSchema.shape,
    async (params) => {
      return performWebSearch(params);
    }
  );
}