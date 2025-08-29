#!/usr/bin/env python3
"""
Example demonstrating the improved developer experience with discoverable API methods.

This example shows how developers can now use auto-completion to discover available methods
instead of needing to import specific functions or memorize the API.
"""

from debrief_api import debrief, DebriefAPIError

def demo_discoverable_api():
    """
    Demonstrate the improved developer experience.
    
    With the new object-based API, developers can:
    1. Import just one object: debrief
    2. Use IDE auto-completion to discover all available methods
    3. Access comprehensive docstrings for each method
    4. Have a consistent, object-oriented interface
    """
    print("🚀 Demonstrating Discoverable API Features")
    print("=" * 50)
    
    try:
        # Connect to the WebSocket server
        print("\n1. Connecting to VS Code...")
        debrief.connect()
        print("✓ Connected successfully!")
        
        # Send a notification (most basic operation)
        print("\n2. Sending notification...")
        debrief.notify("🎯 API Discovery Demo: All methods discoverable via auto-complete!")
        print("✓ Notification sent!")
        
        # Demonstrate raw messaging capability
        print("\n3. Testing raw message capabilities...")
        response = debrief.send_raw_message("Discovery demo raw message")
        print(f"✓ Raw message response: {response}")
        
        # Show JSON protocol usage
        print("\n4. Testing JSON protocol...")
        json_response = debrief.send_json_message({
            "command": "notify", 
            "params": {"message": "JSON protocol works through discoverable API!"}
        })
        print(f"✓ JSON response: {json_response}")
        
        # Demonstrate plot manipulation methods (even if not fully implemented)
        print("\n5. Available plot manipulation methods:")
        plot_methods = [
            "get_feature_collection",
            "set_feature_collection", 
            "get_selected_features",
            "set_selected_features",
            "update_features",
            "add_features", 
            "delete_features",
            "zoom_to_selection"
        ]
        
        for method in plot_methods:
            if hasattr(debrief, method):
                method_obj = getattr(debrief, method)
                print(f"✓ {method}: {method_obj.__doc__.split('.')[0] if method_obj.__doc__ else 'Available'}")
        
        print(f"\n🎉 Developer Experience Benefits:")
        print("   • Single import: from debrief_api import debrief")
        print("   • Auto-completion shows all available methods")
        print("   • Consistent object-oriented interface")  
        print("   • Built-in documentation via docstrings")
        print("   • No need to memorize function names")
        
        debrief.notify("✅ API Discovery Demo Complete!")
        
    except DebriefAPIError as e:
        print(f"✗ API Error: {e}")
        if e.code:
            print(f"  Error code: {e.code}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")


def compare_old_vs_new_usage():
    """
    Show the difference between old function-based imports vs new object-based API.
    """
    print("\n" + "=" * 60)
    print("COMPARISON: Old vs New API Usage")
    print("=" * 60)
    
    print("""
OLD APPROACH (Function-based imports):
    from debrief_api import connect, notify, get_feature_collection, set_selected_features
    # Developer needs to know and import each function individually
    # No auto-completion for discovering available functions
    # Harder to explore the API
    
    connect()
    notify("Hello")
    features = get_feature_collection("plot.json")
    
NEW APPROACH (Object-based with discovery):
    from debrief_api import debrief
    # Single import, all methods discoverable via auto-completion
    # Type 'debrief.' and see all available methods
    # Better developer experience
    
    debrief.connect()
    debrief.notify("Hello") 
    features = debrief.get_feature_collection("plot.json")
    
BENEFITS:
✓ Single import reduces cognitive load
✓ Auto-completion enables API discovery  
✓ Consistent object-oriented interface
✓ Better IDE support and documentation
✓ Easier to explore and learn the API
""")


if __name__ == "__main__":
    demo_discoverable_api()
    compare_old_vs_new_usage()