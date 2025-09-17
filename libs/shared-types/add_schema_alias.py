#!/usr/bin/env python3
"""Add Schema alias to files that are missing it."""

import os
import sys
import re
import glob

def add_schema_alias(filepath):
    """Add Schema alias to a Python class file."""
    with open(filepath, 'r') as f:
        content = f.read()

    # Check if Schema alias already exists
    if 'Schema =' in content:
        return False

    # Find the main class name (first class that inherits from BaseModel)
    class_match = re.search(r'class (\w+)\(BaseModel\)', content)
    if not class_match:
        return False

    class_name = class_match.group(1)

    # Add Schema alias at the end
    if not content.endswith('\n'):
        content += '\n'

    content += f'# Alias for cross-reference compatibility\nSchema = {class_name}\n'

    with open(filepath, 'w') as f:
        f.write(content)

    print(f"Added Schema alias to {filepath}")
    return True

def main():
    """Add Schema aliases to generated Python files that are missing them."""
    if len(sys.argv) != 2:
        print("Usage: add_schema_alias.py <python_types_directory>")
        sys.exit(1)

    base_dir = sys.argv[1]

    if not os.path.exists(base_dir):
        print(f"Directory not found: {base_dir}")
        sys.exit(1)

    # Find all Python files in the types directory
    pattern = os.path.join(base_dir, "**", "*.py")
    python_files = glob.glob(pattern, recursive=True)

    # Filter out __init__.py files
    python_files = [f for f in python_files if not f.endswith('__init__.py')]

    updated_count = 0
    for filepath in python_files:
        if add_schema_alias(filepath):
            updated_count += 1

    print(f"Updated {updated_count} files with Schema aliases")

if __name__ == "__main__":
    main()