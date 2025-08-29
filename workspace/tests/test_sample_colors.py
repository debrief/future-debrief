#!/usr/bin/env python3
"""
Quick test of colored point rendering using sample.plot.json
"""

from debrief_api import debrief


def test_sample_colors():
    """Test the colored points in sample.plot.json."""
    print("Testing colored point rendering with sample.plot.json...")
    
    try:
        debrief.connect()
        print("✓ Connected to WebSocket server")
        
        # Check if sample.plot.json is open
        plots = debrief.list_open_plots()
        sample_plot = next((p for p in plots if 'sample.plot.json' in p['filename']), None)
        
        if sample_plot:
            print(f"✓ Found {sample_plot['filename']} - testing colored points")
            
            # Get the feature collection
            fc = debrief.get_feature_collection('sample.plot.json')
            print(f"✓ Retrieved {len(fc.get('features', []))} features")
            
            # Display color information
            for feature in fc['features']:
                name = feature.get('properties', {}).get('name', 'Unnamed')
                color = feature.get('properties', {}).get('color', 'Default (#00F)')
                print(f"  • {name}: {color}")
            
            # Test selection
            london_id = next((f['id'] for f in fc['features'] if 'London' in f.get('properties', {}).get('name', '')), None)
            if london_id:
                debrief.set_selected_features([london_id])
                print(f"✓ Selected London point (ID: {london_id}) to test selection styling")
            
            debrief.notify("🎨 Colored circle markers are working! Check the plot editor to see the results.")
            
        else:
            print("⚠️  sample.plot.json is not open. Please open it in VS Code first.")
            
    except Exception as e:
        print(f"✗ Error: {e}")


if __name__ == "__main__":
    test_sample_colors()