# 崮生 MCP 工具箱开发指南

## 项目概述

这是一个基于 Model Context Protocol (MCP) 的多模态 AI 工具箱，集成了智谱 GLM 和 Pollinations.AI 两大平台的强大能力。项目采用 TypeScript 开发，提供图像分析、视频分析、图像生成、文本生成、音频生成等功能，并支持思源笔记集成。

## 技术栈

- **语言**: TypeScript (ES2022)
- **运行时**: Node.js (Node16 modules)
- **包管理器**: pnpm
- **核心框架**: @modelcontextprotocol/sdk
- **验证库**: Zod
- **环境配置**: dotenv

## 项目结构

```
src/
├── index.ts                 # 主服务器入口，工具注册
├── config/
│   ├── index.ts            # GLM 配置和默认参数
│   └── pollinations.ts     # Pollinations.AI 配置
├── tools/
│   ├── bigmodel/           # 智谱 GLM 工具
│   │   ├── image-analysis.ts    # 图片分析工具
│   │   ├── video-analysis.ts    # 视频分析工具
│   │   └── image-generation.ts  # 图片生成工具
│   ├── pollinations/       # Pollinations.AI 工具
│   │   ├── image-generation.ts  # 图片生成工具
│   │   ├── text-generation.ts   # 文本生成工具
│   │   ├── audio-generation.ts  # 音频生成工具
│   │   └── image-analysis.ts    # 图片分析工具
│   └── siyuan/            # 思源笔记工具
│       └── block-kramdown.ts   # 块级 Kramdown 获取工具
└── utils/
    ├── helpers.ts         # 通用助手函数
    ├── common.ts          # 响应格式化函数
    └── logger.ts          # 日志系统
```

## 开发环境设置

### 1. 安装依赖

```bash
pnpm install
```

### 2. 环境变量配置

创建 `.env` 文件（可选）或设置系统环境变量：

```bash
# 必需：智谱 GLM API Key
GLM_API_KEY=your_glm_api_key_here

# 可选：模型配置
GLM_IMAGE_MODEL=glm-4.5v
GLM_VIDEO_MODEL=glm-4.5v
GLM_GENERATION_MODEL=cogview-3-flash

# 可选：思源笔记配置
SIYUAN_API_TOKEN=your_siyuan_token
SIYUAN_API_BASE=http://127.0.0.1:6806
```

### 3. 可用脚本

```bash
# TypeScript 类型检查
pnpm tsc

# 构建项目
pnpm build
```

## 架构模式

### 1. 服务器架构

- **主服务器**: 使用 `McpServer` 类创建 MCP 服务器
- **传输层**: 使用 `StdioServerTransport` 进行标准输入输出通信
- **工具注册**: 每个工具都通过独立的注册函数注册到服务器

### 2. 工具开发模式

每个工具都遵循相同的模式：

```typescript
export function registerXXXTool(server: McpServer) {
  server.tool(
    'tool_name',                    // 工具名称
    'Tool description',             // 工具描述
    {                                // 参数验证（Zod schema）
      param1: z.string().describe('Parameter description'),
      param2: z.number().optional().describe('Optional parameter')
    },
    async ({ param1, param2 }) => {  // 处理函数
      try {
        // 业务逻辑
        logger.info('Tool called', { param1, param2 });
        const result = await businessLogic(param1, param2);
        return createSuccessResponse(result);
      } catch (error) {
        logger.error('Error in tool', { error });
        return createErrorResponse(`Error: ${error}`);
      }
    }
  );
}
```

### 3. 配置管理

- **默认配置**: 在 `src/config/index.ts` 中定义
- **环境变量**: 通过 `src/utils/helpers.ts` 中的 `getEnv()` 函数管理
- **优先级**: 系统环境变量 > 执行目录 `.env` > 项目根目录 `.env`

### 4. 日志系统

- **日志文件**: 项目根目录下的 `mcpserver.log`
- **日志级别**: INFO, ERROR, DEBUG, WARN
- **使用方式**:
  ```typescript
  import { logger } from '../utils/logger.js';

  logger.info('Message', { data });
  logger.error('Error message', { error });
  ```

### 5. 响应格式化

使用 `src/utils/common.ts` 中的函数统一响应格式：

```typescript
import { createSuccessResponse, createErrorResponse } from '../utils/common.js';

// 成功响应
return createSuccessResponse(result);

// 错误响应
return createErrorResponse('Error message');
```

## 关键工具说明

### Bigmodel (智谱 GLM) 工具

1. **read_image**: 使用 GLM-4.5V 进行图像分析
2. **analyze_video**: 视频内容分析
3. **generate_image**: 使用 CogView-4 系列生成图片

### Pollinations.AI 工具

1. **pollinations_generate_image**: 多模型图片生成
2. **pollinations_generate_text**: 智能文本生成
3. **pollinations_generate_audio**: 文字转语音
4. **pollinations_analyze_image**: OpenAI 兼容的图像分析

### 思源笔记工具

1. **get_block_kramdown**: 获取思源笔记块的 Kramdown 源码

## 开发规范

### 1. TypeScript 规范

- 使用 ES2022 目标版本
- 启用严格模式 (`strict: true`)
- 使用 Node16 模块系统
- 导入时使用 `.js` 扩展名

### 2. 错误处理

- 所有工具都必须包含 try-catch 错误处理
- 使用 logger 记录错误信息
- 返回标准化的错误响应

### 3. 参数验证

- 使用 Zod 进行参数验证和描述
- 所有参数都必须有描述信息
- 可选参数使用 `.optional()`

### 4. 日志记录

- 工具调用时记录 INFO 级别日志
- 错误发生时记录 ERROR 级别日志
- 调试信息使用 DEBUG 级别

## 环境变量参考

### 必需变量

- `GLM_API_KEY`: 智谱 AI API 密钥

### 可选变量

- `GLM_IMAGE_MODEL`: 图像分析模型 (默认: glm-4.5v)
- `GLM_VIDEO_MODEL`: 视频分析模型 (默认: glm-4.5v)
- `GLM_GENERATION_MODEL`: 图像生成模型 (默认: cogview-4)
- `SIYUAN_API_TOKEN`: 思源笔记 API 令牌
- `SIYUAN_API_BASE`: 思源笔记 API 基础地址 (默认: http://127.0.0.1:6806)

## 测试和调试

### 1. 开发模式测试

```bash
pnpm dev
```

**注意**: 开发模式使用 `node --loader ts-node/esm` 运行，确保 ES 模块导入正常工作。

### 2. 构建和运行

```bash
pnpm build
pnpm start
```

### 3. 类型检查

```bash
pnpm tsc
```

### 4. 日志查看

```bash
tail -f mcpserver.log
```

## 部署说明

### 1. 构建产物

- 输出目录: `build/`
- 主文件: `build/index.js`
- 可执行权限: 构建时自动设置

### 2. 作为 MCP 工具使用

```bash
./build/index.js
```

### 3. NPM 发布

项目已配置为可发布的 NPM 包，包含：
- 正确的 `package.json` 配置
- 文件白名单 (`files`)
- 可执行文件 (`bin`)

## 常见问题

### 1. 环境变量问题

- 确保 `GLM_API_KEY` 已正确设置
- 检查 `.env` 文件位置和格式

### 2. 模型访问问题

- 确保智谱 AI 账户有足够的权限
- 检查 API 密钥是否有效

### 3. 文件路径问题

- 使用绝对路径或相对路径时注意当前工作目录
- 确保文件存在且有读取权限

### 4. 网络连接问题

- 确保能访问智谱 AI 和 Pollinations.AI 的 API
- 检查防火墙和代理设置

## 扩展开发

### 添加新工具

1. 在 `src/tools/` 相应目录创建新文件
2. 实现工具注册函数
3. 在 `src/index.ts` 中注册新工具
4. 更新文档和类型定义

### 添加新平台

1. 在 `src/config/` 中添加配置文件
2. 在 `src/utils/helpers.ts` 中添加辅助函数
3. 创建工具目录并实现相关工具
4. 更新主服务器的工具注册

## 许可证

ISC License