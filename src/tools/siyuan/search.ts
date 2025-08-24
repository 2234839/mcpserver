import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse } from '../../utils/common.js';
import { logger } from '../../utils/logger.js';
import { makeSiYuanRequest } from './client.js';

export interface SearchParams {
  query: string;
  method?: number;
  types?: Record<string, boolean>;
  paths?: string[];
  groupBy?: number;
  orderBy?: number;
  page?: number;
}

export interface SearchResult {
  blocks: Array<{
    id: string;
    type: string;
    content: string;
    fcontent: string;
    path: string;
    box: string;
    hPath: string;
    rootID: string;
    alias: string;
    memo: string;
    tag: string;
    ial: Record<string, any>;
    name: string;
    refText: string;
    parentID: string;
    defID: string;
    defPath: string;
    created: string;
    updated: string;
    count: number;
    depth: number;
    sort: number;
    subType: string;
    folded: boolean;
    markdown: string;
    riffCard: any;
    riffCardID: string;
    children: any;
    refs: any;
  }>;
  matchedBlockCount: number;
  matchedRootCount: number;
  pageCount: number;
}

export async function searchBlocks(params: SearchParams): Promise<SearchResult> {
  const searchPayload = {
    query: params.query,
    method: params.method ?? 1,
    types: params.types ?? {
      audioBlock: true,
      blockquote: true,
      codeBlock: true,
      databaseBlock: true,
      document: true,
      embedBlock: true,
      heading: true,
      htmlBlock: true,
      iframeBlock: true,
      list: false,
      listItem: false,
      mathBlock: true,
      paragraph: true,
      superBlock: true,
      table: false,
      videoBlock: true,
      widgetBlock: true,
    },
    paths: params.paths ?? [],
    groupBy: params.groupBy ?? 0,
    orderBy: params.orderBy ?? 0,
    page: params.page ?? 1,
    reqId: Date.now(),
  };

  return await makeSiYuanRequest<SearchResult>({
    endpoint: 'search/fullTextSearchBlock',
    data: searchPayload,
  });
}

export function registerSearchTool(server: McpServer) {
  server.tool(
    'siyuan_search_blocks',
    'Search for blocks in SiYuan notes using full-text search',
    {
      query: z.string().describe(`Search query text,支持 Full-text Query Syntax 语法

### 基本操作符
1. **OR** - 逻辑或：包含任一即可（优先使用，保证搜索结果）
2. **NEAR(词1 词2, N)** - 邻近搜索：距离在N词内，如 NEAR(机器学习 算法, 10)
3. **AND** - 逻辑与：必须同时包含（谨慎使用，容易导致零结果）
4. **^词** - 权重提升：提高重要性，如 ^深度学习
5. **-词** - 排除：明确排除，如 -广告
6. **(查询)** - 分组：组合逻辑，如 (机器学习 OR 深度学习)

## 重要原则

### 避免"零结果"的策略
1. **优先使用 OR**：对同义词、相关词用 OR 连接
2. **谨慎使用 AND**：只在确定必须同时出现时使用
3. **放宽 NEAR 距离**：使用 10-15 的较大距离
4. **多层次查询**：主查询 OR (备选查询1) OR (备选查询2)
5. **避免过度限制**：不要堆砌太多 AND 条件

### 查询构建优先级
1. **核心词 OR 相关词**：保证基础搜索结果
2. **NEAR(核心词 相关词, 10-15)**：提升精确度但不过度限制
3. **选择性 AND**：只对绝对必要的条件使用 AND
4. **权重提升**：对最重要概念使用 ^
5. **排除干扰**：只对明显无关内容使用 -`),
      paths: z.array(z.string()).optional().describe('Specific paths to search within'),
      page: z.number().optional().describe('Page number for pagination'),
    },
    async (params) => {
      try {
        logger.info('siyuan_search_blocks called', { params });

        const result = await searchBlocks(params);

        logger.info('SiYuan search completed successfully', {
          query: params.query,
          matchedBlocks: result.matchedBlockCount
        });

        return createSuccessResponse(JSON.stringify({
          blocks: result.blocks,
          summary: {
            matchedBlockCount: result.matchedBlockCount,
            matchedRootCount: result.matchedRootCount,
            pageCount: result.pageCount,
            currentPage: params.page ?? 1,
          }
        }, null, 2));
      } catch (error) {
        logger.error('Error in siyuan_search_blocks tool', { error, params });
        return createErrorResponse(`Error searching SiYuan blocks: ${error}`);
      }
    },
  );
}