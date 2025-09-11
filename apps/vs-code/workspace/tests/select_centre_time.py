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

# Calculate centre of time range
start_ts = time_state.start.timestamp()
end_ts = time_state.end.timestamp()
centre_ts = start_ts + (end_ts - start_ts) / 2

# Convert back to datetime object for the TimeState
centre_dt = datetime.fromtimestamp(centre_ts)

# update time state
time_state.current = centre_dt
# set new time
debrief.set_time(time_state)

