"""Core tool testing functionality for ToolVault packager."""

import json
import traceback
from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Union
from pathlib import Path
import importlib.util
import sys
import tempfile
import shutil

try:
    from ..discovery import discover_tools, ToolMetadata
except ImportError:
    # Handle case when running as script
    from discovery import discover_tools, ToolMetadata


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
        """Get all input files for a specific tool.

        Args:
            tool_name: Name of the tool

        Returns:
            List of paths to input files
        """
        if tool_name not in self.discovered_tools:
            raise ValueError(f"Tool '{tool_name}' not found")

        tool_meta = self.discovered_tools[tool_name]
        inputs_dir = Path(tool_meta.tool_dir) / "inputs"

        if not inputs_dir.exists():
            return []

        return list(inputs_dir.glob("*.json"))

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

    def run_single_test(self, tool_name: str, input_file: Path, expected_output: Optional[Dict[str, Any]] = None) -> TestResult:
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
            with open(input_file, 'r') as f:
                input_data = json.load(f)

            # Execute tool
            output = self.execute_tool(tool_name, input_data)
            execution_time = time.time() - start_time

            # Check if output matches expected (for regression testing)
            success = True
            error_message = None

            if expected_output is not None:
                if output != expected_output:
                    success = False
                    error_message = f"Output mismatch. Expected: {expected_output}, Got: {output}"

            return TestResult(
                tool_name=tool_name,
                input_file=str(input_file),
                success=success,
                output=output,
                expected_output=expected_output,
                error_message=error_message,
                execution_time=execution_time
            )

        except Exception as e:
            execution_time = time.time() - start_time
            return TestResult(
                tool_name=tool_name,
                input_file=str(input_file),
                success=False,
                error_message=f"Test execution failed: {str(e)}\n{traceback.format_exc()}",
                execution_time=execution_time
            )

    def run_all_tests_for_tool(self, tool_name: str, sample_data: Optional[Dict[str, Dict[str, Any]]] = None) -> List[TestResult]:
        """Run all tests for a specific tool.

        Args:
            tool_name: Name of the tool
            sample_data: Optional sample data with expected outputs for regression testing

        Returns:
            List of TestResult objects
        """
        input_files = self.get_tool_inputs(tool_name)
        results = []

        for input_file in input_files:
            expected_output = None
            if sample_data:
                sample_key = input_file.stem  # filename without extension
                if sample_key in sample_data:
                    expected_output = sample_data[sample_key].get("expectedOutput")

            result = self.run_single_test(tool_name, input_file, expected_output)
            results.append(result)

        return results


class BaselineGenerator:
    """Generates baseline expected outputs for tools."""

    def __init__(self, tools_directory: str = "./tools", samples_directory: str = "./samples"):
        """Initialize the baseline generator.

        Args:
            tools_directory: Path to the tools directory
            samples_directory: Path to store sample files
        """
        self.tools_directory = Path(tools_directory)
        self.samples_directory = Path(samples_directory)
        self.tester = ToolTester(tools_directory)

        # Create samples directory if it doesn't exist
        self.samples_directory.mkdir(exist_ok=True)

    def generate_sample_for_tool(self, tool_name: str) -> Dict[str, Dict[str, Any]]:
        """Generate sample data file for a specific tool.

        Args:
            tool_name: Name of the tool

        Returns:
            Dictionary containing sample data with inputs and expected outputs
        """
        if tool_name not in self.tester.discovered_tools:
            raise ValueError(f"Tool '{tool_name}' not found")

        input_files = self.tester.get_tool_inputs(tool_name)
        sample_data = {}

        for input_file in input_files:
            sample_key = input_file.stem  # filename without extension

            # Load input data
            with open(input_file, 'r') as f:
                input_data = json.load(f)

            # Execute tool to get expected output
            try:
                expected_output = self.tester.execute_tool(tool_name, input_data)

                sample_data[sample_key] = {
                    "input": input_data,
                    "expectedOutput": expected_output
                }

            except Exception as e:
                print(f"Warning: Failed to generate baseline for {tool_name}/{sample_key}: {e}")
                sample_data[sample_key] = {
                    "input": input_data,
                    "expectedOutput": None,
                    "baseline_error": str(e)
                }

        return sample_data

    def save_sample_data(self, tool_name: str, sample_data: Dict[str, Dict[str, Any]]):
        """Save sample data to file.

        Args:
            tool_name: Name of the tool
            sample_data: Sample data dictionary
        """
        sample_file = self.samples_directory / f"{tool_name}_sample.json"

        with open(sample_file, 'w') as f:
            json.dump(sample_data, f, indent=2)

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
        """Load sample data for a tool.

        Args:
            tool_name: Name of the tool

        Returns:
            Sample data dictionary or None if not found
        """
        sample_file = self.samples_directory / f"{tool_name}_sample.json"

        if not sample_file.exists():
            return None

        try:
            with open(sample_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Failed to load sample data for {tool_name}: {e}")
            return None