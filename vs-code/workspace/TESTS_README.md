# WebSocket Bridge Tests

The Python test files for the Debrief WebSocket Bridge have been moved to the `tests/` subfolder for better organization.

## Quick Start

```bash
cd tests
pip install -r requirements.txt
python test_integration.py
```

See `tests/WEBSOCKET_BRIDGE_TESTS.md` for complete documentation.

## Test Structure

- `tests/debrief_api.py` - Python client API
- `tests/test_*.py` - Individual test files
- `tests/test_integration.py` - Complete test suite (recommended)
- `tests/requirements.txt` - Python dependencies
- `tests/WEBSOCKET_BRIDGE_TESTS.md` - Full documentation