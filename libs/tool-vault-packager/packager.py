"""Packaging system for creating ToolVault .pyz deployables."""

import importlib.util
import json
import shutil
import sys
import zipapp
from pathlib import Path

from debrief.types.tools import (
    SampleInputReference,
    ToolFileReference,
    ToolFilesCollection,
    ToolIndexModel,
    ToolStatsModel,
    ToolVaultCommand,
)

try:
    from pygments import highlight
    from pygments.formatters import HtmlFormatter
    from pygments.lexers import PythonLexer

    PYGMENTS_AVAILABLE = True
except ImportError:
    PYGMENTS_AVAILABLE = False

try:
    from .discovery import ToolDiscoveryError, discover_tools, generate_index_json
except ImportError:
    # Handle case when running as script
    from discovery import ToolDiscoveryError, discover_tools, generate_index_json

try:
    from .testing import TestConfig, TestRunner
except ImportError:
    try:
        from testing import TestConfig, TestRunner
    except ImportError:
        # Testing module not available
        TestRunner = None
        TestConfig = None


class PackagerError(Exception):
    """Raised when packaging encounters an error."""

    pass


def generate_highlighted_source_html(tool_name: str, source_code: str) -> str:
    """Generate syntax-highlighted HTML for Python source code."""

    if PYGMENTS_AVAILABLE:
        # Use Pygments for syntax highlighting
        lexer = PythonLexer()
        formatter = HtmlFormatter(
            style="default", noclasses=True, linenos=False, cssclass="pygments-highlight"
        )
        highlighted_code = highlight(source_code, lexer, formatter)

        # Clean and wrap the highlighted content
        import re

        # Extract just the content from the <pre> tag, removing any outer divs
        pre_match = re.search(r"<pre[^>]*>(.*?)</pre>", highlighted_code, re.DOTALL)
        if pre_match:
            highlighted_content = (
                f'<pre style="margin: 0; background: transparent;">{pre_match.group(1)}</pre>'
            )
        else:
            # Fallback: wrap in <pre> with clean styling
            highlighted_content = (
                f'<pre style="margin: 0; background: transparent;">{highlighted_code}</pre>'
            )

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{tool_name} - Complete Source File</title>
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
        .code-container {{
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            font-size: 14px;
            overflow-x: auto;
            line-height: 1.5;
        }}

        /* Ensure Pygments styles don't leak to other elements */
        .code-container * {{
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="tool-name">{tool_name}</div>
        </div>
        <div class="code-container">{highlighted_content}</div>
    </div>
</body>
</html>"""
    else:
        # Fallback to plain text if Pygments is not available
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{tool_name} - Complete Source File</title>
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
            <div class="tool-name">{tool_name}</div>
        </div>
        <div class="source-code">{source_code}</div>
    </div>
</body>
</html>"""

    return html_content


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


def build_spa() -> bool:
    """
    Build the SPA for integration into the package.

    Returns:
        True if build succeeded, False otherwise
    """
    spa_dir = Path(__file__).parent / "spa"

    if not spa_dir.exists():
        print("Warning: SPA directory not found, skipping SPA build")
        return False

    try:
        import subprocess

        print("Building SPA...")

        # Check if node_modules exists, install if not
        node_modules = spa_dir / "node_modules"
        if not node_modules.exists():
            print("Installing SPA dependencies...")
            result = subprocess.run(["npm", "install"], cwd=spa_dir, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"SPA dependencies installation failed: {result.stderr}")
                return False

        # Build the SPA
        result = subprocess.run(
            ["npm", "run", "build"], cwd=spa_dir, capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"SPA build failed: {result.stderr}")
            return False

        print("SPA build completed successfully")
        return True

    except Exception as e:
        print(f"Error building SPA: {e}")
        return False


def package_toolvault(
    tools_path: str,
    output_path: str = "toolvault.pyz",
    python_executable: str = "/usr/bin/env python3",
    run_tests: bool = True,
) -> str:
    """
    Package ToolVault into a self-contained .pyz file.

    Args:
        tools_path: Path to the tools directory
        output_path: Path for the output .pyz file
        python_executable: Python executable to use in shebang
        run_tests: Whether to run tool tests before packaging

    Returns:
        Path to the created .pyz file

    Raises:
        PackagerError: If packaging fails or tests fail
    """
    tools_dir = Path(tools_path).resolve()
    output_path_path = Path(output_path).resolve()

    if not tools_dir.exists():
        raise PackagerError(f"Tools directory does not exist: {tools_dir}")

    # Validate that debrief module is available
    if importlib.util.find_spec("debrief.types.tools") is None:
        raise PackagerError(
            "\n🚫 PACKAGING ABORTED: Required 'debrief' module not found\n"
            "   Module 'debrief.types.tools' is not importable\n\n"
            "🔧 REQUIRED ACTION:\n"
            "   Install the debrief-types package before building:\n"
            "   1. From repository root: cd libs/shared-types && pip install -e .\n"
            "   2. Or install the wheel: pip install /path/to/debrief_types-*.whl\n"
            "   3. Or in Docker: pip3 install --break-system-packages /tmp/wheels/*.whl\n\n"
            "📍 The 'debrief' module provides critical type definitions used by the packager.\n"
        )

    # Build SPA first
    spa_build_success = build_spa()

    try:
        # Discover and validate tools first
        tools = discover_tools(str(tools_dir))
        index_data = generate_index_json(str(tools_dir))
        print(f"Discovered {len(tools)} tools for packaging")

    except ToolDiscoveryError as e:
        print("\n🚫 PACKAGING ABORTED: Schema incompatibility detected")
        print(f"   {e}")
        print("\n🔧 RECOMMENDED ACTIONS:")
        print("   1. Update JSONSchema/JSONSchemaProperty models to support additional fields")
        print("   2. Modify tool output schemas to only use supported JSON Schema fields")
        print("   3. Add field mappings in the schema conversion process")
        print(f"\n📍 Location: {__file__}:296 -> discovery.py")
        raise PackagerError(f"Schema validation failed: {e}")
    except Exception as e:
        print("\n🚫 PACKAGING ABORTED: Unexpected error during tool discovery")
        print(f"   {e}")
        raise PackagerError(f"Tool discovery failed: {e}")

    # Run tool tests if requested
    if run_tests:
        if TestRunner is None or TestConfig is None:
            print("⚠️ Testing framework not available - skipping tests")
        else:
            print("\n" + "=" * 50)
            print("Running tool tests before packaging...")
            print("=" * 50)

            try:
                test_config = TestConfig(
                    tools_directory=str(tools_dir),
                    report_and_continue=True,
                    fail_on_any_error=True,
                )

                test_runner = TestRunner(test_config)
                tests_passed = test_runner.run_all_tool_tests()

                if not tests_passed:
                    raise PackagerError("Tool tests failed. Packaging aborted.")

                print("✓ All tool tests passed. Proceeding with packaging...")

            except Exception as e:
                if "Tool tests failed" in str(e):
                    raise  # Re-raise the PackagerError
                else:
                    raise PackagerError(f"Testing framework error: {e}")

    # Create persistent package directory for building and inspection
    current_dir = Path(__file__).parent
    package_dir = current_dir / "tmp_package_contents"
    if package_dir.exists():
        shutil.rmtree(package_dir)
    package_dir.mkdir()

    try:
        # Copy the main packager modules
        source_dir = Path(__file__).parent

        # Core modules to include
        core_modules = ["__init__.py", "discovery.py", "server.py", "cli.py", "packager.py"]

        for module in core_modules:
            source_file = source_dir / module
            if source_file.exists():
                shutil.copy2(source_file, package_dir / module)
            else:
                print(f"Warning: Core module not found: {module}")

        # Copy testing directory if it exists
        testing_dir = source_dir / "testing"
        if testing_dir.exists():
            testing_dest = package_dir / "testing"
            shutil.copytree(testing_dir, testing_dest)
            print("Testing framework copied to package")
        else:
            print(
                "Warning: Testing directory not found - test commands may not work in packaged version"
            )

        # Note: Dependencies like debrief, pydantic, geojson-pydantic must be installed
        # in the runtime environment. They cannot be bundled in the .pyz due to
        # compiled extensions (e.g., pydantic_core._pydantic_core.so).
        # The validation check at the start of package_toolvault() ensures debrief
        # is available at build time.

        # Copy tools directory with new structure
        tools_dest = package_dir / "tools"
        shutil.copytree(tools_dir, tools_dest)

        # Note: Sample data is now included in each tool's samples/ folder

        # Copy SPA assets if build was successful
        if spa_build_success:
            spa_dist_dir = Path(__file__).parent / "spa" / "dist"
            if spa_dist_dir.exists():
                spa_dest = package_dir / "static"
                shutil.copytree(spa_dist_dir, spa_dest)
                print("SPA assets copied to package")
            else:
                print("Warning: SPA dist directory not found after build")

        # Generate and save index.json
        index_path = package_dir / "index.json"
        with open(index_path, "w") as f:
            json.dump(index_data, f, indent=2)

        # Create __main__.py entry point
        main_path = package_dir / "__main__.py"
        with open(main_path, "w") as f:
            f.write(create_main_module())

        # Create requirements.txt for documentation
        req_path = package_dir / "requirements.txt"
        with open(req_path, "w") as f:
            f.write(create_requirements_content())

        # Save detailed tool metadata to metadata folder
        for tool in tools:
            tool_metadata_dir = package_dir / "tools" / Path(tool.tool_dir).name / "metadata"
            tool_metadata_dir.mkdir(exist_ok=True)
            schemas_dir = tool_metadata_dir / "schemas"
            schemas_dir.mkdir(exist_ok=True)

            # Save git history
            if tool.git_history:
                git_history_file = tool_metadata_dir / "git_history.json"
                with open(git_history_file, "w") as f:
                    json.dump(tool.git_history, f, indent=2)

            # Save source code as HTML with syntax highlighting
            if tool.source_code:
                source_file = tool_metadata_dir / "source_code.html"
                html_content = generate_highlighted_source_html(tool.name, tool.source_code)
                with open(source_file, "w") as f:
                    f.write(html_content)

            # Create tool-specific tool.json for SPA navigation using typed models
            sample_input_refs = []
            for sample_input in tool.sample_inputs:
                sample_input_refs.append(
                    SampleInputReference(
                        name=sample_input["name"],
                        path=f"samples/{sample_input['file']}",
                        description=f"Sample input: {sample_input['name']}",
                        type="json",
                    )
                )

            schema_refs = []

            # Prefer rich schema information from the discovered Pydantic model
            input_schema = None
            if tool.pydantic_model is not None:
                try:
                    input_schema = tool.pydantic_model.model_json_schema()
                except Exception as exc:  # pragma: no cover - defensive guard
                    print(f"Warning: Failed to render schema for {tool.name}: {exc}")
                    input_schema = None
            elif tool.parameters:
                # Fallback: build a minimal schema from discovered parameters
                required_fields = [
                    name
                    for name, schema in tool.parameters.items()
                    if isinstance(schema, dict) and schema.get("required")
                ]
                properties = {}
                for name, schema in tool.parameters.items():
                    if isinstance(schema, dict):
                        schema_copy = schema.copy()
                        schema_copy.pop("required", None)
                        properties[name] = schema_copy
                input_schema = {
                    "type": "object",
                    "properties": properties,
                    "required": required_fields,
                    "additionalProperties": False,
                }

            if input_schema:
                input_schema_path = schemas_dir / "input_schema.json"
                with open(input_schema_path, "w") as f:
                    json.dump(input_schema, f, indent=2)
                schema_refs.append(
                    ToolFileReference(
                        path="metadata/schemas/input_schema.json",
                        description=(
                            f"Input schema ({tool.pydantic_model.__name__})"
                            if tool.pydantic_model is not None
                            else "Input schema"
                        ),
                        type="json",
                    )
                )

            # Always expose the ToolVault command output schema for reference
            output_schema = ToolVaultCommand.model_json_schema()
            output_schema_path = schemas_dir / "output_schema.json"
            with open(output_schema_path, "w") as f:
                json.dump(output_schema, f, indent=2)
            schema_refs.append(
                ToolFileReference(
                    path="metadata/schemas/output_schema.json",
                    description="Output schema (ToolVault command)",
                    type="json",
                )
            )

            tool_files = ToolFilesCollection(
                execute=ToolFileReference(
                    path="execute.py", description="Main tool implementation", type="python"
                ),
                source_code=ToolFileReference(
                    path="metadata/source_code.html",
                    description="Pretty-printed source code",
                    type="html",
                ),
                git_history=ToolFileReference(
                    path="metadata/git_history.json", description="Git commit history", type="json"
                ),
                inputs=sample_input_refs,
                schemas=schema_refs,
            )

            tool_stats = ToolStatsModel(
                sample_inputs_count=len(tool.sample_inputs),
                git_commits_count=len(tool.git_history),
                source_code_length=len(tool.source_code) if tool.source_code else 0,
            )

            tool_index_model = ToolIndexModel(
                tool_name=tool.name,
                description=tool.description,
                files=tool_files,
                stats=tool_stats,
            )

            # Save tool index in the package directory
            package_tool_dir = package_dir / "tools" / Path(tool.tool_dir).name
            package_tool_index_file = package_tool_dir / "tool.json"
            with open(package_tool_index_file, "w") as f:
                json.dump(tool_index_model.model_dump(), f, indent=2)

        print(f"Package contents created in {package_dir}")
        print("Tool metadata saved in metadata/ subdirectories")

        # Create the .pyz package
        print(f"Creating .pyz package: {output_path_path}")
        zipapp.create_archive(
            source=str(package_dir),
            target=str(output_path_path),
            interpreter=python_executable,
            compressed=True,
        )

        # Make executable
        output_path_path.chmod(0o755)

        print(f"Successfully created ToolVault package: {output_path_path}")
        print(f"Package size: {output_path_path.stat().st_size / 1024:.1f} KB")
        print(f"Tools included: {len(tools)}")

        # Verify the package
        if not output_path_path.exists():
            raise PackagerError("Package creation failed - output file not found")

        return str(output_path_path)

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
                    print(
                        f"  {i + 1}. {commit['hash'][:8]} - {commit['message']} ({commit['date'][:10]})"
                    )
                if len(tool.git_history) > 5:
                    print(f"  ... and {len(tool.git_history) - 5} more commits")

            if tool.source_code:
                print(f"\nSource Code ({len(tool.source_code)} characters):")
                print("-" * 40)
                # Show first 10 lines of source code
                lines = tool.source_code.split("\n")
                for i, line in enumerate(lines[:10]):
                    print(f"{i + 1:3d}: {line}")
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

    parser = argparse.ArgumentParser(description="Package ToolVault into a deployable .pyz file")
    parser.add_argument("tools_path", help="Path to tools directory")
    parser.add_argument(
        "--output",
        "-o",
        default="toolvault.pyz",
        help="Output path for .pyz file (default: toolvault.pyz)",
    )
    parser.add_argument(
        "--python",
        default="/usr/bin/env python3",
        help="Python executable for shebang (default: /usr/bin/env python3)",
    )
    parser.add_argument(
        "--show-details",
        action="store_true",
        help="Show detailed tool information including source code and git history (no packaging)",
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
            python_executable=args.python,
            run_tests=True,
        )
    except PackagerError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
