"""Packaging system for creating ToolVault .pyz deployables."""

import sys
import shutil
import json
import zipapp
import tempfile
from pathlib import Path
from typing import Dict, Any, List

try:
    from .discovery import discover_tools, generate_index_json
except ImportError:
    # Handle case when running as script
    from discovery import discover_tools, generate_index_json


class PackagerError(Exception):
    """Raised when packaging encounters an error."""
    pass


def create_main_module() -> str:
    """Create the __main__.py content for the .pyz package."""
    return '''#!/usr/bin/env python3
"""ToolVault packaged application entry point."""

import sys
import os
from pathlib import Path

# Get the .pyz file path from sys.argv[0] (more reliable than __file__ in zipapps)
pyz_path = sys.argv[0]

# Add the .pyz to Python path so we can import modules from it
sys.path.insert(0, pyz_path)

# Import CLI after path setup
from cli import main

if __name__ == "__main__":
    # Always use bundled tools for .pyz execution
    # Only add --tools-path if not already provided by user
    tools_path_provided = any(arg.startswith("--tools-path") for arg in sys.argv[1:])
    
    if not tools_path_provided:
        # Use special bundled tools path that the discovery system will recognize
        sys.argv.insert(1, "--tools-path=__bundled__")
    
    main()
'''


def create_requirements_content() -> str:
    """Create requirements.txt content for the package."""
    return """fastapi>=0.104.0
uvicorn>=0.24.0
pydantic>=2.0.0
"""


def package_toolvault(
    tools_path: str,
    output_path: str = "toolvault.pyz",
    python_executable: str = "/usr/bin/env python3"
) -> str:
    """
    Package ToolVault into a self-contained .pyz file.
    
    Args:
        tools_path: Path to the tools directory
        output_path: Path for the output .pyz file
        python_executable: Python executable to use in shebang
        
    Returns:
        Path to the created .pyz file
        
    Raises:
        PackagerError: If packaging fails
    """
    tools_path = Path(tools_path).resolve()
    output_path = Path(output_path).resolve()
    
    if not tools_path.exists():
        raise PackagerError(f"Tools directory does not exist: {tools_path}")
    
    try:
        # Discover and validate tools first
        tools = discover_tools(str(tools_path))
        index_data = generate_index_json(tools)
        print(f"Discovered {len(tools)} tools for packaging")
        
    except Exception as e:
        raise PackagerError(f"Tool discovery failed: {e}")
    
    # Create temporary directory for packaging
    with tempfile.TemporaryDirectory() as temp_dir:
        package_dir = Path(temp_dir) / "package"
        package_dir.mkdir()
        
        try:
            # Copy the main packager modules
            source_dir = Path(__file__).parent
            
            # Core modules to include
            core_modules = [
                "__init__.py",
                "discovery.py",
                "server.py",
                "cli.py",
                "packager.py"
            ]
            
            for module in core_modules:
                source_file = source_dir / module
                if source_file.exists():
                    shutil.copy2(source_file, package_dir / module)
                else:
                    print(f"Warning: Core module not found: {module}")
            
            # Copy tools directory with new structure
            tools_dest = package_dir / "tools"
            shutil.copytree(tools_path, tools_dest)
            
            # Generate and save index.json
            index_path = package_dir / "index.json"
            with open(index_path, 'w') as f:
                json.dump(index_data, f, indent=2)
            
            # Create __main__.py entry point
            main_path = package_dir / "__main__.py"
            with open(main_path, 'w') as f:
                f.write(create_main_module())
            
            # Create requirements.txt for documentation
            req_path = package_dir / "requirements.txt"
            with open(req_path, 'w') as f:
                f.write(create_requirements_content())
            
            # Create debug folder to preserve pre-zip contents for debugging
            debug_dir = Path("debug-package-contents")
            if debug_dir.exists():
                shutil.rmtree(debug_dir)
            shutil.copytree(package_dir, debug_dir)
            
            # Save detailed tool metadata to metadata folder
            for tool in tools:
                tool_metadata_dir = debug_dir / "tools" / Path(tool.tool_dir).name / "metadata"
                tool_metadata_dir.mkdir(exist_ok=True)
                
                # Save git history
                if tool.git_history:
                    git_history_file = tool_metadata_dir / "git_history.json"
                    with open(git_history_file, 'w') as f:
                        json.dump(tool.git_history, f, indent=2)
                
                # Save source code as HTML
                if tool.source_code:
                    source_file = tool_metadata_dir / "source_code.html"
                    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{tool.name} - Source Code</title>
    <style>
        body {{ 
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace; 
            margin: 20px; 
            background-color: #f8f9fa;
            line-height: 1.4;
        }}
        .container {{ 
            background-color: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{ 
            border-bottom: 2px solid #e9ecef; 
            padding-bottom: 10px; 
            margin-bottom: 20px; 
        }}
        .tool-name {{ 
            font-size: 24px; 
            font-weight: bold; 
            color: #333; 
        }}
        .source-code {{ 
            background-color: #f8f9fa; 
            border: 1px solid #e9ecef; 
            border-radius: 4px; 
            padding: 15px; 
            white-space: pre-wrap; 
            font-size: 14px;
            overflow-x: auto;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="tool-name">{tool.name}</div>
        </div>
        <div class="source-code">{tool.source_code}</div>
    </div>
</body>
</html>"""
                    with open(source_file, 'w') as f:
                        f.write(html_content)
                
                
                # Create tool-specific tool.json for SPA navigation
                tool_index = {
                    "tool_name": tool.name,
                    "description": tool.description,
                    "files": {
                        "execute": {
                            "path": "execute.py",
                            "description": "Main tool implementation",
                            "type": "python"
                        },
                        "source_code": {
                            "path": "metadata/source_code.html",
                            "description": "Pretty-printed source code",
                            "type": "html"
                        },
                        "git_history": {
                            "path": "metadata/git_history.json",
                            "description": "Git commit history",
                            "type": "json"
                        },
                        "inputs": []
                    },
                    "stats": {
                        "sample_inputs_count": len(tool.sample_inputs),
                        "git_commits_count": len(tool.git_history),
                        "source_code_length": len(tool.source_code) if tool.source_code else 0
                    }
                }
                
                # Add sample input files to index
                for sample_input in tool.sample_inputs:
                    tool_index["files"]["inputs"].append({
                        "name": sample_input["name"],
                        "path": f"inputs/{sample_input['file']}",
                        "description": f"Sample input: {sample_input['name']}",
                        "type": "json"
                    })
                
                # Save tool index in the tool's root directory as tool.json
                tool_dir_path = debug_dir / "tools" / Path(tool.tool_dir).name
                tool_index_file = tool_dir_path / "tool.json"
                with open(tool_index_file, 'w') as f:
                    json.dump(tool_index, f, indent=2)
            
            print(f"Debug: Package contents preserved in {debug_dir}")
            print(f"Debug: Tool metadata saved in metadata/ subdirectories")
            
            # Create the .pyz package
            print(f"Creating .pyz package: {output_path}")
            zipapp.create_archive(
                source=str(package_dir),
                target=str(output_path),
                interpreter=python_executable,
                compressed=True
            )
            
            # Make executable
            output_path.chmod(0o755)
            
            print(f"Successfully created ToolVault package: {output_path}")
            print(f"Package size: {output_path.stat().st_size / 1024:.1f} KB")
            print(f"Tools included: {len(tools)}")
            
            # Verify the package
            if not output_path.exists():
                raise PackagerError("Package creation failed - output file not found")
            
            return str(output_path)
            
        except Exception as e:
            raise PackagerError(f"Failed to create package: {e}")


def output_tool_details(tools_path: str) -> None:
    """Output detailed information about tools including source code and git history."""
    try:
        tools = discover_tools(tools_path)
        
        print(f"Found {len(tools)} tools in {tools_path}")
        print("=" * 80)
        
        for tool in tools:
            print(f"\nTool: {tool.name}")
            print(f"Description: {tool.description}")
            print(f"Module Path: {tool.module_path}")
            print(f"Parameters: {list(tool.parameters.keys())}")
            print(f"Return Type: {tool.return_type}")
            print(f"Sample Inputs: {len(tool.sample_inputs)} files")
            
            if tool.git_history:
                print(f"\nGit History ({len(tool.git_history)} commits):")
                for i, commit in enumerate(tool.git_history[:5]):  # Show first 5 commits
                    print(f"  {i+1}. {commit['hash'][:8]} - {commit['message']} ({commit['date'][:10]})")
                if len(tool.git_history) > 5:
                    print(f"  ... and {len(tool.git_history) - 5} more commits")
            
            if tool.source_code:
                print(f"\nSource Code ({len(tool.source_code)} characters):")
                print("-" * 40)
                # Show first 10 lines of source code
                lines = tool.source_code.split('\n')
                for i, line in enumerate(lines[:10]):
                    print(f"{i+1:3d}: {line}")
                if len(lines) > 10:
                    print(f"    ... and {len(lines) - 10} more lines")
                print("-" * 40)
            
            print("=" * 80)
            
    except Exception as e:
        print(f"Error analyzing tools: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """CLI entry point for the packager."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Package ToolVault into a deployable .pyz file"
    )
    parser.add_argument(
        "tools_path",
        help="Path to tools directory"
    )
    parser.add_argument(
        "--output", "-o",
        default="toolvault.pyz",
        help="Output path for .pyz file (default: toolvault.pyz)"
    )
    parser.add_argument(
        "--python",
        default="/usr/bin/env python3",
        help="Python executable for shebang (default: /usr/bin/env python3)"
    )
    parser.add_argument(
        "--show-details",
        action="store_true",
        help="Show detailed tool information including source code and git history (no packaging)"
    )
    
    args = parser.parse_args()
    
    # If show-details is requested, output details and exit
    if args.show_details:
        output_tool_details(args.tools_path)
        return
    
    try:
        package_toolvault(
            tools_path=args.tools_path,
            output_path=args.output,
            python_executable=args.python
        )
    except PackagerError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()