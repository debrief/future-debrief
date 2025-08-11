# STAC Server Requirements v1.0

## 1. Purpose
This document defines the functional and technical requirements for the open source STAC Server to be used in the Debrief Replacement project.  
It integrates the agreed versioning model (**Stable Item ID + Versioned Asset Names**), with **Last N versions listed** in `assets` and **symlinks** for `@latest` aliases.

---

## 2. Core STAC Compliance
- Must comply with the [STAC 1.0.0 specification](https://stacspec.org/).
- Must support **Collections**, **Items**, and **Assets**.
- Must allow additional fields (`sys:*`, `prov:*`) within `properties`.

---

## 3. Collections
- **tracks.json** collection to store all maritime track data.
- Collection metadata to include:
  - Description
  - License
  - Keywords
  - Extents (spatial & temporal)
  - Links to `catalog.json`.

---

## 4. Items
### 4.1 Identity
- Each **Item `id`** is **stable** for a given track/serial.
- Example: `Bluefin-12`.

### 4.2 Versioning
- Assets named using a timestamp suffix:
  - `track@<ISO8601-compact>.geojson`  
    e.g., `track@2025-08-11T1112Z.geojson`
- All timestamps are in UTC.
- Additional assets (e.g., `thumbnail`, `summary`, `presentation`) use the **same timestamp**.
- `@latest` aliases point to the newest version.

### 4.3 History in `assets`
- List the **latest N** versions (config: `STAC_ASSET_HISTORY_MAX`).
- Each asset entry includes:
  - `type`
  - `roles`
  - `version` (timestamp string)
  - `latest` (boolean; true only for the newest version)

Example:
```json
"assets": {
  "track@2025-08-11T1112Z.geojson": {
    "type": "application/geo+json",
    "roles": ["data","track"],
    "version": "2025-08-11T11:12Z",
    "latest": true
  },
  "track@2025-08-10T0955Z.geojson": {
    "type": "application/geo+json",
    "roles": ["data","track"],
    "version": "2025-08-10T09:55Z"
  }
}
```

---

## 5. Assets & File Layout
### 5.1 Filesystem Layout
```
/stac/
  catalog.json
  collections/
    tracks.json
  items/tracks/Bluefin-12/
    item.json
    track@2025-08-11T1112Z.geojson
    track@2025-08-10T0955Z.geojson
    track@latest.geojson -> track@2025-08-11T1112Z.geojson   (symlink)
    thumbnail@latest.png -> thumbnail@2025-08-11T1112Z.png  (symlink)
    summary@2025-08-11T1112Z.csv
```

### 5.2 Symlinks
- Latest aliases implemented as **filesystem symlinks**.
- Config:
  - `STAC_USE_SYMLINKS=true`
  - `STAC_SYMLINK_FALLBACK="copy"` (for Windows or restricted environments).

---

## 6. Publish/Update Process
1. **Write new versioned assets**.
2. **Rotate @latest symlinks** to point to the new files.
3. **Update `item.json`**:
   - Insert newest into `assets`, keep at most N.
   - Mark newest as `"latest": true`.
   - Update mirrored `sys:*` and `prov:bundle`.
4. **Do not delete** older versioned assets; unlisted assets remain in storage.

---

## 7. System Fields
- **Mirrored in `properties`:**
  - `sys:state`
  - `sys:quality:completeness`
  - `sys:security:classification`
  - `prov:bundle`
- Updated automatically after successful publish.

---

## 8. Provenance
- In Item:  
  `properties["prov:bundle"] = "prov://<item-id>@<timestamp>"`
- In each asset's FeatureCollection:  
  `audit.prov` block contains provenance details for that version.

---

## 9. Retention & Archival
- **Local retention**: configurable max local copies (default: keep all).
- **Archival**: move older versions to cold storage if needed.
- **Immutability**: once published, assets are never overwritten.

---

## 10. Search & UI
- Item search returns one result per ID.
- Clients default to loading `@latest` assets.
- UI offers a history panel listing N recent versions from `assets`.
- Version comparison loads specific versioned assets side-by-side.

---

## 11. Error Handling
- **Idempotent publish**: same content hash → no new version.
- **Server timestamp** for version IDs (ignore client clock).
- **Rollback**: retry `item.json` update if asset write succeeds but item update fails.

---

## 12. Minimal Tests
1. Publish twice → two distinct versioned assets; latest rotates correctly.
2. Search returns one item; `@latest` resolves to newest file.
3. PROV bundle in item matches asset provenance.
4. Attempt to overwrite a versioned asset → blocked.
5. History listing obeys `STAC_ASSET_HISTORY_MAX`.
6. Symlink fallback works correctly on unsupported platforms.

---
**End of Document**
