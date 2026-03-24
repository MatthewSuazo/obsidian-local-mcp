# obsidian-local-mcp

A local [MCP](https://modelcontextprotocol.io) server that wraps the [Obsidian CLI](https://help.obsidian.md/cli), giving AI assistants like Claude direct access to your Obsidian vault.

## Requirements

- **Obsidian** desktop app installed (v1.8+ with CLI support)
- **Node.js** 18+
- macOS, Windows, or Linux

## Setup

```bash
git clone https://github.com/MatthewSuazo/obsidian-local-mcp.git
cd obsidian-local-mcp
npm install
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "obsidian-cli": {
      "command": "node",
      "args": ["/path/to/obsidian-local-mcp/server.js"],
      "env": {
        "OBSIDIAN_VAULT": "Your Vault Name"
      }
    }
  }
}
```

Set `OBSIDIAN_VAULT` to the name of the vault you want to target. Set `OBSIDIAN_CLI_PATH` to override the Obsidian binary location if it's not in the default path for your OS.

## Tools

| Tool | Description |
|------|-------------|
| `read` | Read note contents by name or path |
| `append` | Append content to a note |
| `prepend` | Prepend content to a note |
| `create` | Create a new note (with optional template) |
| `move` | Move or rename a file |
| `delete` | Delete a file (trash or permanent) |
| `search` | Search vault text with line context |
| `property_set` | Set a frontmatter property |
| `property_read` | Read a frontmatter property |
| `daily_read` | Read today's daily note |
| `daily_append` | Append to today's daily note |
| `replace` | Find and replace text in a note (exact, regex, replace-all) |

## License

MIT
