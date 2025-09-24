"""
Debrief Types - Python types and validators for maritime GeoJSON features
"""

import json
from pathlib import Path

def _get_version():
    """Get version from package.json, fallback to git or default."""
    try:
        # Look for package.json in the project root
        package_json_path = Path(__file__).parent.parent.parent / "package.json"
        if package_json_path.exists():
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
                return package_data.get('version', '1.0.0')
    except Exception:
        pass
    
    return "1.0.0"

__version__ = _get_version()
