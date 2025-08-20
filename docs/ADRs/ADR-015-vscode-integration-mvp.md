# ADR-015: VS Code Integration MVP: Custom Editor + Debrief Side Bar

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

Goal is to land a useful MVP quickly within VS Code desktop, with future web path.


## Decision

- Use a **Custom Editor** (Webview) for plot rendering.  
- Provide a **Debrief Side Bar** view container hosting Time Controller, Outline (by role with fallback heuristics), and Properties (inline edits).  
- **Renderer:** Leaflet for MVP.  
- **Basemap:** remote tiles initially (local/offline tiles later).  
- **State:** hybrid model with shared state in the extension and transient `postMessage` events between views.


## Consequences

- Fast path to value with clear upgrade path.
- Offline basemap support deferred.


## Alternatives Considered

- Full native editor integration only.
- MapLibre/deck.gl from day one (heavier).


## References
-
