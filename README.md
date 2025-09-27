# Martin MCP工具箱

[English README](README.en.md) | 中文说明

一个基于 Model Context Protocol (MCP) 的多模态 AI 工具箱，集成了智谱 GLM、Pollinations.AI、思源笔记和 Perplexity 网络搜索四大平台的强大能力。

## 🎯 为什么选择这个 MCP？

在使用 **智谱 GLM 的 Claude Code 套餐**时，我发现了一个限制：

* **Lite 版本**价格更低，但不支持 **图像/视频理解** 和 **联网搜索**；
* 如果要获得这些能力，就必须升级到 **Pro（¥100/月）** 或 **Max（¥200/月）**；
* 但对很多开发者来说，仅仅为了这两个功能升级套餐，成本偏高。

我认为：

* 如果没有图像/视频理解，大模型就**失去了"眼睛"**；
* 如果没有联网搜索，大模型就**失去了"更新知识的能力"**；
* 这让 Lite 版本几乎成了一个"闭门造车"的模型，无法满足日常需求。

于是，我开发了这个 **MCP 插件**：

* 即使只用 **GLM Lite 套餐**，配合这个 MCP，也能为 Claude Code **装上眼睛**（图像/视频理解）和 **搜索引擎**（联网搜索）；
* 让 Lite 用户也能享受"最新知识 + 多模态理解"的体验；
* 这大大提升了 Lite 套餐的性价比，也是我认为本项目最大的价值。

## 🚀 功能特性

### Bigmodel (智谱 GLM)
- 🖼️ **图片分析** - 使用 GLM-4.5V 模型进行图像识别和分析
- 🎬 **视频分析** - 支持视频内容分析和理解
- 🎨 **图片生成** - 使用 CogView-4 系列模型生成高质量图片

### Pollinations.AI
- 🖼️ **图片生成** - 支持多种模型和参数配置
- 📝 **文本生成** - 智能文本生成和对话
- 🔊 **音频生成** - 文字转语音，支持多种声音
- 👁️ **图片分析** - OpenAI 兼容的视觉分析能力

### 思源笔记 (SiYuan)
- 📚 **块级内容获取** - 获取思源笔记块的 Kramdown 源码
- 🔍 **全文搜索** - 支持复杂查询语法的笔记搜索
- ✏️ **内容更新** - 直接更新思源笔记块内容

### 网络搜索
- 🔍 **基础搜索** - 快速检索并返回原始搜索结果
- 🧠 **智能搜索** - 使用 Sonar 模型生成答案并提供引用
- 🛡️ **安全过滤** - 内置安全机制防止恶意内容
- ⚡ **缓存加速** - 智能缓存提高重复查询响应速度

### 通用特性
- 🔧 灵活的环境变量配置
- 📝 完整的日志记录系统
- 🚀 轻量级，易于集成和部署
- 🛡️ TypeScript 类型安全

## 📦 安装

```bash
pnpm install
```

## ⚙️ 配置

### API Key 设置

#### 智谱 GLM API Key
访问 [智谱AI开放平台](https://open.bigmodel.cn/) 获取 API Key：

```bash
export GLM_API_KEY=your_glm_api_key_here
```

#### Perplexity API Key (网络搜索工具必需)
访问 [Perplexity AI](https://www.perplexity.ai/) 获取 API Key：

```bash
export PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

#### 模型配置（可选）
```bash
# GLM 模型配置
GLM_IMAGE_MODEL=glm-4.5v
GLM_VIDEO_MODEL=glm-4.5v
GLM_GENERATION_MODEL=cogview-3-flash

# 思源笔记配置（可选）
SIYUAN_API_TOKEN=your_siyuan_token
SIYUAN_API_BASE=http://127.0.0.1:6806

# 网络搜索配置（可选）
WEB_SEARCH_CACHE_TTL=30
WEB_SEARCH_RATE_LIMIT=5
WEB_SEARCH_RATE_WINDOW_MS=60000
WEB_SEARCH_RETRY_AFTER_MS=1000
WEB_SEARCH_TIMEOUT_MS=10000
```

### 环境变量优先级
1. 系统环境变量（推荐）
2. 执行目录下的 `.env` 文件
3. 项目根目录下的 `.env` 文件

## 🛠️ 使用方法

### 开发模式
```bash
pnpm dev
```

**注意**: 开发模式使用 `node --loader ts-node/esm` 运行，确保 ES 模块导入正常工作。

### 构建
```bash
pnpm build
```

### 运行
```bash
pnpm start
```

### 作为 MCP 工具使用
```bash
./build/index.js
```

## 📚 工具参考

### Bigmodel 工具

#### read_image - 图片分析
**参数：**
- `image_path` (string): 图片文件路径
- `prompt` (string): 分析提示文本
- `temperature` (number, 可选): 采样温度 (0.0-1.0)
- `top_p` (number, 可选): 采样参数 (0.0-1.0)
- `max_tokens` (number, 可选): 最大输出令牌数

**示例：**
```json
{
  "image_path": "/path/to/image.jpg",
  "prompt": "请详细描述这张图片的内容"
}
```

#### analyze_video - 视频分析
**参数：**
- `video_url` (string): 视频文件 URL
- `prompt` (string): 分析提示文本
- `temperature` (number, 可选): 采样温度 (0.0-1.0)
- `top_p` (number, 可选): 采样参数 (0.0-1.0)
- `max_tokens` (number, 可选): 最大输出令牌数

**示例：**
```json
{
  "video_url": "https://example.com/video.mp4",
  "prompt": "分析这个视频的主要内容"
}
```

#### generate_image - 图片生成
**参数：**
- `prompt` (string): 图片描述文本
- `quality` (string, 可选): 图片质量 (hd/standard)
- `size` (string, 可选): 图片尺寸
- `save_path` (string, 可选): 图片保存路径

**示例：**
```json
{
  "prompt": "一只可爱的小猫咪，卡通风格",
  "quality": "standard",
  "size": "1024x1024",
  "save_path": "./cat.png"
}
```

### Pollinations.AI 工具

#### pollinations_generate_image - 图片生成
**参数：**
- `prompt` (string): 图片描述文本
- `model` (string, 可选): 生成模型 (默认: flux)
- `width` (number, 可选): 图片宽度 (64-2048)
- `height` (number, 可选): 图片高度 (64-2048)
- `seed` (number, 可选): 随机种子
- `nologo` (boolean, 可选): 禁用 logo
- `private` (boolean, 可选): 私有生成
- `enhance` (boolean, 可选): 增强提示词
- `safe` (boolean, 可选): 安全过滤
- `transparent` (boolean, 可选): 透明背景

**示例：**
```json
{
  "prompt": "A beautiful landscape with mountains",
  "model": "flux",
  "width": 1024,
  "height": 768
}
```

#### pollinations_generate_text - 文本生成
**参数：**
- `prompt` (string): 文本提示
- `model` (string, 可选): 生成模型 (默认: openai)
- `temperature` (number, 可选): 随机性 (0.0-3.0)
- `top_p` (number, 可选): 核心采样 (0.0-1.0)
- `json` (boolean, 可选): JSON 格式输出
- `system` (string, 可选): 系统提示词
- `stream` (boolean, 可选): 流式输出

**示例：**
```json
{
  "prompt": "写一首关于春天的诗",
  "model": "openai",
  "temperature": 0.8
}
```

#### pollinations_generate_audio - 音频生成
**参数：**
- `prompt` (string): 要转换的文本
- `voice` (string, 可选): 声音选择 (alloy/echo/fable/onyx/nova/shimmer)
- `model` (string, 可选): 音频模型 (默认: openai-audio)

**示例：**
```json
{
  "prompt": "你好，欢迎使用我们的服务！",
  "voice": "nova"
}
```

#### pollinations_analyze_image - 图片分析
**参数：**
- `image_path` (string, 可选): 本地图片路径
- `image_url` (string, 可选): 图片 URL
- `prompt` (string): 分析提示文本
- `model` (string, 可选): 分析模型 (默认: openai)
- `max_tokens` (number, 可选): 最大输出令牌数

**示例：**
```json
{
  "image_path": "/path/to/image.jpg",
  "prompt": "What's in this image?",
  "model": "openai"
}
```

### 网络搜索工具

#### web_search - 网络搜索
**参数：**
- `q` (string): 搜索查询文本
- `top_k` (number, 可选): 返回结果数量 (1-20, 默认: 10)
- `time_range` (string, 可选): 时间范围 (any/day/week/month/year, 默认: any)
- `site` (string, 可选): 限制搜索站点
- `lang` (string, 可选): 搜索语言 (默认: zh)
- `region` (string, 可选): 搜索区域 (默认: CN)
- `safe_mode` (boolean, 可选): 安全搜索模式 (默认: true)
- `include_snippets` (boolean, 可选): 包含摘要片段 (默认: true)

**示例：**
```json
{
  "q": "人工智能最新发展",
  "top_k": 5,
  "time_range": "month",
  "lang": "zh",
  "region": "CN"
}
```

#### advanced_web_search - 高级网络搜索
**参数：**
- `q` (string): 搜索查询文本
- `top_k` (number, 可选): 返回结果数量 (1-20, 默认: 10)
- `time_range` (string, 可选): 时间范围 (any/day/week/month/year, 默认: any)
- `site` (string, 可选): 限制搜索站点
- `lang` (string, 可选): 搜索语言 (默认: zh)
- `region` (string, 可选): 搜索区域 (默认: CN)
- `safe_mode` (boolean, 可选): 安全搜索模式 (默认: true)
- `include_snippets` (boolean, 可选): 包含摘要片段 (默认: true)
- `operators` (array, 可选): 搜索操作符 (OR/AND)
- `exclude_sites` (array, 可选): 排除站点列表
- `from` (string, 可选): 起始日期 (YYYY-MM-DD)
- `to` (string, 可选): 结束日期 (YYYY-MM-DD)
- `dedupe` (string, 可选): 去重策略 (none/domain/title, 默认: none)
- `aggregate` (boolean, 可选): 聚合相似结果
- `engine` (string, 可选): 搜索引擎 (raw_search/sonar_answer)
- `sonar_model` (string, 可选): Sonar模型 (sonar/sonar-pro/sonar-reasoning/sonar-reasoning-pro/sonar-deep-research)

**示例：**
```json
{
  "q": "机器学习研究论文",
  "top_k": 10,
  "time_range": "year",
  "exclude_sites": ["example.com", "spam.com"],
  "from": "2023-01-01",
  "to": "2023-12-31",
  "dedupe": "domain",
  "engine": "sonar_answer",
  "sonar_model": "sonar-reasoning-pro"
}
```

### 思源笔记工具

#### get_block_kramdown - 获取块级内容
**参数：**
- `block_id` (string|array): 单个块ID或块ID数组

**示例：**
```json
{
  "block_id": "20240825123456-1a2b3c4d"
}
```

**多块获取示例：**
```json
{
  "block_id": ["20240825123456-1a2b3c4d", "20240825123456-5e6f7g8h"]
}
```

#### update_block - 更新块内容
**参数：**
- `block_id` (string): 要更新的块ID
- `data` (string): 新的Kramdown内容数据
- `data_type` (string, 可选): 数据类型 (markdown/dom，默认: markdown)

**示例：**
```json
{
  "block_id": "20240825123456-1a2b3c4d",
  "data": "# 新标题\n\n更新后的内容",
  "data_type": "markdown"
}
```

#### siyuan_search_blocks - 全文搜索
**参数：**
- `query` (string): 搜索查询文本，支持完整全文查询语法
- `paths` (array, 可选): 指定搜索路径
- `page` (number, 可选): 分页页码

**搜索语法示例：**
```json
{
  "query": "机器学习 OR 深度学习",
  "paths": ["/笔记/技术/"],
  "page": 1
}
```

**高级查询示例：**
```json
{
  "query": "NEAR(人工智能 算法, 10) -广告",
  "page": 1
}
```

**支持的查询操作符：**
- **OR** - 逻辑或：包含任一即可
- **NEAR(词1 词2, N)** - 邻近搜索：距离在N词内
- **AND** - 逻辑与：必须同时包含
- **^词** - 权重提升：提高重要性
- **-词** - 排除：明确排除
- **(查询)** - 分组：组合逻辑

#### siyuan_database_query - 数据库查询
**参数：**
- `stmt` (string): SQL 查询语句，例如: SELECT * FROM blocks WHERE type = 'av' LIMIT 10
- `limit` (number, 可选): 限制返回结果的数量
- `offset` (number, 可选): 偏移量，用于分页查询

**示例：**
```json
{
  "stmt": "SELECT * FROM blocks WHERE type = 'av'",
  "limit": 10
}
```

**高级查询示例：**
```json
{
  "stmt": "SELECT b.id, b.content, a.name, a.value FROM blocks b JOIN attributes a ON b.id = a.block_id WHERE b.parent_id = '数据库块ID'",
  "limit": 20,
  "offset": 0
}
```

#### siyuan_query_sql - SQL查询
**参数：**
- `stmt` (string): SQL 查询语句，例如: SELECT * FROM blocks WHERE content LIKE '%content%' LIMIT 7

**示例：**
```json
{
  "stmt": "SELECT * FROM blocks WHERE type = 'd' LIMIT 5"
}
```

**高级查询示例：**
```json
{
  "stmt": "SELECT distinct B.* from blocks as B join attributes as A on B.id = A.block_id where A.name like 'custom-dailynote-%' and B.type='d' and A.value >= '20231010' and A.value <= '20231013' order by A.value desc"
}
```

## 📝 日志系统

项目包含完整的日志记录系统，所有工具调用都会记录到项目根目录的 `mcpserver.log` 文件中：

- **INFO**: 工具调用和成功操作
- **ERROR**: 错误和异常信息
- **DEBUG**: 详细调试信息
- **WARN**: 警告信息

## 🔍 项目结构

```
src/
├── config/
│   ├── index.ts              # GLM 配置和默认参数
│   └── pollinations.ts       # Pollinations.AI 配置
├── tools/
│   ├── bigmodel/             # 智谱 GLM 工具
│   │   ├── image-analysis.ts     # 图片分析工具
│   │   ├── video-analysis.ts     # 视频分析工具
│   │   └── image-generation.ts   # 图片生成工具
│   ├── pollinations/         # Pollinations.AI 工具
│   │   ├── image-generation.ts   # 图片生成工具
│   │   ├── text-generation.ts    # 文本生成工具
│   │   ├── audio-generation.ts   # 音频生成工具
│   │   └── image-analysis.ts     # 图片分析工具
│   ├── siyuan/              # 思源笔记工具
│   │   ├── block-kramdown.ts     # 块级 Kramdown 获取工具
│   │   ├── database-query.ts     # 数据库查询工具
│   │   ├── sql-query.ts          # SQL 查询工具
│   │   ├── search.ts             # 全文搜索工具
│   │   ├── client.ts             # 思源 API 客户端
│   │   └── index.ts              # 思源工具索引
│   └── web-search/           # 网络搜索工具
│       ├── web-search.ts         # 网络搜索工具实现
│       ├── advanced-web-search.ts # 高级网络搜索工具实现
│       ├── client.ts             # Perplexity API 客户端
│       ├── sonar-client.ts       # Sonar 模型客户端
│       ├── cache.ts              # 缓存实现
│       ├── rate-limiter.ts       # 限速器实现
│       ├── security.ts           # 安全工具
│       ├── errors.ts             # 错误处理
│       └── types.ts              # 类型定义
├── utils/
│   ├── helpers.ts           # 通用助手函数
│   ├── common.ts            # 响应格式化函数
│   └── logger.ts            # 日志系统
└── index.ts                 # 主服务器入口，工具注册
```

## 📄 许可证

ISC

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请创建 Issue 或联系维护者。

## 🙏 致谢

本项目 fork 自 [2234839 崮生](https://github.com/2234839/mcpserver.git) 的项目，在此基础上进行了功能增强和扩展，已向原项目提交了 feature PR。

感谢原作者的杰出工作！🎉