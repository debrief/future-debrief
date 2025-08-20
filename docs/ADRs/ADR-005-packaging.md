# ADR-005: Packaging & Distribution Strategy

## Context
End users (analysts, MOD/NATO) require simple installation in both connected and air-gapped environments.

## Decision
- Produce **artifact bundles (zip/tar)** containing npm tgz, PyPI wheels, VSIX, and schemas.  
- Provide a **Debrief Workbench build**: branded VS Code with extensions and Python tools preinstalled.  
- Distribute via **file-share only** in offline environments.

## Rationale
- Simple delivery for analysts without registry infrastructure.
- Bundled artifacts enable reproducibility and provenance.
- Workbench build ensures consistent environment across deployments.

## Consequences
- Requires bundle preparation pipeline.  
- Analysts do not need to install dependencies individually.  
- Limited automatic updates; updates delivered via new bundles.
