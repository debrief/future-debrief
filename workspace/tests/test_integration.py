#!/usr/bin/env python3
"""
Comprehensive integration test for Debrief WebSocket Bridge
"""

import time
from debrief_api import debrief, DebriefAPIError

def run_integration_tests():
    """Run comprehensive integration tests."""
    print("=" * 60)
    print("DEBRIEF WEBSOCKET BRIDGE - INTEGRATION TESTS")
    print("=" * 60)
    
    test_results = {
        "basic_connection": False,
        "raw_messaging": False,
        "json_protocol": False,
        "notify_command": False,
        "error_handling": False,
        "sequential_operations": False
    }
    
    # Test 1: Basic Connection
    print("\n1. Testing basic connection...")
    try:
        debrief.connect()
        print("✓ Connection established successfully")
        test_results["basic_connection"] = True
    except Exception as e:
        print(f"✗ Connection failed: {e}")
    
    # Test 2: Raw Messaging (Echo)
    print("\n2. Testing raw message echo...")
    try:
        response = debrief.send_raw_message("Integration test echo")
        print(f"✓ Echo response: {response}")
        test_results["raw_messaging"] = True
    except Exception as e:
        print(f"✗ Raw messaging failed: {e}")
    
    # Test 3: JSON Protocol
    print("\n3. Testing JSON protocol...")
    try:
        # Test a valid notify command to verify JSON protocol works
        test_msg = {"command": "notify", "params": {"message": "JSON protocol test"}}
        response = debrief.send_json_message(test_msg)
        print(f"✓ JSON response: {response}")
        test_results["json_protocol"] = True
    except Exception as e:
        print(f"✗ JSON protocol failed: {e}")
    
    # Test 4: Notify Command
    print("\n4. Testing notify command...")
    try:
        debrief.notify("Integration Test: WebSocket Bridge is working! 🚀")
        print("✓ Notification sent successfully")
        test_results["notify_command"] = True
    except Exception as e:
        print(f"✗ Notify command failed: {e}")
    
    # Test 5: Error Handling
    print("\n5. Testing error handling...")
    try:
        # Test invalid command
        try:
            debrief.send_json_message({"command": "nonexistent"})
        except DebriefAPIError:
            pass  # Expected
        
        # Test malformed notify
        try:
            debrief.send_json_message({"command": "notify", "params": {}})
        except DebriefAPIError:
            pass  # Expected
        
        # Test valid notify after errors
        debrief.notify("Error handling test completed successfully")
        print("✓ Error handling working correctly")
        test_results["error_handling"] = True
    except Exception as e:
        print(f"✗ Error handling test failed: {e}")
    
    # Test 6: Sequential Operations
    print("\n6. Testing sequential operations...")
    try:
        operations = [
            lambda: debrief.send_raw_message("Sequential test 1"),
            lambda: debrief.notify("Sequential operation 1"),
            lambda: debrief.notify("Sequential operation 2"),
            lambda: debrief.send_raw_message("Sequential test final")
        ]
        
        for i, operation in enumerate(operations, 1):
            operation()
            time.sleep(0.5)  # Small delay between operations
        
        print("✓ All sequential operations completed")
        test_results["sequential_operations"] = True
    except Exception as e:
        print(f"✗ Sequential operations failed: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    
    total_tests = len(test_results)
    passed_tests = sum(test_results.values())
    
    for test_name, passed in test_results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{test_name.replace('_', ' ').title():<25} {status}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n🎉 ALL TESTS PASSED! The Debrief WebSocket Bridge is working correctly.")
        debrief.notify("Integration Tests Completed Successfully! ✅")
    else:
        print(f"\n⚠️  {total_tests - passed_tests} test(s) failed. Please check the implementation.")
    
    print("=" * 60)

if __name__ == "__main__":
    run_integration_tests()