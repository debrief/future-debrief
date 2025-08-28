# APM Task Assignment: Debrief WebSocket Bridge - Complete Implementation

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Debrief VS Code Extension project.

**Your Role:** You will execute the assigned task diligently, implementing the complete WebSocket bridge infrastructure with all supported commands as defined in the design document. Your work must be thorough, well-documented, and follow established architectural patterns.

**Workflow:** You will work independently on this task and report back to the Manager Agent (via the User) upon completion. All work must be logged comprehensively in the Memory Bank for future reference and project continuity.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to implementing the complete WebSocket bridge infrastructure as detailed in `docs/debrief_ws_bridge.md`, including all 9 supported commands for full Python-VS Code integration.

**Objective:** Implement a WebSocket-based bridge between Python scripts and the Debrief VS Code extension, supporting all commands defined in the design document: `get_feature_collection`, `set_feature_collection`, `get_selected_features`, `set_selected_features`, `update_features`, `add_features`, `delete_features`, `zoom_to_selection`, and `notify`.

**Detailed Action Steps (Phased Implementation for Incremental Testing):**

### Phase 1: Foundation Infrastructure

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

3. **Implement JSON Message Protocol:**
   - Add JSON message parsing to the WebSocket server
   - Support the message structure: `{ "command": "<command_name>", "params": { ... } }`
   - Return structured JSON responses: `{ "result": <data> }` for success
   - Handle errors with: `{ "error": { "message": "error description", "code": number } }`
   - Update Python client to send/receive JSON messages
   - Guidance: Validate message structure before processing to ensure robustness
   - **Test Milestone:** JSON message exchange working

4. **Add Connection Management and Error Handling:**
   - Implement proper connection error handling in both server and client
   - Add auto-reconnect capability to Python client with exponential backoff
   - Define `DebriefAPIError` exception class for Python error handling
   - Add singleton connection management in Python client
   - Handle connection cleanup on script exit where possible
   - **Test Milestone:** System handles connection failures gracefully

### Phase 2: Core Commands Implementation

5. **Implement Notify Command:**
   - Add notify command processing to the WebSocket server
   - Display VS Code notifications using the `vscode.window.showInformationMessage()` API
   - Add `notify(message: str)` function to Python client
   - **Test Milestone:** Python `notify()` displays VS Code notifications

6. **Implement Feature Collection Commands:**
   - Add `get_feature_collection(filename: str)` - retrieve full plot data as FeatureCollection
   - Add `set_feature_collection(filename: str, data: dict)` - replace entire plot with new FeatureCollection
   - Implement file validation and error handling for non-existent files
   - Guidance: Integrate with existing GeoJSON file handling in the extension
   - **Test Milestone:** Can retrieve and replace full plot data

7. **Implement Selection Management Commands:**
   - Add `get_selected_features(filename: str)` - get currently selected features as Feature array
   - Add `set_selected_features(filename: str, ids: list[str])` - change selection (empty list clears selection)
   - Implement proper feature ID validation and selection state management
   - Guidance: Integrate with existing feature selection mechanisms in the extension
   - **Test Milestone:** Can query and modify feature selections

8. **Implement Feature Modification Commands:**
   - Add `update_features(filename: str, features: list[dict])` - replace features by ID
   - Add `add_features(filename: str, features: list[dict])` - add new features with auto-generated IDs
   - Add `delete_features(filename: str, ids: list[str])` - remove features by ID
   - Implement proper ID generation and collision handling for new features
   - Guidance: Ensure feature updates reflect immediately in the UI
   - **Test Milestone:** Can add, update, and delete individual features

9. **Implement View Control Commands:**
   - Add `zoom_to_selection(filename: str)` - adjust map view to fit selected features
   - Integrate with existing map view controls and coordinate transformation
   - Handle edge cases (no selection, invalid bounds)
   - **Test Milestone:** Map view responds to selection changes

### Phase 3: Integration and Polish

10. **Complete Extension Integration:**
    - Register WebSocket server startup in extension activation
    - Add proper cleanup in extension deactivation
    - Integrate with existing extension architecture patterns
    - Ensure no conflicts with existing extension functionality
    - Add comprehensive logging for debugging and monitoring

11. **Implement Advanced Error Handling:**
    - Add specific error codes for different failure modes (file not found, invalid data, etc.)
    - Implement timeout handling for long-running operations
    - Add input validation for all command parameters
    - Create comprehensive error documentation

12. **Complete Python API Implementation:**
    - Implement all Python client functions matching the design specification
    - Add proper type hints and docstrings for all functions
    - Implement context managers for connection handling
    - Add utility functions for common GeoJSON operations

**Provide Necessary Context/Assets:**
- Review existing extension activation/deactivation patterns in the codebase
- Examine current GeoJSON file handling and feature management in the extension
- Study existing map view controls and coordinate transformation systems
- Reference the complete API design in `docs/debrief_ws_bridge.md` for all command specifications
- Examine current feature selection mechanisms and UI state management
- Ensure WebSocket implementation follows Node.js best practices for VS Code extensions
- Study existing error handling patterns in the extension for consistency
- Review any existing Python integration patterns or utilities in the codebase

## 3. Expected Output & Deliverables

**Define Success:** The implementation is successful when:
- WebSocket server starts automatically on extension activation and handles all 9 commands
- All Python API functions work correctly: `get_feature_collection`, `set_feature_collection`, `get_selected_features`, `set_selected_features`, `update_features`, `add_features`, `delete_features`, `zoom_to_selection`, and `notify`
- Feature modifications reflect immediately in the VS Code UI
- Selection changes are bidirectionally synchronized between Python and VS Code
- Map view responds correctly to `zoom_to_selection` commands
- Connection management handles failures gracefully with auto-reconnect
- Comprehensive error handling with specific error codes for different failure modes
- All commands support proper input validation and error reporting

**Specify Deliverables:**
- Complete WebSocket server implementation in TypeScript supporting all 9 commands
- Full Python client module (`debrief_api.py`) with all API functions and `DebriefAPIError` class
- Extension activation/deactivation integration code with proper lifecycle management
- Message handling infrastructure supporting the complete JSON protocol
- Integration with existing GeoJSON file handling and feature management systems
- Integration with existing map view controls and selection mechanisms
- Connection management with auto-reconnect capability and singleton pattern
- Comprehensive error handling with specific error codes and clear error messages
- Type definitions and documentation for all API functions
- Input validation for all command parameters

**Format:** All code must follow the existing project's TypeScript and Python coding standards. TypeScript code should integrate with existing extension architecture patterns.

## 4. Incremental Testing Validation

Your implementation should be validated at each phase milestone:

### Phase 1 Testing (Foundation)

**After Steps 1-2 (Basic Connection):**
```python
# Test basic connection establishment
from debrief_api import connect, send_raw_message
connect()
send_raw_message("test")  # Should echo back
```

**After Step 3 (JSON Protocol):**
```python
# Test JSON message exchange
from debrief_api import send_json_message
response = send_json_message({"test": "message"})
print(response)  # Should receive JSON response
```

**After Step 4 (Connection Management):**
```python
# Test error handling and reconnection
from debrief_api import DebriefAPIError
# Test connection resilience by stopping/starting VS Code
```

### Phase 2 Testing (Core Commands)

**After Step 5 (Notify Command):**
```python
# Test notify functionality
from debrief_api import notify
notify("Hello from Python!")  # Should show VS Code notification
```

**After Step 6 (Feature Collection Commands):**
```python
# Test feature collection operations
from debrief_api import get_feature_collection, set_feature_collection
fc = get_feature_collection("test.geojson")  # Should return FeatureCollection
set_feature_collection("test.geojson", fc)  # Should update plot
```

**After Step 7 (Selection Management):**
```python
# Test selection operations
from debrief_api import get_selected_features, set_selected_features
selected = get_selected_features("test.geojson")
set_selected_features("test.geojson", ["feature_id_1"])  # Should update selection in UI
```

**After Step 8 (Feature Modification):**
```python
# Test feature modification operations
from debrief_api import add_features, update_features, delete_features
new_feature = {"type": "Feature", "geometry": {...}, "properties": {...}}
add_features("test.geojson", [new_feature])  # Should add to plot
update_features("test.geojson", [modified_feature])  # Should update in plot
delete_features("test.geojson", ["feature_id"])  # Should remove from plot
```

**After Step 9 (View Control):**
```python
# Test view control operations
from debrief_api import zoom_to_selection
set_selected_features("test.geojson", ["feature_id_1"])
zoom_to_selection("test.geojson")  # Should adjust map view
```

### Phase 3 Testing (Integration)

**Complete Integration Tests:**
- Test auto-connection on first use
- Test reconnection after VS Code restart
- Verify cleanup on script exit
- Test all commands with various error conditions
- Test concurrent operations and command sequencing
- Validate error codes and messages match specification
- Test with multiple GeoJSON files simultaneously
- Verify UI updates are immediate and correct for all operations

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the complete Debrief WebSocket Bridge Implementation task
- A clear description of the full WebSocket infrastructure implemented with all 9 commands
- Key code snippets for both TypeScript server and Python client implementations
- Architectural decisions made regarding feature management, selection synchronization, and view control integration
- Any challenges encountered during integration with existing extension systems
- Confirmation of successful execution with test results demonstrating all commands
- Integration points with existing GeoJSON handling, feature selection, and map view systems
- Performance considerations and connection management strategies
- Error handling patterns and validation approaches implemented

Reference the [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md) for detailed formatting requirements.

## 6. Architecture Considerations

**WebSocket Port Management:** Use port `60123` as specified in the design document, but implement port conflict detection and fallback options if needed.

**Extension Lifecycle:** Ensure proper WebSocket server lifecycle management within the VS Code extension activation/deactivation cycle.

**Feature Management Integration:** Integrate deeply with existing GeoJSON file handling, feature selection mechanisms, and map view controls. Ensure all operations maintain consistency with the existing UI state.

**State Synchronization:** Implement bidirectional synchronization between Python operations and VS Code UI state. Feature modifications, selection changes, and view updates must be immediately reflected in the interface.

**Performance Optimization:** Consider performance implications of large feature collections and implement appropriate chunking or streaming for large datasets.

**Error Handling Strategy:** Implement comprehensive error handling with specific error codes for different failure modes (file not found: 404, invalid data: 400, server error: 500, etc.).

**Security:** Implement robust input validation for all command parameters, especially for GeoJSON data structures and file paths. Prevent malformed JSON or invalid data from causing system instability.

**Extensibility:** Structure the command handling system to easily support future commands while maintaining backward compatibility with the current API.

**Connection Management:** Implement singleton connection pattern in Python client with automatic reconnection and graceful degradation when VS Code is not available.

## 7. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- Integration points with existing VS Code extension architecture and GeoJSON handling systems
- Current feature selection and map view control mechanisms in the extension
- Preferred WebSocket library choices for both TypeScript and Python
- Error handling and logging preferences, including specific error code conventions
- Testing methodology and validation requirements for all 9 commands
- Performance considerations for large feature collections
- State synchronization requirements between Python operations and VS Code UI
- Port management and conflict resolution strategies
- Data validation and security requirements for GeoJSON input
- Integration with existing extension activation/deactivation patterns