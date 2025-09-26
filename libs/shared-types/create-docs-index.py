#!/usr/bin/env python3
"""
Create an index.html file for the generated JSON schema documentation.
Organizes schemas by maritime domain categories.
"""

import os
import glob
from pathlib import Path

def create_index_html():
    docs_dir = Path("derived/docs")

    # Find all HTML files
    html_files = [f for f in docs_dir.glob("*.html") if f.name != "index.html"]

    # Categorize schemas by domain
    categories = {
        "Maritime Features": [],
        "Application States": [],
        "Tool Commands": [],
        "GeoJSON Types": []
    }

    for html_file in sorted(html_files):
        name = html_file.stem.replace('.schema', '')

        if any(keyword in name for keyword in ['track', 'point', 'annotation', 'feature_collection']):
            categories["Maritime Features"].append((name, html_file.name))
        elif any(keyword in name for keyword in ['state', 'selection', 'viewport', 'time', 'editor', 'current']):
            categories["Application States"].append((name, html_file.name))
        elif any(keyword in name for keyword in ['command', 'tool', 'payload', 'request', 'response']):
            categories["Tool Commands"].append((name, html_file.name))
        elif any(keyword in name for keyword in ['Point', 'LineString', 'Polygon', 'Feature', 'Collection']):
            categories["GeoJSON Types"].append((name, html_file.name))
        else:
            # Default to tool commands for others
            categories["Tool Commands"].append((name, html_file.name))

    # Generate index.html
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Future Debrief JSON Schema Documentation</title>
    <link href="css/bootstrap-4.3.1.min.css" rel="stylesheet">
    <link rel="stylesheet" type="text/css" href="css/schema_doc.css">
    <style>
        .schema-category {
            margin-bottom: 2rem;
        }
        .schema-list {
            columns: 2;
            column-gap: 2rem;
        }
        .schema-item {
            display: inline-block;
            width: 100%;
            margin-bottom: 0.5rem;
        }
        .maritime-header {
            color: #2c5aa0;
            border-bottom: 2px solid #2c5aa0;
            padding-bottom: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        <div class="row">
            <div class="col-12">
                <h1 class="maritime-header">Future Debrief JSON Schema Documentation</h1>
                <p class="lead">Interactive documentation for maritime analysis platform schemas</p>
                <p>This documentation covers all JSON schemas used in the Future Debrief maritime analysis platform,
                   including vessel tracks, points of interest, annotations, application state management, and tool commands.</p>

                <div class="alert alert-info" role="alert">
                    <strong>Usage:</strong> Click on any schema name below to view its detailed documentation, including
                    property definitions, validation rules, and examples.
                </div>
"""

    for category, schemas in categories.items():
        if schemas:  # Only show categories that have schemas
            html_content += f"""
                <div class="schema-category">
                    <h2>{category}</h2>
                    <div class="schema-list">
"""
            for name, filename in sorted(schemas):
                display_name = name.replace('_', ' ').title().replace('Debrief', 'Debrief ')
                html_content += f'''                        <div class="schema-item">
                            <a href="{filename}" class="btn btn-outline-primary btn-sm">{display_name}</a>
                        </div>
'''
            html_content += """                    </div>
                </div>
"""

    html_content += """
                <hr class="mt-5">
                <footer class="text-muted">
                    <p><small>Generated documentation for Future Debrief maritime analysis platform JSON schemas.
                    Built with <a href="https://json-schema-for-humans.readthedocs.io/">json-schema-for-humans</a>.</small></p>
                </footer>
            </div>
        </div>
    </div>
</body>
</html>"""

    # Write index.html
    index_path = docs_dir / "index.html"
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"✓ Created documentation index at {index_path}")
    print(f"✓ Organized {len(html_files)} schemas into {len([c for c in categories.values() if c])} categories")

if __name__ == "__main__":
    create_index_html()