import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse } from '../../utils/common.js';
import { logger } from '../../utils/logger.js';
import { makeSiYuanRequest } from './client.js';

// 优化的数据结构
interface BlockKramdownResult {
  id: string;
  kramdown: string;
  success: boolean;
  error?: string;
}

interface BatchKramdownResponse {
  results: Record<string, string>;
  errors: Record<string, string>;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

interface UpdateBlockResponse {
  success: boolean;
  message: string;
  block_id: string;
  preserved_ial?: string[];
}

export async function getBlockKramdown(blockId: string): Promise<string> {
  const result = await makeSiYuanRequest<{ kramdown: string }>({
    endpoint: 'block/getBlockKramdown',
    data: { id: blockId },
  });

  return result.kramdown;
}

export async function getBlockKramdownMultiple(
  blockIds: string[],
): Promise<BatchKramdownResponse> {
  const results: Record<string, string> = {};
  const errors: Record<string, string> = {};

  // 并发请求所有 block 的 kramdown，但限制并发数避免过多请求
  const batchSize = 10;
  const batches: string[][] = [];
  
  for (let i = 0; i < blockIds.length; i += batchSize) {
    batches.push(blockIds.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const promises = batch.map(async (blockId) => {
      try {
        const kramdown = await getBlockKramdown(blockId);
        results[blockId] = kramdown;
      } catch (error) {
        errors[blockId] = error instanceof Error ? error.message : String(error);
        logger.error('Error getting block kramdown', { block_id: blockId, error });
      }
    });

    await Promise.all(promises);
  }

  // 如果有错误，记录到日志中
  if (Object.keys(errors).length > 0) {
    logger.warn('Some blocks failed to retrieve kramdown', { errors });
  }

  return {
    results,
    errors,
    summary: {
      total: blockIds.length,
      success: Object.keys(results).length,
      failed: Object.keys(errors).length,
    },
  };
}

// 提取IAL属性的工具函数
function extractIALAttributes(content: string): string[] {
  const ialPattern = /\{:([^}]+)\}/g;
  const matches: string[] = [];
  let match;
  
  while ((match = ialPattern.exec(content)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
}

// 保留IAL属性的更新函数
export async function updateBlock(
  blockId: string,
  data: string,
  dataType: 'markdown' | 'dom' = 'markdown',
  options: {
    preserveIAL?: boolean;
    preserveID?: boolean;
  } = { preserveIAL: true, preserveID: true }
): Promise<UpdateBlockResponse> {
  try {
    // 如果需要保留IAL，先获取原始内容
    let preservedIAL: string[] = [];
    let finalData = data;
    
    if (options.preserveIAL || options.preserveID) {
      try {
        const originalKramdown = await getBlockKramdown(blockId);
        const ialAttributes = extractIALAttributes(originalKramdown);
        
        if (options.preserveIAL && ialAttributes.length > 0) {
          preservedIAL = ialAttributes;
          
          // 将IAL属性添加到新内容中
          const ialString = `{:${ialAttributes.join(' ')}}`;
          
          // 如果新内容没有IAL属性，则添加
          if (!data.includes('{:') && !data.includes('}')) {
            finalData = `${data}\n${ialString}`;
          } else if (data.includes('{:') && data.includes('}')) {
            // 如果新内容已有IAL属性，合并它们
            const newIAL = extractIALAttributes(data);
            const mergedIAL = [...new Set([...ialAttributes, ...newIAL])];
            finalData = data.replace(/\{:([^}]+)\}/, `{:${mergedIAL.join(' ')}}`);
          }
        }
      } catch (error) {
        logger.warn('Failed to get original content for IAL preservation', { block_id: blockId, error });
      }
    }

    await makeSiYuanRequest({
      endpoint: 'block/updateBlock',
      data: {
        id: blockId,
        data: finalData,
        dataType,
      },
    });

    return {
      success: true,
      message: `Block ${blockId} updated successfully`,
      block_id: blockId,
      preserved_ial: preservedIAL,
    };
  } catch (error) {
    logger.error('Error updating block', { block_id: blockId, error });
    throw error;
  }
}

export function registerBlockKramdownTool(server: McpServer) {
  server.tool(
    'get_block_kramdown',
    'Get kramdown source code of one or multiple SiYuan note blocks',
    {
      block_id: z
        .union([
          z.string().describe('ID of the SiYuan block to get kramdown from'),
          z.array(z.string()).describe('Array of SiYuan block IDs to get kramdown from'),
        ])
        .describe('Single block ID or array of block IDs'),
    },
    async ({ block_id }) => {
      try {
        logger.info('get_block_kramdown called', { block_id });

        // 处理单个 block ID
        if (typeof block_id === 'string') {
          const kramdown = await getBlockKramdown(block_id);
          logger.info('Block kramdown retrieved successfully', { block_id });
          return createSuccessResponse({
            id: block_id,
            kramdown,
            success: true,
          });
        }

        // 处理多个 block IDs - 限制数量避免上下文过多
        if (block_id.length > 50) {
          return createErrorResponse('Too many block IDs requested. Maximum 50 allowed per request.');
        }

        const response = await getBlockKramdownMultiple(block_id);

        logger.info('Multiple block kramdown retrieved successfully', {
          block_ids: block_id,
          success_count: response.summary.success,
          total_count: response.summary.total,
        });

        // 优化返回结构，只返回必要信息
        const optimizedResponse = {
          results: response.results,
          summary: response.summary,
          // 只包含前5个错误，避免过多上下文
          sample_errors: Object.entries(response.errors).slice(0, 5),
        };

        return createSuccessResponse(optimizedResponse);
      } catch (error) {
        logger.error('Error in get_block_kramdown tool', { error, block_id });
        return createErrorResponse(`Error getting block kramdown: ${error}`);
      }
    },
  );
}

export function registerUpdateBlockTool(server: McpServer) {
  server.tool(
    'update_block',
    'Update a SiYuan note block with new content while preserving IAL metadata',
    {
      block_id: z.string().describe('ID of the SiYuan block to update'),
      data: z.string().describe('New Kramdown content data to update the block with'),
      preserve_ial: z.boolean().optional().describe('Whether to preserve IAL attributes (default: true)'),
      preserve_id: z.boolean().optional().describe('Whether to preserve ID attributes (default: true)'),
    },
    async ({ block_id, data, preserve_ial = true, preserve_id = true }) => {
      try {
        logger.info('update_block called', { 
          block_id, 
          data_length: data.length,
          preserve_ial,
          preserve_id 
        });

        const result = await updateBlock(block_id, data, 'markdown', {
          preserveIAL: preserve_ial,
          preserveID: preserve_id,
        });

        logger.info('Block updated successfully', { 
          block_id,
          preserved_ial_count: result.preserved_ial?.length || 0,
        });

        return createSuccessResponse(result);
      } catch (error) {
        logger.error('Error in update_block tool', { error, block_id });
        return createErrorResponse(`Error updating block: ${error}`);
      }
    },
  );
}
