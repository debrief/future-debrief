#!/usr/bin/env python3
"""
Simple demonstration: Set time to center of current time range
Shows how easy it is to programmatically control Debrief from Python
"""

from debrief_api import debrief
from datetime import datetime

# Connect to VS Code Debrief extension
debrief.connect()

# Get current time state
time_state = debrief.get_time()

# Exit if plot doesn't have time data
if not time_state:
    print("❌ Current plot has no time data - open a temporal plot like large-sample.plot.json")
    exit(1)

# Calculate center of time range
start = datetime.fromisoformat(time_state['range'][0].replace('Z', '+00:00'))
end = datetime.fromisoformat(time_state['range'][1].replace('Z', '+00:00'))
center = start + (end - start) / 2

# Set time to center
time_state['current'] = center.isoformat().replace('+00:00', 'Z')
debrief.set_time(time_state)

print(f"✅ Time set to center: {time_state['current']}")
print("💡 Check the VS Code time slider - it should now show the center time!")