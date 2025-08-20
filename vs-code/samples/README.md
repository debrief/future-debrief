# Sample Debrief Plot Files

This directory contains sample `.plot.json` files for testing and demonstrating the Debrief VS Code extension's custom editor functionality.

## Files

- **`sample.plot.json`** - Comprehensive example with multiple tracks, events, and settings
- **`simple.plot.json`** - Minimal example with a single aircraft track
- **`invalid-json.plot.json`** - Example with invalid JSON to test error handling
- **`track.plot.json`** - Example with complex GeoJSON FC

## Usage

1. Open VS Code in the extension development environment
2. Open any `.plot.json` file from this directory
3. The file should automatically open in the **Debrief Plot Editor**
4. Test theme switching (light/dark mode) to verify styling consistency
5. Try editing the invalid JSON file to see error handling in action

## File Format

The `.plot.json` format is designed for debrief analysis and typically includes:

- **metadata**: File creation info and author details  
- **data.tracks**: Array of position/movement data over time
- **data.events**: Timeline events and alerts
- **settings**: Display and analysis configuration options

The custom editor provides:
- Syntax-highlighted JSON display
- Real-time updates as you edit
- Error handling for malformed JSON
- Theme-aware styling that matches VS Code's appearance