# Configuration

## Prerequisites

- [Node.js](https://nodejs.org/) 22 or later
- An MCP-compatible client (Claude Desktop, Claude Code, etc.)

## Setup

### Claude Desktop

Add to your `claude_desktop_config.json`:

<details>
<summary>macOS: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></summary>

```json
{
  "mcpServers": {
    "cnb": {
      "command": "npx",
      "args": ["-y", "cnb-mcp"]
    }
  }
}
```

</details>

<details>
<summary>Windows: <code>%APPDATA%\Claude\claude_desktop_config.json</code></summary>

```json
{
  "mcpServers": {
    "cnb": {
      "command": "npx",
      "args": ["-y", "cnb-mcp"]
    }
  }
}
```

</details>

### Claude Code

```bash
claude mcp add cnb -- npx -y cnb-mcp
```

### Other MCP Clients

Any MCP-compatible client can use this server via stdio transport:

```bash
npx -y cnb-mcp
```

The server communicates over stdin/stdout using the [Model Context Protocol](https://modelcontextprotocol.io/).

## Manual Installation (from source)

If you prefer to run from a local clone instead of npx:

```bash
git clone https://github.com/AAnkacHH/cnb-mcp.git
cd cnb-mcp
npm install
npm run build
```

Then use `node` instead of `npx` in your configuration:

```json
{
  "mcpServers": {
    "cnb": {
      "command": "node",
      "args": ["/absolute/path/to/cnb-mcp/dist/index.js"]
    }
  }
}
```

## Verification

After configuration, verify the server is running by asking your assistant:

> "What is today's EUR/CZK exchange rate?"

If the server is connected correctly, it will use the `cnb_exchange_rates_daily` tool to fetch the rate.

## Resource & Prompt

In addition to tools, the server exposes:

### Resource: `cnb://info`

Static resource with CNB API metadata — update schedule, supported currencies, timezone, and authentication details. Access it by asking your assistant to read the `cnb://info` resource.

### Prompt: `analyze-currency-trend`

A guided prompt that instructs the assistant to analyze a currency's trend against CZK.

| Parameter  | Type     | Required | Default | Description                            |
|------------|----------|----------|---------|----------------------------------------|
| `currency` | `string` | **Yes**  | —       | ISO 4217 currency code (e.g. EUR, USD) |
| `period`   | `string` | No       | `month` | `month`, `quarter`, or `year`          |

The assistant will fetch data, calculate key metrics (opening/closing rate, high, low, % change), and provide trend analysis.
