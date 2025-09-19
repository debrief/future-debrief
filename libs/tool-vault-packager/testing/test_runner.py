"""Test runner for integrating tool testing with packaging process."""

import json
from dataclasses import dataclass
from typing import Dict, Any, List, Optional
from pathlib import Path

from .tool_tester import ToolTester, BaselineGenerator, TestResult


@dataclass
class TestConfig:
    """Configuration for test runner."""
    tools_directory: str = "./tools"
    samples_directory: str = "./samples"
    report_and_continue: bool = True
    fail_on_any_error: bool = True


class TestRunner:
    """Main test runner for packaging workflow integration."""

    def __init__(self, config: TestConfig):
        """Initialize the test runner.

        Args:
            config: Test configuration
        """
        self.config = config
        self.tester = ToolTester(config.tools_directory)
        self.baseline_generator = BaselineGenerator(config.tools_directory, config.samples_directory)
        self.test_results: List[TestResult] = []

    def run_all_tool_tests(self) -> bool:
        """Run tests for all discovered tools.

        Returns:
            True if all tests passed, False if any test failed
        """
        print("Starting tool testing phase...")

        all_passed = True
        total_tests = 0
        failed_tests = 0

        for tool_name in self.tester.discovered_tools.keys():
            print(f"\nTesting tool: {tool_name}")

            # Load sample data for regression testing
            sample_data = self.baseline_generator.load_sample_data(tool_name)

            if sample_data is None:
                print(f"  Warning: No sample data found for {tool_name}. Skipping regression tests.")
                print(f"  Run baseline generation first: python -m testing.cli generate-baseline {tool_name}")
                continue

            # Run tests for this tool
            tool_results = self.tester.run_all_tests_for_tool(tool_name, sample_data)
            self.test_results.extend(tool_results)

            # Process results
            tool_passed = True
            for result in tool_results:
                total_tests += 1
                if not result.success:
                    failed_tests += 1
                    tool_passed = False
                    all_passed = False

                    error_msg = f"  FAIL: {Path(result.input_file).name}"
                    if result.error_message:
                        error_msg += f" - {result.error_message}"
                    print(error_msg)

                    # If not report and continue, stop immediately
                    if not self.config.report_and_continue:
                        print("Stopping tests due to failure (report_and_continue=False)")
                        return False
                else:
                    print(f"  PASS: {Path(result.input_file).name}")

            if tool_passed:
                print(f"  ✓ All tests passed for {tool_name}")
            else:
                print(f"  ✗ Some tests failed for {tool_name}")

        # Summary
        print(f"\n{'='*50}")
        print(f"Test Summary:")
        print(f"Total tests: {total_tests}")
        print(f"Passed: {total_tests - failed_tests}")
        print(f"Failed: {failed_tests}")

        if all_passed:
            print("✓ All tool tests passed!")
        else:
            print("✗ Some tool tests failed!")
            if self.config.fail_on_any_error:
                print("Packaging will be aborted due to test failures.")

        return all_passed

    def generate_test_report(self) -> Dict[str, Any]:
        """Generate a detailed test report.

        Returns:
            Dictionary containing test report data
        """
        report = {
            "total_tests": len(self.test_results),
            "passed_tests": len([r for r in self.test_results if r.success]),
            "failed_tests": len([r for r in self.test_results if not r.success]),
            "tools_tested": len(set(r.tool_name for r in self.test_results)),
            "results": []
        }

        for result in self.test_results:
            result_data = {
                "tool_name": result.tool_name,
                "input_file": result.input_file,
                "success": result.success,
                "execution_time": result.execution_time
            }

            if not result.success and result.error_message:
                result_data["error_message"] = result.error_message

            report["results"].append(result_data)

        return report

    def save_test_report(self, output_file: str = "test_report.json"):
        """Save test report to file.

        Args:
            output_file: Path to output file
        """
        report = self.generate_test_report()

        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)

        print(f"Test report saved to: {output_file}")

    def run_baseline_generation(self, tool_name: Optional[str] = None) -> bool:
        """Run baseline generation for tools.

        Args:
            tool_name: Specific tool name, or None for all tools

        Returns:
            True if successful, False otherwise
        """
        if tool_name:
            print(f"Generating baseline for tool: {tool_name}")
            return self.baseline_generator.generate_baseline_for_tool(tool_name)
        else:
            print("Generating baselines for all tools...")
            results = self.baseline_generator.generate_baselines_for_all_tools()

            success_count = sum(1 for success in results.values() if success)
            total_count = len(results)

            print(f"\nBaseline generation complete: {success_count}/{total_count} tools successful")

            if success_count < total_count:
                print("Some tools failed baseline generation:")
                for tool_name, success in results.items():
                    if not success:
                        print(f"  ✗ {tool_name}")

            return success_count == total_count