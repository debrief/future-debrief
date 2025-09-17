#!/usr/bin/env python3
"""Fix imports in generated Python files."""

import sys
import re

def fix_imports(filepath):
    """Fix imports from '.' to separate feature imports from state imports."""
    with open(filepath, 'r') as f:
        content = f.read()

    lines = content.split('\n')
    feature_imports = []
    state_imports = []
    other_lines = []
    in_import_block = False

    for line in lines:
        if 'from . import (' in line:
            in_import_block = True
            continue
        elif in_import_block and ')' in line:
            in_import_block = False
            continue
        elif in_import_block:
            item = line.strip().rstrip(',')
            if item in ['Annotation', 'Point', 'Track', 'FeatureCollection']:
                feature_imports.append(item)
            else:
                state_imports.append(item)
        else:
            other_lines.append(line)

    # Reconstruct the file
    result = []
    pydantic_line_found = False

    for line in other_lines:
        if 'from pydantic import' in line and not pydantic_line_found:
            result.append(line)
            result.append('')

            if feature_imports:
                result.append('from ..features import (')
                for imp in feature_imports:
                    result.append(f'    {imp},')
                result.append(')')

            if state_imports:
                result.append('from . import (')
                for imp in state_imports:
                    result.append(f'    {imp},')
                result.append(')')

            pydantic_line_found = True
        else:
            result.append(line)

    with open(filepath, 'w') as f:
        f.write('\n'.join(result))

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: fix_imports.py <filepath>")
        sys.exit(1)

    fix_imports(sys.argv[1])