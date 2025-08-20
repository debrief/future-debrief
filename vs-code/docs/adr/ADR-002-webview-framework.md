# ADR-002: Use React + Leaflet for WebView frontend

## Status
Accepted

## Context
The editor WebView needs to show a dynamic map, support annotations, and interactivity. We need a framework that supports fast development and testability.

## Decision
We chose to use React + TypeScript with `react-leaflet` for map rendering.

## Consequences
- Clear component structure for map, overlays, and toolbars
- Compatible with future web-based deployments
- Build tooling required (e.g., Webpack or Vite)