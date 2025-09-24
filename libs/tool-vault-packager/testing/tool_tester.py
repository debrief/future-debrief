"""Core tool testing functionality for ToolVault packager."""

import json
import tempfile
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from ..discovery import ToolMetadata, discover_tools
except ImportError:
    # Handle case when running as script
    from discovery import ToolMetadata, discover_tools


@dataclass
class TestResult:
    """Result of a single tool test."""

    tool_name: str
    input_file: str
    success: bool
    output: Optional[Dict[str, Any]] = None
    expected_output: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    execution_time: Optional[float] = None


class ToolTester:
    """Main class for testing individual tools."""

    def __init__(self, tools_directory: str = "./tools"):
        """Initialize the tool tester.

        Args:
            tools_directory: Path to the tools directory
        """
        self.tools_directory = Path(tools_directory)
        self.discovered_tools: Dict[str, ToolMetadata] = {}
        self._discover_tools()

    def _discover_tools(self):
        """Discover all available tools."""
        try:
            tools_list = discover_tools(str(self.tools_directory))
            self.discovered_tools = {tool.name: tool for tool in tools_list}
        except Exception as e:
            raise RuntimeError(f"Failed to discover tools: {e}")

    def get_tool_inputs(self, tool_name: str) -> List[Path]:
        """Get all sample files for a specific tool.

        Args:
            tool_name: Name of the tool

        Returns:
            List of paths to sample files
        """
        if tool_name not in self.discovered_tools:
            raise ValueError(f"Tool '{tool_name}' not found")

        tool_meta = self.discovered_tools[tool_name]
        samples_dir = Path(tool_meta.tool_dir) / "samples"

        if not samples_dir.exists():
            return []

        return list(samples_dir.glob("*.json"))

    def execute_tool(self, tool_name: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool with given input data.

        Args:
            tool_name: Name of the tool to execute
            input_data: Input parameters for the tool

        Returns:
            Tool execution output

        Raises:
            Exception: If tool execution fails
        """
        if tool_name not in self.discovered_tools:
            raise ValueError(f"Tool '{tool_name}' not found")

        tool_meta = self.discovered_tools[tool_name]

        try:
            # Convert input data to Pydantic model if available
            if tool_meta.pydantic_model:
                params = tool_meta.pydantic_model(**input_data)
                result = tool_meta.function(params)
            else:
                result = tool_meta.function(**input_data)

            return result

        except Exception as e:
            raise Exception(f"Tool execution failed: {str(e)}")

    def run_single_test(
        self, tool_name: str, input_file: Path, expected_output: Optional[Dict[str, Any]] = None
    ) -> TestResult:
        """Run a single test for a tool with specific input.

        Args:
            tool_name: Name of the tool
            input_file: Path to the input JSON file
            expected_output: Expected output for regression testing

        Returns:
            TestResult object with test results
        """
        import time

        start_time = time.time()

        try:
            # Load input data
            with open(input_file, "r") as f:
                input_data = json.load(f)

            # Execute tool
            output = self.execute_tool(tool_name, input_data)
            execution_time = time.time() - start_time

            # Check if output matches expected (for regression testing)
            success = True
            error_message = None

            if expected_output is not None:
                # Convert Pydantic models to dictionaries for comparison
                if hasattr(output, "model_dump"):
                    output_dict = output.model_dump()
                else:
                    output_dict = output

                # JSON-serialize both for comparison to handle tuple/list differences
                try:
                    output_json = json.dumps(output_dict, sort_keys=True)
                    expected_json = json.dumps(expected_output, sort_keys=True)

                    if output_json != expected_json:
                        success = False
                        error_message = (
                            f"Output mismatch. Expected: {expected_output}, Got: {output_dict}"
                        )
                except (TypeError, ValueError):
                    # Fallback to direct comparison if JSON serialization fails
                    if output_dict != expected_output:
                        success = False
                        error_message = (
                            f"Output mismatch. Expected: {expected_output}, Got: {output_dict}"
                        )

            return TestResult(
                tool_name=tool_name,
                input_file=str(input_file),
                success=success,
                output=output,
                expected_output=expected_output,
                error_message=error_message,
                execution_time=execution_time,
            )

        except Exception as e:
            execution_time = time.time() - start_time
            return TestResult(
                tool_name=tool_name,
                input_file=str(input_file),
                success=False,
                error_message=f"Test execution failed: {str(e)}\n{traceback.format_exc()}",
                execution_time=execution_time,
            )

    def run_all_tests_for_tool(
        self, tool_name: str, sample_data: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> List[TestResult]:
        """Run all tests for a specific tool.

        Args:
            tool_name: Name of the tool
            sample_data: Optional sample data with expected outputs for regression testing

        Returns:
            List of TestResult objects
        """
        sample_files = self.get_tool_inputs(tool_name)
        results = []

        for sample_file in sample_files:
            # Load the sample file which contains both input and expectedOutput
            with open(sample_file, "r") as f:
                sample_content = json.load(f)

            input_data = sample_content.get("input", {})
            expected_output = sample_content.get("expectedOutput")

            # Create a temporary file to pass to run_single_test
            with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as temp_file:
                json.dump(input_data, temp_file, indent=2)
                temp_file_path = temp_file.name

            try:
                result = self.run_single_test(tool_name, Path(temp_file_path), expected_output)
                # Update the input_file reference to the original sample file
                result.input_file = str(sample_file)
                results.append(result)
            finally:
                # Clean up temp file
                import os

                os.unlink(temp_file_path)

        return results


class BaselineGenerator:
    """Generates baseline expected outputs for tools."""

    def __init__(self, tools_directory: str = "./tools"):
        """Initialize the baseline generator.

        Args:
            tools_directory: Path to the tools directory
        """
        self.tools_directory = Path(tools_directory)
        self.tester = ToolTester(tools_directory)

    def generate_sample_for_tool(self, tool_name: str) -> Dict[str, Dict[str, Any]]:
        """Generate sample files for a specific tool from its inputs folder.

        Args:
            tool_name: Name of the tool

        Returns:
            Dictionary containing sample data with inputs and expected outputs
        """
        if tool_name not in self.tester.discovered_tools:
            raise ValueError(f"Tool '{tool_name}' not found")

        tool_meta = self.tester.discovered_tools[tool_name]
        tool_dir = Path(tool_meta.tool_dir)
        samples_dir = tool_dir / "samples"

        if not samples_dir.exists():
            print(f"No samples directory found for {tool_name}")
            return {}

        sample_data = {}

        # Process each sample file that only has input (no expectedOutput yet)
        for sample_file in samples_dir.glob("*.json"):
            sample_key = sample_file.stem  # filename without extension

            # Load sample data
            with open(sample_file, "r") as f:
                sample_content = json.load(f)

            # Extract input data from the sample structure
            input_data = sample_content.get("input", sample_content)

            # Execute tool to get expected output
            try:
                expected_output = self.tester.execute_tool(tool_name, input_data)

                sample_content = {"input": input_data, "expectedOutput": expected_output}

                # Save individual sample file
                sample_file = samples_dir / f"{sample_key}.json"
                with open(sample_file, "w") as f:
                    json.dump(sample_content, f, indent=2)

                print(f"Generated sample: {sample_file}")
                sample_data[sample_key] = sample_content

            except Exception as e:
                print(f"Warning: Failed to generate baseline for {tool_name}/{sample_key}: {e}")

                sample_content = {
                    "input": input_data,
                    "expectedOutput": None,
                    "baseline_error": str(e),
                }

                # Save individual sample file even with error
                sample_file = samples_dir / f"{sample_key}.json"
                with open(sample_file, "w") as f:
                    json.dump(sample_content, f, indent=2)

                print(f"Generated sample with error: {sample_file}")
                sample_data[sample_key] = sample_content

        return sample_data

    def save_sample_data(self, tool_name: str, sample_data: Dict[str, Dict[str, Any]]):
        """Save sample data to individual files in tool's samples folder.

        Args:
            tool_name: Name of the tool
            sample_data: Sample data dictionary
        """
        if tool_name not in self.tester.discovered_tools:
            raise ValueError(f"Tool '{tool_name}' not found")

        tool_meta = self.tester.discovered_tools[tool_name]
        tool_dir = Path(tool_meta.tool_dir)
        samples_dir = tool_dir / "samples"

        # Create samples directory if it doesn't exist
        samples_dir.mkdir(exist_ok=True)

        # Save each sample as a separate file with the same name as the input
        for sample_key, sample_content in sample_data.items():
            sample_file = samples_dir / f"{sample_key}.json"
            with open(sample_file, "w") as f:
                json.dump(sample_content, f, indent=2)
            print(f"Sample data saved to: {sample_file}")

    def generate_baseline_for_tool(self, tool_name: str) -> bool:
        """Generate and save baseline for a specific tool.

        Args:
            tool_name: Name of the tool

        Returns:
            True if successful, False otherwise
        """
        try:
            sample_data = self.generate_sample_for_tool(tool_name)
            self.save_sample_data(tool_name, sample_data)
            return True
        except Exception as e:
            print(f"Failed to generate baseline for {tool_name}: {e}")
            return False

    def generate_baselines_for_all_tools(self) -> Dict[str, bool]:
        """Generate baselines for all discovered tools.

        Returns:
            Dictionary mapping tool names to success status
        """
        results = {}

        for tool_name in self.tester.discovered_tools.keys():
            print(f"Generating baseline for {tool_name}...")
            results[tool_name] = self.generate_baseline_for_tool(tool_name)

        return results

    def load_sample_data(self, tool_name: str) -> Optional[Dict[str, Dict[str, Any]]]:
        """Load sample data for a tool from its samples folder.

        Args:
            tool_name: Name of the tool

        Returns:
            Sample data dictionary or None if not found
        """
        if tool_name not in self.tester.discovered_tools:
            return None

        tool_meta = self.tester.discovered_tools[tool_name]
        tool_dir = Path(tool_meta.tool_dir)
        samples_dir = tool_dir / "samples"

        if not samples_dir.exists():
            return None

        sample_data = {}

        # Load all JSON files from the samples directory
        for sample_file in samples_dir.glob("*.json"):
            sample_key = sample_file.stem  # filename without extension
            try:
                with open(sample_file, "r") as f:
                    sample_content = json.load(f)
                    # Extract just the sample content (input and expectedOutput are already unified)
                    sample_data[sample_key] = sample_content
            except Exception as e:
                print(f"Failed to load sample data from {sample_file}: {e}")

        return sample_data if sample_data else None
