#!/usr/bin/env python3
"""Build a .pyz zipapp for tools-mcp."""

import shutil
import subprocess
import sys
import zipapp
from pathlib import Path


def build_pyz():
    """Build a .pyz zipapp containing the tools-mcp server."""
    print("Building tools-mcp.pyz...")

    # Temporary directory for building the zipapp
    tmp_dir = Path("tmp_pyz_build")
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir()

    try:
        # Install dependencies into tmp_dir
        print("Installing dependencies...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install",
            "--target", str(tmp_dir),
            "--upgrade",
            "fastmcp>=0.5.0",
            "pydantic>=2.0.0",
            "geojson-pydantic>=1.0.0",
            "jsonschema>=4.17.0",
            "../../libs/shared-types",  # Install shared-types from local path
        ])

        # Copy source files
        print("Copying source files...")
        src_dir = Path("src/tools_mcp")
        dest_dir = tmp_dir / "tools_mcp"
        shutil.copytree(src_dir, dest_dir)

        # Create __main__.py for zipapp entry point
        main_content = """
import sys
from tools_mcp.server import main

if __name__ == "__main__":
    main()
"""
        (tmp_dir / "__main__.py").write_text(main_content)

        # Create the zipapp
        print("Creating zipapp...")
        output_file = Path("tools-mcp.pyz")
        zipapp.create_archive(
            source=tmp_dir,
            target=output_file,
            interpreter="/usr/bin/env python3",
            compressed=True,
        )

        print(f"✓ Created {output_file} ({output_file.stat().st_size / 1024 / 1024:.2f} MB)")
        return True

    except Exception as e:
        print(f"Error building .pyz: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Cleanup
        if tmp_dir.exists():
            shutil.rmtree(tmp_dir)


if __name__ == "__main__":
    success = build_pyz()
    sys.exit(0 if success else 1)
