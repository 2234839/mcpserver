# Gusheng MCP Toolbox

[中文说明](README.md) | English README

A Model Context Protocol (MCP) based multimodal AI toolbox that integrates Zhipu GLM and Pollinations.AI platforms with web search capabilities.

## Features

- 🖼️ Support for multiple image formats (PNG, JPG, JPEG, GIF)
- 🤖 Integrated with Zhipu GLM-4.5V model for image analysis
- 🔍 Web search capabilities with Perplexity API integration
- 🧠 Advanced search with Sonar models for intelligent answers
- 🛡️ Built-in security mechanisms to prevent malicious content
- ⚡ Smart caching for improved response times on repeated queries
- 🔧 Flexible environment variable configuration with multi-level lookup
- 🚀 Lightweight, easy to integrate and deploy

## Installation

```bash
pnpm install
```

## Configuration

### API Key Setup

This project supports multiple ways to set API Keys, in priority order:

1. **System Environment Variables** (Recommended)
   ```bash
   export GLM_API_KEY=your_api_key_here
   export PERPLEXITY_API_KEY=your_perplexity_api_key_here
   ```

2. **.env file in execution directory**
   Create `.env` file in the directory where you run the command:
   ```
   GLM_API_KEY=your_api_key_here
   PERPLEXITY_API_KEY=your_perplexity_api_key_here
   ```

3. **.env file in project directory**
   Create `.env` file in the project root directory

### Getting API Key

1. **Zhipu AI API Key**: Please visit [Zhipu AI Open Platform](https://open.bigmodel.cn/) to get your API Key.

2. **Perplexity API Key**: Please visit [Perplexity AI](https://www.perplexity.ai/) to get your API Key. This is required for web search functionality.

### Optional Configuration Variables

For web search functionality, you can also configure the following environment variables:

- `WEB_SEARCH_CACHE_TTL`: Search cache expiration time in minutes (default: 30)
- `WEB_SEARCH_RATE_LIMIT`: Request rate limit per window (default: 5)
- `WEB_SEARCH_RATE_WINDOW_MS`: Rate limit window in milliseconds (default: 60000)
- `WEB_SEARCH_RETRY_AFTER_MS`: Retry wait time in milliseconds after rate limiting (default: 1000)
- `WEB_SEARCH_TIMEOUT_MS`: API request timeout in milliseconds (default: 10000)

## Usage

### Development Mode

```bash
pnpm dev
```

**Note**: Development mode uses `node --loader ts-node/esm` to ensure ES module imports work correctly.

### Build

```bash
pnpm build
```

### Run

```bash
pnpm start
```

### Use as MCP Tool

After building, you can use it as an MCP tool in other applications:

```bash
./build/index.js
```

## API Reference

### read_image tool

Analyze image content.

**Parameters:**
- `image_path` (string): Path to the image file
- `prompt` (string): Analysis prompt text

**Example:**
```json
{
  "image_path": "/path/to/image.png",
  "prompt": "Please describe the main content in this image"
}
```

### web_search tool

Search the web and return raw search results.

**Parameters:**
- `q` (string): Search query text
- `top_k` (number, optional): Number of results to return (1-20, default: 10)
- `time_range` (string, optional): Time range (any/day/week/month/year, default: any)
- `site` (string, optional): Restrict search to specific site
- `lang` (string, optional): Search language (default: en)
- `region` (string, optional): Search region (default: US)
- `safe_mode` (boolean, optional): Safe search mode (default: true)
- `include_snippets` (boolean, optional): Include snippet fragments (default: true)

**Example:**
```json
{
  "q": "latest developments in artificial intelligence",
  "top_k": 5,
  "time_range": "month",
  "lang": "en",
  "region": "US"
}
```

### advanced_web_search tool

Advanced web search with additional options.

**Parameters:**
- `q` (string): Search query text
- `top_k` (number, optional): Number of results to return (1-20, default: 10)
- `time_range` (string, optional): Time range (any/day/week/month/year, default: any)
- `site` (string, optional): Restrict search to specific site
- `lang` (string, optional): Search language (default: en)
- `region` (string, optional): Search region (default: US)
- `safe_mode` (boolean, optional): Safe search mode (default: true)
- `include_snippets` (boolean, optional): Include snippet fragments (default: true)
- `operators` (array, optional): Search operators (OR/AND)
- `exclude_sites` (array, optional): List of sites to exclude
- `from` (string, optional): Start date (YYYY-MM-DD)
- `to` (string, optional): End date (YYYY-MM-DD)
- `dedupe` (string, optional): Deduplication strategy (none/domain/title, default: none)
- `aggregate` (boolean, optional): Aggregate similar results
- `engine` (string, optional): Search engine (raw_search/sonar_answer)
- `sonar_model` (string, optional): Sonar model (sonar/sonar-pro/sonar-reasoning/sonar-reasoning-pro/sonar-deep-research)

**Example:**
```json
{
  "q": "research papers on machine learning",
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

## License

ISC

## Contributing

Issues and Pull Requests are welcome!

