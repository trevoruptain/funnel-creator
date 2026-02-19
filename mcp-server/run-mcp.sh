#!/bin/bash
# Force Node 20 for MCP server (undici/ReadableStream requires Node 18+)
export PATH="/Users/trevoruptain/.nvm/versions/node/v20.17.0/bin:$PATH"
cd /Users/trevoruptain/funnel-creator
exec npx tsx mcp-server/index.ts
