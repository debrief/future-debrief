"""Entry point for fastmcp dev command.

This file is used by 'python cli.py serve-dev' to start the Tool Vault
server with MCP Inspector web UI for debugging.

Usage:
    python cli.py serve-dev
    # or directly:
    fastmcp dev server_fastmcp_dev.py --ui-port 6274
"""
import os

from server_fastmcp_simple import SimpleToolVaultServer

# Get configuration from environment variables or use defaults
tools_path = os.environ.get("TOOLS_PATH", "tools")

# Create the server instance
# This exports the 'mcp' object that fastmcp dev needs at module level
server = SimpleToolVaultServer(tools_path)
mcp = server.mcp

# Note: fastmcp dev will automatically:
# 1. Start the MCP Inspector UI at http://127.0.0.1:6274
# 2. Start this MCP server
# 3. Connect them via a proxy
# You should NOT see a manual connection dialog - tools should appear automatically
