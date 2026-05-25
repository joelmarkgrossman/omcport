// src/mcp-server.mjs
// MCP stdio server exposing omcport to Cursor / any MCP-capable agent.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { detect } from '../lib/detect.mjs';
import { claim, release } from '../lib/claim.mjs';

export function createServer() {
  const server = new McpServer({ name: 'omcport', version: '0.1.0' });

  server.registerTool(
    'omcport_here',
    {
      description: 'Return the omcport port assignments for the project at the given working directory.',
      inputSchema: { cwd: z.string() },
    },
    async ({ cwd }) => {
      const r = await detect(cwd);
      if (!r) {
        return {
          isError: true,
          content: [{ type: 'text', text: `no omcport project at ${cwd}` }],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              project: r.project,
              base: r.base,
              bucket: r.bucket,
              ports: r.ports,
            }),
          },
        ],
      };
    }
  );

  server.registerTool(
    'omcport_claim',
    {
      description: 'Claim a named port slot in the worktree at CWD. Returns the assigned port.',
      inputSchema: { cwd: z.string(), slot: z.string() },
    },
    async ({ cwd, slot }) => {
      try {
        const result = await claim({ cwd, slot, pid: null, label: null });
        return {
          content: [{ type: 'text', text: JSON.stringify({ port: result.port, slot }) }],
        };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: e.message }] };
      }
    }
  );

  server.registerTool(
    'omcport_release',
    {
      description: 'Release a previously claimed port slot in the worktree at CWD.',
      inputSchema: { cwd: z.string(), slot: z.string() },
    },
    async ({ cwd, slot }) => {
      try {
        await release({ cwd, slot });
        return { content: [{ type: 'text', text: JSON.stringify({ ok: true }) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: e.message }] };
      }
    }
  );

  return server;
}

export async function startStdioServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
