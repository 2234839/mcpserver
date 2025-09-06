# Gusheng MCP Toolbox

[中文说明](README.md) | English README

A Model Context Protocol (MCP) based image analysis tool that uses Zhipu GLM-4.5V model for image recognition and analysis.

## Features

- 🖼️ Support for multiple image formats (PNG, JPG, JPEG, GIF)
- 🤖 Integrated with Zhipu GLM-4.5V model for image analysis
- 🔧 Flexible environment variable configuration with multi-level lookup
- 🚀 Lightweight, easy to integrate and deploy

## Installation

```bash
pnpm install
```

## Configuration

### API Key Setup

This project supports multiple ways to set GLM API Key, in priority order:

1. **System Environment Variables** (Recommended)
   ```bash
   export GLM_API_KEY=your_api_key_here
   ```

2. **.env file in execution directory**
   Create `.env` file in the directory where you run the command:
   ```
   GLM_API_KEY=your_api_key_here
   ```

3. **.env file in project directory**
   Create `.env` file in the project root directory

### Getting API Key

Please visit [Zhipu AI Open Platform](https://open.bigmodel.cn/) to get your API Key.

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

## License

ISC

## Contributing

Issues and Pull Requests are welcome!

