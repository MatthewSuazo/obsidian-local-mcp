#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const OBSIDIAN_CLI =
  process.env.OBSIDIAN_CLI_PATH ||
  (process.platform === "win32"
    ? `${process.env.LOCALAPPDATA}\\Obsidian\\Obsidian.exe`
    : process.platform === "darwin"
      ? "/Applications/Obsidian.app/Contents/MacOS/obsidian"
      : "obsidian");
const DEFAULT_VAULT = process.env.OBSIDIAN_VAULT;

async function runObsidian(args) {
  const fullArgs = DEFAULT_VAULT ? [`vault=${DEFAULT_VAULT}`, ...args] : args;
  try {
    const { stdout, stderr } = await execFileAsync(OBSIDIAN_CLI, fullArgs, {
      timeout: 15000,
    });
    const output = stdout.trim();
    if (stderr.trim()) {
      return output ? `${output}\n[stderr]: ${stderr.trim()}` : stderr.trim();
    }
    return output || "(no output)";
  } catch (err) {
    throw new Error(err.stderr?.trim() || err.message);
  }
}

const server = new McpServer({
  name: "obsidian-local",
  version: "1.0.0",
});

// --- read ---
server.tool(
  "read",
  "Read the contents of a note in the Obsidian vault",
  {
    file: z.string().optional().describe("File name (wikilink-style resolution)"),
    path: z.string().optional().describe("Exact file path (e.g. folder/note.md)"),
  },
  async ({ file, path }) => {
    const args = ["read"];
    if (file) args.push(`file=${file}`);
    if (path) args.push(`path=${path}`);
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- append ---
server.tool(
  "append",
  "Append content to the end of a note",
  {
    content: z.string().describe("Content to append"),
    file: z.string().optional().describe("File name"),
    path: z.string().optional().describe("Exact file path"),
    inline: z.boolean().optional().describe("Append without newline"),
  },
  async ({ content, file, path, inline }) => {
    const args = ["append", `content=${content}`];
    if (file) args.push(`file=${file}`);
    if (path) args.push(`path=${path}`);
    if (inline) args.push("inline");
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- prepend ---
server.tool(
  "prepend",
  "Prepend content to the beginning of a note",
  {
    content: z.string().describe("Content to prepend"),
    file: z.string().optional().describe("File name"),
    path: z.string().optional().describe("Exact file path"),
    inline: z.boolean().optional().describe("Prepend without newline"),
  },
  async ({ content, file, path, inline }) => {
    const args = ["prepend", `content=${content}`];
    if (file) args.push(`file=${file}`);
    if (path) args.push(`path=${path}`);
    if (inline) args.push("inline");
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- create ---
server.tool(
  "create",
  "Create a new note in the vault",
  {
    name: z.string().optional().describe("File name"),
    path: z.string().optional().describe("Full file path"),
    content: z.string().optional().describe("Initial content"),
    template: z.string().optional().describe("Template to use"),
    overwrite: z.boolean().optional().describe("Overwrite if file exists"),
  },
  async ({ name, path, content, template, overwrite }) => {
    const args = ["create"];
    if (name) args.push(`name=${name}`);
    if (path) args.push(`path=${path}`);
    if (content) args.push(`content=${content}`);
    if (template) args.push(`template=${template}`);
    if (overwrite) args.push("overwrite");
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- move ---
server.tool(
  "move",
  "Move or rename a file in the vault",
  {
    to: z.string().describe("Destination folder or path"),
    file: z.string().optional().describe("File name"),
    path: z.string().optional().describe("Exact file path"),
  },
  async ({ to, file, path }) => {
    const args = ["move", `to=${to}`];
    if (file) args.push(`file=${file}`);
    if (path) args.push(`path=${path}`);
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- delete ---
server.tool(
  "delete",
  "Delete a file from the vault (moves to trash by default)",
  {
    file: z.string().optional().describe("File name"),
    path: z.string().optional().describe("Exact file path"),
    permanent: z.boolean().optional().describe("Skip trash, delete permanently"),
  },
  async ({ file, path, permanent }) => {
    const args = ["delete"];
    if (file) args.push(`file=${file}`);
    if (path) args.push(`path=${path}`);
    if (permanent) args.push("permanent");
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- search ---
server.tool(
  "search",
  "Search the vault for text, returns matching files with context",
  {
    query: z.string().describe("Search query text"),
    path: z.string().optional().describe("Limit search to folder"),
    limit: z.number().optional().describe("Max number of files to return"),
    case_sensitive: z.boolean().optional().describe("Case-sensitive search"),
  },
  async ({ query, path, limit, case_sensitive }) => {
    const args = ["search:context", `query=${query}`, "format=json"];
    if (path) args.push(`path=${path}`);
    if (limit) args.push(`limit=${limit}`);
    if (case_sensitive) args.push("case");
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- property:set ---
server.tool(
  "property_set",
  "Set a frontmatter property on a note",
  {
    name: z.string().describe("Property name"),
    value: z.string().describe("Property value"),
    type: z
      .enum(["text", "list", "number", "checkbox", "date", "datetime"])
      .optional()
      .describe("Property type"),
    file: z.string().optional().describe("File name"),
    path: z.string().optional().describe("Exact file path"),
  },
  async ({ name, value, type, file, path }) => {
    const args = ["property:set", `name=${name}`, `value=${value}`];
    if (type) args.push(`type=${type}`);
    if (file) args.push(`file=${file}`);
    if (path) args.push(`path=${path}`);
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- property:read ---
server.tool(
  "property_read",
  "Read a frontmatter property value from a note",
  {
    name: z.string().describe("Property name"),
    file: z.string().optional().describe("File name"),
    path: z.string().optional().describe("Exact file path"),
  },
  async ({ name, file, path }) => {
    const args = ["property:read", `name=${name}`];
    if (file) args.push(`file=${file}`);
    if (path) args.push(`path=${path}`);
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- daily:read ---
server.tool(
  "daily_read",
  "Read today's daily note contents",
  {},
  async () => {
    const result = await runObsidian(["daily:read"]);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- daily:append ---
server.tool(
  "daily_append",
  "Append content to today's daily note",
  {
    content: z.string().describe("Content to append"),
    inline: z.boolean().optional().describe("Append without newline"),
  },
  async ({ content, inline }) => {
    const args = ["daily:append", `content=${content}`];
    if (inline) args.push("inline");
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- replace ---
server.tool(
  "replace",
  "Find and replace text inside an Obsidian note using eval with app.vault.read/modify",
  {
    search: z.string().describe("Text or regex pattern to find"),
    replace: z.string().describe("Replacement text"),
    file: z.string().optional().describe("File name (wikilink-style resolution)"),
    path: z.string().optional().describe("Exact file path (e.g. folder/note.md)"),
    regex: z.boolean().optional().describe("Treat search as a regex pattern"),
    replace_all: z.boolean().optional().describe("Replace all occurrences (default: first only)"),
  },
  async ({ search, replace, file, path, regex, replace_all }) => {
    const fileRef = file
      ? `app.metadataCache.getFirstLinkpathDest("${file.replace(/"/g, '\\"')}", "")`
      : path
        ? `app.vault.getAbstractFileByPath("${path.replace(/"/g, '\\"')}")`
        : null;
    if (!fileRef) {
      throw new Error("Either file or path must be provided");
    }

    const escapeForJS = (s) =>
      s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
    const escapedSearch = escapeForJS(search);
    const escapedReplace = escapeForJS(replace);

    let replaceExpr;
    if (regex) {
      const flags = replace_all ? "g" : "";
      replaceExpr = `content.replace(new RegExp("${escapedSearch}", "${flags}"), "${escapedReplace}")`;
    } else if (replace_all) {
      replaceExpr = `content.replaceAll("${escapedSearch}", "${escapedReplace}")`;
    } else {
      replaceExpr = `content.replace("${escapedSearch}", "${escapedReplace}")`;
    }

    const code = `(async () => { const f = ${fileRef}; if (!f) throw new Error("File not found"); const content = await app.vault.read(f); const updated = ${replaceExpr}; if (content === updated) return "No matches found"; await app.vault.modify(f, updated); return "Replaced successfully"; })()`;

    const result = await runObsidian(["eval", `code=${code}`]);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- search_context ---
server.tool(
  "search_context",
  "Context-aware search that returns surrounding content, not just matching lines",
  {
    query: z.string().describe("Search query text"),
    limit: z.number().optional().default(5).describe("Max results to return (default 5)"),
    path: z.string().optional().describe("Limit search to folder"),
  },
  async ({ query, limit, path }) => {
    const args = ["search:context", `query=${query}`];
    if (limit) args.push(`limit=${limit}`);
    if (path) args.push(`path=${path}`);
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- files ---
server.tool(
  "files",
  "List files in the vault or a specific folder",
  {
    folder: z.string().optional().describe("Folder to list"),
    ext: z.string().optional().describe("Filter by extension (e.g. 'md')"),
    total: z.boolean().optional().describe("Return count only"),
  },
  async ({ folder, ext, total }) => {
    const args = ["files"];
    if (folder) args.push(`folder=${folder}`);
    if (ext) args.push(`ext=${ext}`);
    if (total) args.push("total");
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- folders ---
server.tool(
  "folders",
  "List folders in the vault",
  {
    folder: z.string().optional().describe("Filter by parent folder"),
    total: z.boolean().optional().describe("Return count only"),
  },
  async ({ folder, total }) => {
    const args = ["folders"];
    if (folder) args.push(`folder=${folder}`);
    if (total) args.push("total");
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- open ---
server.tool(
  "open",
  "Open a file in the Obsidian UI",
  {
    file: z.string().optional().describe("File name (wikilink-style resolution)"),
    path: z.string().optional().describe("Exact file path"),
    newtab: z.boolean().optional().describe("Open in a new tab"),
  },
  async ({ file, path, newtab }) => {
    const args = ["open"];
    if (file) args.push(`file=${file}`);
    if (path) args.push(`path=${path}`);
    if (newtab) args.push("newtab");
    const result = await runObsidian(args);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- eval ---
server.tool(
  "eval",
  "Execute JavaScript inside the Obsidian runtime (Dataview queries, Templater, vault API)",
  {
    code: z.string().describe("JavaScript code to execute"),
  },
  async ({ code }) => {
    const result = await runObsidian(["eval", `code=${code}`]);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- command ---
server.tool(
  "command",
  "Execute any registered Obsidian command by ID (Templater, community plugins, etc.)",
  {
    id: z.string().describe("Command ID to execute"),
  },
  async ({ id }) => {
    const result = await runObsidian(["command", `id=${id}`]);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- insert_after ---
server.tool(
  "insert_after",
  "Insert content after a matched string in a note without replacing it",
  {
    file: z.string().optional().describe("File name (wikilink-style resolution)"),
    path: z.string().optional().describe("Exact file path (e.g. folder/note.md)"),
    after: z.string().describe("Text to match — content will be inserted after this"),
    content: z.string().describe("Content to insert after the match"),
  },
  async ({ file, path, after, content }) => {
    const fileRef = file
      ? `app.metadataCache.getFirstLinkpathDest("${file.replace(/"/g, '\\"')}", "")`
      : path
        ? `app.vault.getAbstractFileByPath("${path.replace(/"/g, '\\"')}")`
        : null;
    if (!fileRef) {
      throw new Error("Either file or path must be provided");
    }

    const escapeForJS = (s) =>
      s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
    const escapedAfter = escapeForJS(after);
    const escapedContent = escapeForJS(content);

    const code = `(async () => { const f = ${fileRef}; if (!f) throw new Error("File not found"); const body = await app.vault.read(f); const idx = body.indexOf("${escapedAfter}"); if (idx === -1) return "No match found for the specified text"; const insertPos = idx + "${escapedAfter}".length; const updated = body.slice(0, insertPos) + "${escapedContent}" + body.slice(insertPos); await app.vault.modify(f, updated); return "Inserted successfully"; })()`;

    const result = await runObsidian(["eval", `code=${code}`]);
    return { content: [{ type: "text", text: result }] };
  }
);

// --- start ---
const transport = new StdioServerTransport();
await server.connect(transport);
