# Debrief WebSocket Bridge Tests

This folder contains test scripts for the Debrief WebSocket Bridge implementation.

## Setup

1. Navigate to the tests directory:
   ```bash
   cd workspace/tests
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the VS Code extension (F5) which will automatically start the WebSocket server on `localhost:60123`

## Test Files

- `debrief_api.py` - Main Python client API for the WebSocket bridge
- `test_basic_connection.py` - Test basic WebSocket connection and echo functionality
- `test_json_protocol.py` - Test JSON message protocol
- `test_notify_command.py` - Test the notify command (displays VS Code notifications)
- `test_error_handling.py` - Test error handling and malformed requests
- `test_integration.py` - Comprehensive integration test of all functionality

## Running Tests

### Quick Test (Recommended)
```bash
python test_integration.py
```
This runs all tests in sequence and provides a comprehensive report.

### Individual Tests
```bash
python test_basic_connection.py    # Test connectivity
python test_notify_command.py      # Test notifications
python test_error_handling.py      # Test error scenarios
```

## Expected Behavior

- **Connection Tests**: Should connect to the WebSocket server automatically
- **Notify Tests**: Should display VS Code notifications when run
- **Error Tests**: Should handle malformed requests gracefully
- **Integration Test**: Should show a complete test report with all functionality working

## API Usage Example

```python
from debrief_api import notify, DebriefAPIError

try:
    notify("Hello from Python!")
    print("Notification sent successfully!")
except DebriefAPIError as e:
    print(f"Error: {e}")
```

## Troubleshooting

- Ensure the VS Code extension is running before running Python tests
- Check that port 60123 is not being used by another application
- Install websocket-client library: `pip install websocket-client`