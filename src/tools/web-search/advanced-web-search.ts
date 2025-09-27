import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse } from '../../utils/common.js';
import { logger } from '../../utils/logger.js';
import { searchWeb } from './client.js';
import { generateAnswerWithSonar } from './sonar-client.js';
import { getEnv } from '../../utils/helpers.js';

// Define the input schema for advanced web search
const advancedWebSearchInputSchema = z.object({
  q: z.string().describe('查询语句'),
  top_k: z.number().min(1).max(20).default(10).optional().describe('返回结果数量 (1-20)'),
  time_range: z.enum(['any', 'day', 'week', 'month', 'year']).default('any').optional().describe('时间范围过滤'),
  site: z.string().optional().describe('可选的site:domain 过滤'),
  lang: z.string().optional().describe('ISO 语言代码，如 en, zh, fr'),
  region: z.string().optional().describe('地域/国家偏好，如 US, EU'),
  safe_mode: z.boolean().default(true).optional().describe('启用安全搜索过滤'),
  include_snippets: z.boolean().default(true).optional().describe('包含文本片段'),
  operators: z.array(z.string()).optional().describe('逻辑/语法运算，如 OR/AND/"exact"'),
  exclude_sites: z.array(z.string()).optional().describe('要排除的站点'),
  from: z.string().optional().describe('起始日期 YYYY-MM-DD'),
  to: z.string().optional().describe('结束日期 YYYY-MM-DD'),
  dedupe: z.enum(['none', 'domain', 'title']).default('domain').optional().describe('去重策略'),
  aggregate: z.boolean().default(true).optional().describe('启用结果聚合'),
  engine: z.enum(['raw_search', 'sonar_answer']).default('raw_search').optional().describe('处理引擎'),
  sonar_model: z.enum(['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro', 'sonar-deep-research']).optional().describe('特定的 Sonar 模型')
});

// Define types based on the schema
type AdvancedWebSearchInput = z.infer<typeof advancedWebSearchInputSchema>;

export async function performAdvancedWebSearch(params: AdvancedWebSearchInput) {
  try {
    logger.info('advanced_web_search called', { params });

    // Validate parameters
    const validatedParams = advancedWebSearchInputSchema.parse(params);

    // Check if required API keys are configured
    const env = getEnv();
    if (!env.PERPLEXITY_API_KEY) {
      return createErrorResponse('PERPLEXITY_API_KEY is not configured in environment variables');
    }

    // If using Sonar engine, check for Sonar API key
    if (validatedParams.engine === 'sonar_answer' && validatedParams.sonar_model) {
      // For now, we'll assume the same API key works for Sonar
      // In a real implementation, you might need a separate Sonar API key
    }

    let result;

    // Perform the search based on the engine
    if (validatedParams.engine === 'sonar_answer' && validatedParams.sonar_model) {
      // Use Sonar model to generate answer with citations
      result = await generateAnswerWithSonar(validatedParams);
    } else {
      // Use raw Perplexity search
      result = await searchWeb(validatedParams);
    }

    logger.info('Advanced web search completed successfully', {
      query: validatedParams.q,
      engine: validatedParams.engine,
      resultCount: result.results.length,
      responseTime: result.meta.response_time
    });

    return createSuccessResponse(result);
  } catch (error) {
    logger.error('Error in advanced_web_search tool', { error, params });
    return createErrorResponse(`Error performing advanced web search: ${error}`);
  }
}

export function registerAdvancedWebSearchTool(server: McpServer) {
  server.tool(
    'advanced_web_search',
    '在 web_search 的基础上，支持更复杂检索参数与结果整形；并可选启用 Sonar 直答（需要时才开）。',
    advancedWebSearchInputSchema.shape,
    async (params) => {
      return performAdvancedWebSearch(params);
    }
  );
}