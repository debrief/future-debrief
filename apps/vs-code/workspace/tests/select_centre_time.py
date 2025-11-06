#!/usr/bin/env python3
"""
Simple demonstration: Set time to center of current time range
Shows how easy it is to programmatically control Debrief from Python

This example demonstrates how to use Pydantic types with the MCP client
for type-safe time state manipulation.
"""

from mcp_client import MCPClient
from debrief.types.states.time_state import TimeState
from datetime import datetime

# Create MCP client
client = MCPClient()

# Get current time state (returns TimeState model)
time_state = client.get_time()

# Exit if plot doesn't have time data
if not time_state or not time_state.start or not time_state.end:
    print("❌ Current plot has no time data - open a temporal plot like large-sample.plot.json")
    exit(1)

# Parse ISO 8601 datetime strings (type-safe access via Pydantic model)
start_dt = datetime.fromisoformat(time_state.start.replace('Z', '+00:00'))
end_dt = datetime.fromisoformat(time_state.end.replace('Z', '+00:00'))

# Calculate centre of time range
start_ts = start_dt.timestamp()
end_ts = end_dt.timestamp()
centre_ts = start_ts + (end_ts - start_ts) / 2

# Convert back to datetime and format as ISO 8601
centre_dt = datetime.fromtimestamp(centre_ts)
centre_iso = centre_dt.isoformat()

print(f"Start: {time_state.start}")
print(f"End: {time_state.end}")
print(f"Setting time to center: {centre_iso}")

# Update time state with new center time (using Pydantic model)
new_time_state = TimeState(
    start=time_state.start,
    current=centre_iso,
    end=time_state.end
)

# Set new time (accepts TimeState model)
client.set_time(new_time_state)
print("✓ Time updated to center of range")
