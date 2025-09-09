"""Command Line Interface for ToolVault packager."""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Any

try:
    from .discovery import discover_tools, generate_index_json
    from .server import create_app
    from .packager import output_tool_details
except ImportError:
    # Handle case when running as script
    from discovery import discover_tools, generate_index_json
    from server import create_app
    from packager import output_tool_details


def list_tools_command(tools_path: str):
    """List all available tools and their metadata."""
    try:
        tools = discover_tools(tools_path)
        index_data = generate_index_json(tools)
        
        print("Available Tools:")
        print("=" * 50)
        
        for tool_info in index_data["tools"]:
            print(f"\nTool: {tool_info['name']}")
            print(f"Description: {tool_info['description']}")
            print("Parameters:")
            
            if tool_info['inputSchema']['properties']:
                for param_name, param_info in tool_info['inputSchema']['properties'].items():
                    param_type = param_info.get('type', 'unknown')
                    param_desc = param_info.get('description', 'No description')
                    print(f"  - {param_name} ({param_type}): {param_desc}")
            else:
                print("  No parameters")
        
        print(f"\nTotal tools: {len(index_data['tools'])}")
        
    except Exception as e:
        print(f"Error listing tools: {e}", file=sys.stderr)
        sys.exit(1)


def call_tool_command(tools_path: str, tool_name: str, arguments: Dict[str, Any]):
    """Call a specific tool with provided arguments."""
    try:
        tools = discover_tools(tools_path)
        tools_by_name = {tool.name: tool for tool in tools}
        
        if tool_name not in tools_by_name:
            print(f"Error: Tool '{tool_name}' not found", file=sys.stderr)
            print("Available tools:", ", ".join(tools_by_name.keys()))
            sys.exit(1)
        
        tool = tools_by_name[tool_name]
        
        # Execute the tool
        result = tool.function(**arguments)
        
        # Print result as JSON
        output = {
            "result": result,
            "isError": False
        }
        print(json.dumps(output, indent=2, default=str))
        
    except TypeError as e:
        print(f"Error: Invalid arguments for tool '{tool_name}': {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error executing tool '{tool_name}': {e}", file=sys.stderr)
        sys.exit(1)


def serve_command(tools_path: str, port: int = 8000, host: str = "127.0.0.1"):
    """Start the ToolVault server."""
    try:
        import uvicorn
    except ImportError:
        print("Error: uvicorn is required to run the server. Install with: pip install uvicorn", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Validate tools before starting server
        tools = discover_tools(tools_path)
        print(f"Discovered {len(tools)} tools")
        
        # Create the app
        app = create_app(tools_path)
        
        print(f"Server starting on http://{host}:{port}")
        print(f"Web interface: http://{host}:{port}/ui/")
        print(f"MCP API: http://{host}:{port}/tools/list")
        print(f"Tools directory: {tools_path}")
        print(f"Additional endpoints:")
        print(f"  - POST http://{host}:{port}/tools/call")
        print(f"  - GET  http://{host}:{port}/health")
        
        # Start the server
        uvicorn.run(app, host=host, port=port)
        
    except Exception as e:
        print(f"Error starting server: {e}", file=sys.stderr)
        sys.exit(1)




def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="ToolVault - Tool discovery and packaging system",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python toolvault.pyz list-tools              # List all available tools
  python toolvault.pyz call-tool <tool> <args> # Execute a specific tool
  python toolvault.pyz serve --port 8000       # Start MCP-compatible server
  python toolvault.pyz show-details            # Show detailed tool info with source code and git history
        """
    )
    
    # Global arguments
    parser.add_argument(
        "--tools-path",
        default="tools",
        help="Path to tools directory (default: bundled tools for .pyz packages)"
    )
    
    # Subcommands
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # List tools command
    list_parser = subparsers.add_parser("list-tools", help="List all available tools")
    
    # Call tool command
    call_parser = subparsers.add_parser("call-tool", help="Call a specific tool")
    call_parser.add_argument("tool_name", help="Name of the tool to call (use list-tools to see available tools)")
    call_parser.add_argument("arguments", help="Tool arguments as JSON string (e.g., '{\"text\": \"hello world\"}')")
    
    # Serve command
    serve_parser = subparsers.add_parser("serve", help="Start the ToolVault server")
    serve_parser.add_argument("--port", type=int, default=8000, help="Server port (default: 8000)")
    serve_parser.add_argument("--host", default="127.0.0.1", help="Server host (default: 127.0.0.1)")
    
    # Show details command
    details_parser = subparsers.add_parser("show-details", help="Show detailed tool information including source code and git history")
    
    
    # Parse arguments
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Resolve tools path (handle special bundled case)
    if args.tools_path == "__bundled__":
        tools_path_str = "__bundled__"
    else:
        tools_path = Path(args.tools_path).resolve()
        if not tools_path.exists():
            print(f"Error: Tools directory does not exist: {tools_path}", file=sys.stderr)
            sys.exit(1)
        tools_path_str = str(tools_path)
    
    # Execute command
    if args.command == "list-tools":
        list_tools_command(tools_path_str)
    elif args.command == "call-tool":
        try:
            arguments = json.loads(args.arguments)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON arguments: {e}", file=sys.stderr)
            sys.exit(1)
        call_tool_command(tools_path_str, args.tool_name, arguments)
    elif args.command == "serve":
        serve_command(tools_path_str, args.port, args.host)
    elif args.command == "show-details":
        output_tool_details(tools_path_str)


if __name__ == "__main__":
    main()