"""Command-line interface for the testing framework."""

import argparse
import sys

from .test_runner import TestConfig, TestRunner


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="ToolVault Testing Framework")
    parser.add_argument(
        "--tools-dir",
        default="./tools",
        help="Path to tools directory (default: ./tools)"
    )
    parser.add_argument(
        "--samples-dir",
        default="./samples",
        help="Path to samples directory (default: ./samples)"
    )
    parser.add_argument(
        "--no-fail-on-error",
        action="store_true",
        help="Don't fail packaging even if tests fail"
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Test command
    test_parser = subparsers.add_parser("test", help="Run tool tests")
    test_parser.add_argument(
        "--report-only",
        action="store_true",
        help="Report all errors but don't stop on first failure"
    )
    test_parser.add_argument(
        "--save-report",
        help="Save test report to specified file"
    )

    # Generate baseline command
    baseline_parser = subparsers.add_parser("generate-baseline", help="Generate baseline expected outputs")
    baseline_parser.add_argument(
        "tool_name",
        nargs="?",
        help="Specific tool name (omit for all tools)"
    )

    # List tools command
    list_parser = subparsers.add_parser("list-tools", help="List discovered tools")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    # Create test configuration
    config = TestConfig(
        tools_directory=args.tools_dir,
        samples_directory=args.samples_dir,
        fail_on_any_error=not args.no_fail_on_error
    )

    runner = TestRunner(config)

    if args.command == "test":
        # Set report and continue based on CLI flag
        if args.report_only:
            config.report_and_continue = True

        success = runner.run_all_tool_tests()

        # Save report if requested
        if args.save_report:
            runner.save_test_report(args.save_report)

        return 0 if success else 1

    elif args.command == "generate-baseline":
        success = runner.run_baseline_generation(args.tool_name)
        return 0 if success else 1

    elif args.command == "list-tools":
        print("Discovered tools:")
        for tool_name, tool_meta in runner.tester.discovered_tools.items():
            input_count = len(runner.tester.get_tool_inputs(tool_name))
            print(f"  {tool_name} ({input_count} input files)")
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
