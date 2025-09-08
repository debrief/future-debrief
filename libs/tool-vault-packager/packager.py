"""Packaging system for creating ToolVault .pyz deployables."""

import os
import shutil
import json
import zipapp
import tempfile
from pathlib import Path
from typing import Dict, Any, List

from .discovery import discover_tools, generate_index_json


class PackagerError(Exception):
    """Raised when packaging encounters an error."""
    pass


def create_main_module(tools_path: str) -> str:
    """Create the __main__.py content for the .pyz package."""
    return f'''#!/usr/bin/env python3
"""ToolVault packaged application entry point."""

import sys
import os
from pathlib import Path

# Add the current package to Python path
package_dir = Path(__file__).parent
sys.path.insert(0, str(package_dir))

# Import CLI after path setup
from cli import main

if __name__ == "__main__":
    # Set default tools path to the packaged tools directory
    if not any(arg.startswith("--tools-path") for arg in sys.argv[1:]):
        tools_dir = package_dir / "tools"
        sys.argv.insert(1, f"--tools-path={tools_dir}")
    
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
                "cli.py"
            ]
            
            for module in core_modules:
                source_file = source_dir / module
                if source_file.exists():
                    shutil.copy2(source_file, package_dir / module)
                else:
                    print(f"Warning: Core module not found: {module}")
            
            # Copy tools directory
            tools_dest = package_dir / "tools"
            shutil.copytree(tools_path, tools_dest)
            
            # Generate and save index.json
            index_path = package_dir / "index.json"
            with open(index_path, 'w') as f:
                json.dump(index_data, f, indent=2)
            
            # Create __main__.py entry point
            main_path = package_dir / "__main__.py"
            with open(main_path, 'w') as f:
                f.write(create_main_module(str(tools_path)))
            
            # Create requirements.txt for documentation
            req_path = package_dir / "requirements.txt"
            with open(req_path, 'w') as f:
                f.write(create_requirements_content())
            
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
    
    args = parser.parse_args()
    
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