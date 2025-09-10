#!/usr/bin/env python3
"""
Simple demonstration: Set time to center of current time range
Shows how easy it is to programmatically control Debrief from Python
"""

from debrief_api import debrief
from datetime import datetime

# Import TimeState for typed API
from debrief.types.TimeState import TimeState

# Connect to VS Code Debrief extension
debrief.connect()

# Get current time state
time_state = debrief.get_time()

# Exit if plot doesn't have time data
if not time_state:
    print("❌ Current plot has no time data - open a temporal plot like large-sample.plot.json")
    exit(1)

# Calculate centre of time range using TimeState object properties
start = time_state.range[0]
end = time_state.range[1]
centre = start + (end - start) / 2

# update time state
time_state.current = centre
# set new time
debrief.set_time(time_state)

