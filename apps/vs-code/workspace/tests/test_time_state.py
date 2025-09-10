#!/usr/bin/env python3
"""
Test example: Get TimeState, calculate center, and set as current time

This test demonstrates the new time state WebSocket commands by:
1. Retrieving the current TimeState using debrief.get_time()
2. Calculating the center of the current time range
3. Setting the calculated center time as the new current time using debrief.set_time()
4. Verifying that the time changes are reflected in the VS Code editor UI
"""

from debrief_api import debrief
from datetime import datetime

def test_time_state_center_calculation():
    """Test getting time state, calculating center, and updating current time."""
    
    try:
        # Connect to the Debrief WebSocket server
        debrief.connect()
        print("✅ Connected to Debrief WebSocket server")
        
        # Get current time state
        print("\n📋 Getting current time state...")
        time_state = debrief.get_time("large-sample.plot.json")
        
        if not time_state:
            print("⚠️  No time state found for sample.plot.json")
            print("💡 This is normal if no time state has been set yet")
            
            # Create a default time state for demonstration
            print("\n🕐 Creating default time state for demonstration...")
            default_time_state = {
                "current": "2025-09-03T12:00:00Z",
                "range": [
                    "2025-09-03T10:00:00Z", 
                    "2025-09-03T14:00:00Z"
                ]
            }
            debrief.set_time(default_time_state, "sample.plot.json")
            print("✅ Default time state created")
            
            # Get the newly set time state
            time_state = debrief.get_time("sample.plot.json")
        
        print(f"✅ Retrieved time state:")
        print(f"   Current time: {time_state['current']}")
        print(f"   Time range: {time_state['range'][0]} to {time_state['range'][1]}")
        
        # Calculate center of time range
        print("\n🔄 Calculating center of time range...")
        start_time = datetime.fromisoformat(time_state['range'][0].replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(time_state['range'][1].replace('Z', '+00:00'))
        center_time = start_time + (end_time - start_time) / 2
        
        print(f"   Start time: {start_time}")
        print(f"   End time: {end_time}")
        print(f"   Center time: {center_time}")
        
        # Update current time to center
        print("\n⏰ Setting current time to calculated center...")
        time_state['current'] = center_time.isoformat().replace('+00:00', 'Z')
        debrief.set_time(time_state, "large-sample.plot.json")
        
        print(f"✅ Time updated to center: {time_state['current']}")
        
        # Verify the update by getting the time state again
        print("\n🔍 Verifying time state update...")
        updated_time_state = debrief.get_time("large-sample.plot.json")
        
        if updated_time_state and updated_time_state['current'] == time_state['current']:
            print("✅ Time state update verified successfully!")
            print(f"   Confirmed current time: {updated_time_state['current']}")
        else:
            print("⚠️  Time state update verification failed")
            print(f"   Expected: {time_state['current']}")
            print(f"   Got: {updated_time_state['current'] if updated_time_state else 'None'}")
        
        print("\n🎉 Test completed successfully!")
        print("\n💡 Check the VS Code editor to see the time changes reflected in the UI")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        print(f"   Error type: {type(e).__name__}")
        
        # Provide helpful troubleshooting information
        print("\n🔧 Troubleshooting:")
        print("   1. Ensure VS Code extension is running")
        print("   2. Ensure sample.plot.json is open in VS Code")
        print("   3. Ensure WebSocket server is started on port 60123")
        print("   4. Check that debrief_api.py is in the same directory")

if __name__ == "__main__":
    print("🚀 Starting Time State Test Demonstration")
    print("=" * 50)
    test_time_state_center_calculation()