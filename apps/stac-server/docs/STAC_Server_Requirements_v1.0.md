# STAC Server Requirements – Debrief Replacement

This document describes **all known requirements** for the STAC Server component within the Debrief Replacement architecture, incorporating earlier design decisions and new requirements identified in the August 2025 interview process.

---

## 1. Purpose and Scope
The STAC (SpatioTemporal Asset Catalog) Server will act as the metadata and discovery layer for geospatial datasets (primarily track data), enabling analysts and automated processes to search, preview, and retrieve relevant datasets. It will not itself perform analysis but will be a key integration point between data producers, analysts, and visualisation tools.

It must support both **standalone offline deployments** and **networked multi-user deployments**.

---

## 2. Deployment Model
- Support two distinct deployment modes:
  1. **Static file-based** – No API, portable, OS-level access control, suitable for air-gapped transfer or secure standalone operation.
  2. **REST API server** – For large shared repositories, centralised query, and integration with other services.
- These are **separate deployment modes**, not a single dual-mode build.

---

## 3. Authentication
- Pluggable authentication backend, allowing organisation-level choice:
  - No authentication (network/perimeter secured)
  - Simple API token / username-password
  - MOD identity system integration (e.g., SSO, MODNET)

---

## 4. Data Storage and Structure
- **STAC-compliant** JSON metadata.
- Local static mode:
  - Organised hierarchy: `Year` > `Exercise` > `Serial`.
  - One GeoJSON FeatureCollection per serial.
  - Corresponding `item.json` contains a single `asset` referencing that GeoJSON file.
  - Optionally store preview thumbnails and exported presentations as additional assets.
- REST API mode:
  - Same logical data structure, but assets stored in a central database or object store.
- Allow hosting of both local and externally linked datasets.

---

## 5. Metadata and Asset Requirements
- All items must include:
  - STAC core fields (id, type, geometry, bbox, properties, assets, links).
  - Temporal extent and spatial extent.
  - Links to source files and/or derived assets.
  - **Georeferenced thumbnails** for quick preview in map-based interfaces.
- Support inclusion of **system tags** (representing state in business workflows, controlled via events not direct edits) and **user tags** (personal, team, or organisation level).

---

## 6. Search Features
- Standard STAC search parameters:
  - Bounding box (spatial filter).
  - Datetime range (temporal filter).
- Tag-based filtering:
  - Filter by **system tags** (business process state).
  - Filter by **user tags** (collaboration, categorisation, custom workflows).

---

## 7. Spatial Services Integration
- The STAC server will remain a **metadata/discovery-only service**.
- No built-in WMS/WFS/tile services.
- For rich spatial rendering, external servers such as GeoServer or pygeoapi will be linked.
- **Georeferenced thumbnails** will be used for quick preview without requiring full dataset rendering.

---

## 8. External Dataset Linking
- Ability to reference external datasets (remote STAC items or other file-based locations).
- No caching or mirroring required by default.
- Local storage of **preview thumbnails** is allowed for quick lookups.

---

## 9. Interoperability and Standards
- Must conform to:
  - STAC core specification.
  - STAC API specification (for REST mode).
  - STAC extensions where appropriate (e.g., `proj`, `eo`, `datetime`).
- Support open geospatial standards to ease integration with UK MOD, NATO, and industry tools.

---

## 10. Security and Access Control
- In static mode, rely on OS-level access controls.
- In REST mode:
  - Enforce authentication and role-based access control.
  - Support read-only and read/write permissions at dataset or collection level.

---

## 11. Performance
- Static mode: Instant metadata retrieval from local disk.
- REST mode: Indexed search for bounding box, datetime, and tag queries.
- Capable of handling **large repositories** (100k+ items).

---

## 12. Resilience and Portability
- Static deployments must be easily copied between systems or networks.
- REST deployments must support backup/restore.

---

## 13. Administration
- CLI or admin API for:
  - Adding/removing datasets.
  - Regenerating thumbnails.
  - Managing tags and metadata updates.
- Automated STAC indexer service (optional) to generate metadata from incoming datasets.

---

**Document Status:** v1.1 – Includes August 2025 interview requirements.
