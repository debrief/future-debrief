#!/usr/bin/env python3
"""
Test HTTP connection to Debrief VS Code extension
"""

from debrief_api import debrief

try:
    print("Testing HTTP connection to Debrief...")
    # Try to connect
    debrief.connect()
    print("✓ Connection successful!")

    # Try to list open plots
    plots = debrief.list_open_plots()
    print(f"✓ List command works! Open plots: {plots}")

except Exception as e:
    print(f"✗ Connection failed: {e}")
    print("\nMake sure:")
    print("1. VS Code is running")
    print("2. The Debrief extension is activated")
    print("3. The HTTP server is listening on port 60123")