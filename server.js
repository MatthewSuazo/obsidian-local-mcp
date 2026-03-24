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
const DEFAULT_VAULT = process.env.OBSIDIAN_VAULT || "Matt's";

async function runObsidian(args) {
  const fullArgs = [`vault=${DEFAULT_VAULT}`, ...args];
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

// --- start ---
const transport = new StdioServerTransport();
await server.connect(transport);
