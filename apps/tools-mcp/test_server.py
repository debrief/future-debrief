#!/usr/bin/env python3
"""Simple script to test the MCP server."""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from tools_mcp.server import mcp


async def main():
    """Test the MCP server by listing tools."""
    print("Testing MCP Server...")
    print(f"\nServer name: {mcp.name}")

    # Get list of registered tools
    tools = mcp._tool_manager._tools
    print(f"\nRegistered {len(tools)} tools:")
    for tool_name in tools.keys():
        print(f"  - {tool_name}")

    # Test calling a simple tool
    print("\n\nTesting word_count tool...")
    try:
        # Get the tool
        word_count_tool = tools.get("text_word_count")
        if word_count_tool:
            print(f"Found tool: {word_count_tool.name}")
            print(f"Description: {word_count_tool.description}")

            # Test execution
            from tools_mcp.tools.text.word_count.execute import WordCountParameters
            test_params = WordCountParameters(text="Hello world test")
            result = word_count_tool.fn(test_params)
            print(f"Test result: {result}")
        else:
            print("word_count tool not found")
    except Exception as e:
        print(f"Error testing tool: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
