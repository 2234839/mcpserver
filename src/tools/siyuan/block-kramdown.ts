import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse } from '../../utils/common.js';
import { logger } from '../../utils/logger.js';
import { makeSiYuanRequest } from './client.js';

export async function getBlockKramdown(blockId: string): Promise<string> {
  const result = await makeSiYuanRequest<{ kramdown: string }>({
    endpoint: 'block/getBlockKramdown',
    data: { id: blockId },
  });

  return result.kramdown;
}

export async function getBlockKramdownMultiple(
  blockIds: string[],
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const errors: Record<string, string> = {};

  // 并发请求所有 block 的 kramdown
  const promises = blockIds.map(async (blockId) => {
    try {
      const kramdown = await getBlockKramdown(blockId);
      results[blockId] = kramdown;
    } catch (error) {
      errors[blockId] = error instanceof Error ? error.message : String(error);
      logger.error('Error getting block kramdown', { block_id: blockId, error });
    }
  });

  await Promise.all(promises);

  // 如果有错误，记录到日志中
  if (Object.keys(errors).length > 0) {
    logger.warn('Some blocks failed to retrieve kramdown', { errors });
  }

  return results;
}

export async function updateBlock(
  blockId: string,
  data: string,
  dataType: 'markdown' | 'dom' = 'markdown',
): Promise<void> {
  await makeSiYuanRequest({
    endpoint: 'block/updateBlock',
    data: {
      id: blockId,
      data,
      dataType,
    },
  });
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
          return createSuccessResponse(kramdown);
        }

        // 处理多个 block IDs
        const results = await getBlockKramdownMultiple(block_id);

        logger.info('Multiple block kramdown retrieved successfully', {
          block_ids: block_id,
          success_count: Object.keys(results).length,
          total_count: block_id.length,
        });

        return createSuccessResponse({
          results,
          summary: {
            total: block_id.length,
            success: Object.keys(results).length,
            failed: block_id.length - Object.keys(results).length,
          },
        });
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
    'Update a SiYuan note block with new content',
    {
      block_id: z.string().describe('ID of the SiYuan block to update'),
      data: z.string().describe('New Kramdown content data to update the block with'),
    },
    async ({ block_id, data }) => {
      try {
        logger.info('update_block called', { block_id, data_length: data.length });

        await updateBlock(block_id, data);

        logger.info('Block updated successfully', { block_id });
        return createSuccessResponse({
          success: true,
          message: `Block ${block_id} updated successfully`,
          block_id,
        });
      } catch (error) {
        logger.error('Error in update_block tool', { error, block_id });
        return createErrorResponse(`Error updating block: ${error}`);
      }
    },
  );
}
