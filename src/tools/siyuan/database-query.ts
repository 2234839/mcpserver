import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse } from '../../utils/common.js';
import { logger } from '../../utils/logger.js';
import { makeSiYuanRequest } from './client.js';

// 数据库查询参数接口
interface DatabaseQueryParams {
  stmt: string;
  limit?: number;
  offset?: number;
}

// 数据库查询结果接口
interface DatabaseQueryResult {
  results: any[];
  executionTime?: number;
  rowCount?: number;
}

// 执行数据库查询的函数
export async function executeDatabaseQuery(params: DatabaseQueryParams): Promise<DatabaseQueryResult> {
  try {
    const { stmt, limit, offset } = params;

    // 构建查询语句（如果需要分页）
    let queryStmt = stmt.trim();
    if (limit !== undefined) {
      queryStmt += ` LIMIT ${limit}`;
    }
    if (offset !== undefined) {
      queryStmt += ` OFFSET ${offset}`;
    }

    const result = await makeSiYuanRequest<DatabaseQueryResult>({
      endpoint: 'query/sql',
      data: { stmt: queryStmt },
    });

    return result;
  } catch (error) {
    logger.error('Database query execution failed', { stmt: params.stmt, error });
    throw error;
  }
}

// 注册数据库查询工具
export function registerDatabaseQueryTool(server: McpServer) {
  server.tool(
    'siyuan_database_query',
    `思源数据库查询工具 - 执行 SQLite 查询语句来查询思源笔记的数据库（树形视图/属性视图）

## 功能说明
此工具允许您查询思源笔记中的数据库（也称为树形视图或属性视图）。您可以使用标准的 SQLite 语法来查询数据库中的数据。

## 支持的表
- blocks: 内容块表
- attributes: 属性表
- refs: 引用表

## 数据库表结构
### blocks 表
- id: 内容块 ID
- parent_id: 父块 ID
- root_id: 文档块 ID
- box: 笔记本 ID
- path: 内容块路径
- hpath: 人类可读路径
- name: 内容块名称
- alias: 别名
- memo: 备注
- tag: 标签
- content: 内容文本
- fcontent: 第一个子块内容
- markdown: Markdown 格式内容
- length: 内容长度
- type: 块类型 (d:文档, h:标题, p:段落, l:列表, t:表格, b:引述, s:超级块, c:代码块, m:数学公式, av:数据库)
- subtype: 子类型
- ial: 内联属性列表
- sort: 排序权重
- created: 创建时间
- updated: 更新时间

### attributes 表
- id: 属性 ID
- name: 属性名称 (自定义属性需加 custom- 前缀)
- value: 属性值
- type: 类型
- block_id: 块 ID
- root_id: 文档 ID
- box: 笔记本 ID
- path: 文档路径

### refs 表
- id: 引用 ID
- def_block_id: 被引用块 ID
- def_block_root_id: 被引用块文档 ID
- def_block_path: 被引用块路径
- block_id: 引用块 ID
- root_id: 引用块文档 ID
- box: 笔记本 ID
- path: 引用块路径
- content: 引用锚文本

## 使用示例
1. 查询所有数据库块:
   SELECT * FROM blocks WHERE type = 'av' LIMIT 10

2. 查询特定数据库中的记录:
   SELECT * FROM blocks WHERE parent_id = '数据库块ID' LIMIT 20

3. 查询具有特定属性的块:
   SELECT * FROM attributes WHERE name = 'custom-status' AND value = '完成'

4. 查询数据库中的记录及其属性:
   SELECT b.id, b.content, a.name, a.value
   FROM blocks b
   JOIN attributes a ON b.id = a.block_id
   WHERE b.parent_id = '数据库块ID'
   LIMIT 10

## 安全注意事项
- 只允许执行 SELECT 查询语句
- 禁止执行修改数据的语句 (INSERT, UPDATE, DELETE, DROP等)
- 查询结果会自动限制返回的行数以防止过大响应`,
    {
      stmt: z
        .string()
        .describe("SQL 查询语句，例如: SELECT * FROM blocks WHERE type = 'av' LIMIT 10"),
      limit: z
        .number()
        .optional()
        .describe("限制返回结果的数量"),
      offset: z
        .number()
        .optional()
        .describe("偏移量，用于分页查询"),
    },
    async (params) => {
      try {
        logger.info('siyuan_database_query called', { params });

        // 基本的安全检查
        const normalizedStmt = params.stmt.trim().toLowerCase();

        // 防止危险的 SQL 操作
        const dangerousPatterns = [
          /drop\s+/i,
          /delete\s+/i,
          /update\s+/i,
          /insert\s+/i,
          /create\s+/i,
          /alter\s+/i,
          /truncate\s+/i,
          /pragma\s+/i,
          /vacuum\s+/i,
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(normalizedStmt)) {
            logger.warn('Dangerous SQL pattern detected', { stmt: params.stmt });
            return createErrorResponse('只允许执行 SELECT 查询语句');
          }
        }

        // 确保是 SELECT 语句
        if (!normalizedStmt.startsWith('select')) {
          logger.warn('Non-SELECT SQL statement attempted', { stmt: params.stmt });
          return createErrorResponse('只允许执行 SELECT 查询语句');
        }

        const result = await executeDatabaseQuery(params);

        return createSuccessResponse(result);
      } catch (error) {
        logger.error('Error in siyuan_database_query tool', { error, params });
        return createErrorResponse(`数据库查询工具错误: ${error}`);
      }
    },
  );
}