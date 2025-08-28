# APM Task Assignment: Debrief WebSocket Bridge - Notify Command Implementation

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Debrief VS Code Extension project.

**Your Role:** You will execute the assigned task diligently, implementing the initial WebSocket bridge infrastructure with the `notify` command as the first supported operation. Your work must be thorough, well-documented, and follow established architectural patterns.

**Workflow:** You will work independently on this task and report back to the Manager Agent (via the User) upon completion. All work must be logged comprehensively in the Memory Bank for future reference and project continuity.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to implementing the initial WebSocket bridge infrastructure as detailed in `docs/debrief_ws_bridge.md`, focusing specifically on the `notify` command as the first supported operation.

**Objective:** Implement a WebSocket-based bridge between Python scripts and the Debrief VS Code extension, starting with support for the `notify` command that displays VS Code notifications from Python code.

**Detailed Action Steps (Ordered for Maximum Early Testing):**

1. **Create Basic WebSocket Server in VS Code Extension:**
   - Create a minimal WebSocket server that starts on extension activation
   - Use fixed port `ws://localhost:60123` as specified in the design document
   - Implement basic connection acceptance and logging
   - Add simple echo functionality to test connectivity
   - Guidance: Use the `ws` library for WebSocket implementation in Node.js
   - **Test Milestone:** Server starts and accepts connections

2. **Create Basic Python Client Module:**
   - Create minimal `debrief_api.py` with basic WebSocket connection capability
   - Implement simple connection function that connects to `localhost:60123`
   - Add basic message sending capability (no specific commands yet)
   - Include connection status logging for debugging
   - Guidance: Use the `websockets` library for Python WebSocket client implementation
   - **Test Milestone:** Python can connect to VS Code WebSocket server

3. **Test Initial Connection and Communication:**
   - Verify Python client can establish connection to VS Code server
   - Test basic message exchange (echo test)
   - Validate WebSocket communication is working end-to-end
   - Debug any connection issues before proceeding
   - **Critical Checkpoint:** Full bidirectional communication working

4. **Implement JSON Message Protocol:**
   - Add JSON message parsing to the WebSocket server
   - Support the message structure: `{ "command": "notify", "params": { "message": "str" } }`
   - Return structured JSON responses: `{ "result": null }` for success
   - Handle errors with: `{ "error": { "message": "error description", "code": number } }`
   - Update Python client to send/receive JSON messages
   - Guidance: Validate message structure before processing to ensure robustness
   - **Test Milestone:** JSON message exchange working

5. **Implement Notify Command Handler:**
   - Add notify command processing to the WebSocket server
   - Display VS Code notifications using the `vscode.window.showInformationMessage()` API
   - Extract message parameter from command params and display it
   - Return success response or appropriate error response
   - Add `notify(message: str)` function to Python client
   - Guidance: Ensure proper error handling for malformed messages or missing parameters
   - **Test Milestone:** Python `notify()` displays VS Code notifications

6. **Add Robust Error Handling and Connection Management:**
   - Implement proper connection error handling in both server and client
   - Add auto-reconnect capability to Python client with exponential backoff
   - Define `DebriefAPIError` exception class for Python error handling
   - Add singleton connection management in Python client
   - Handle connection cleanup on script exit where possible
   - **Test Milestone:** System handles connection failures gracefully

7. **Complete Extension Integration:**
   - Register WebSocket server startup in extension activation
   - Add proper cleanup in extension deactivation
   - Integrate with existing extension architecture patterns
   - Ensure no conflicts with existing extension functionality
   - Add logging for debugging and monitoring

**Provide Necessary Context/Assets:**
- Review existing extension activation/deactivation patterns in the codebase
- Examine current VS Code API usage for notifications and messaging
- Reference the complete API design in `docs/debrief_ws_bridge.md` for future extensibility
- Ensure WebSocket implementation follows Node.js best practices for VS Code extensions

## 3. Expected Output & Deliverables

**Define Success:** The implementation is successful when:
- WebSocket server starts automatically on extension activation
- Python `notify()` function successfully displays VS Code notifications
- Connection management handles failures gracefully with auto-reconnect
- Error handling provides clear feedback for debugging
- The foundation is established for adding additional commands in the future

**Specify Deliverables:**
- WebSocket server implementation in TypeScript for the VS Code extension
- Python client module (`debrief_api.py`) with `notify()` function and `DebriefAPIError` class
- Extension activation/deactivation integration code
- Message handling infrastructure supporting the defined JSON protocol
- Connection management with auto-reconnect capability
- Basic error handling and logging for debugging

**Format:** All code must follow the existing project's TypeScript and Python coding standards. TypeScript code should integrate with existing extension architecture patterns.

## 4. Incremental Testing Validation

Your implementation should be validated at each milestone:

**After Steps 1-2 (Basic Connection):**
```python
# Test basic connection establishment
from debrief_api import connect, send_raw_message
connect()
send_raw_message("test")  # Should echo back
```

**After Step 4 (JSON Protocol):**
```python
# Test JSON message exchange
from debrief_api import send_json_message
response = send_json_message({"test": "message"})
print(response)  # Should receive JSON response
```

**After Step 5 (Notify Command):**
```python
# Test notify functionality
from debrief_api import notify
notify("Hello from Python!")  # Should show VS Code notification
```

**After Step 6 (Error Handling):**
```python
# Test error handling and reconnection
from debrief_api import notify, DebriefAPIError
try:
    notify("Test message")
except DebriefAPIError as e:
    print(f"Error: {e}")
```

**Final Integration Test:**
- Test auto-connection on first use
- Test reconnection after VS Code restart  
- Verify cleanup on script exit
- Test multiple sequential notify calls

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the Debrief WebSocket Bridge - Notify Command Implementation task
- A clear description of the WebSocket infrastructure implemented
- Key code snippets for both TypeScript server and Python client
- Any architectural decisions made or challenges encountered
- Confirmation of successful execution with test results demonstrating the notify command
- Integration points with existing extension functionality

Reference the [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md) for detailed formatting requirements.

## 6. Architecture Considerations

**WebSocket Port Management:** Use port `60123` as specified in the design document, but implement port conflict detection and fallback options if needed.

**Extension Lifecycle:** Ensure proper WebSocket server lifecycle management within the VS Code extension activation/deactivation cycle.

**Future Extensibility:** Structure the message handling system to easily support additional commands like `get_feature_collection`, `set_selected_features`, etc., as outlined in the complete API design.

**Security:** Implement basic validation to prevent malformed JSON from causing issues, but authentication is not required for the initial implementation.

## 7. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- Integration points with existing VS Code extension architecture
- Preferred WebSocket library choices for both TypeScript and Python
- Error handling and logging preferences
- Testing methodology and validation requirements
- Port management and conflict resolution strategies