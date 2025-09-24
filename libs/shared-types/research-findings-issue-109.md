# JSON Schema Documentation Generator Research Results

Based on comprehensive analysis of the Future Debrief maritime platform requirements, here are my findings and recommendation:

## Architecture Analysis Summary
The `libs/shared-types` package has:
- **46 maritime-specific JSON schemas** across features/, states/, and tools/ directories
- **Pydantic-first generation** with complex nested maritime data (tracks, points, annotations, zones)
- **Conditional build system** optimized for performance (<2s target)
- **Tool Vault .pyz packaging** requiring self-contained HTML outputs

## Documentation Generator Comparison Matrix

| Tool | Performance | Offline Support | Integration Complexity | Maritime Schema Support | Recommendation |
|------|-------------|----------------|----------------------|------------------------|----------------|
| **json-schema-for-humans** | ⭐⭐⭐⭐⭐ (1-2s) | ⭐⭐⭐⭐⭐ (js_offline) | ⭐⭐⭐⭐⭐ (Simple pip) | ⭐⭐⭐⭐⭐ (Complex nested) | **BEST CHOICE** |
| docusaurus-json-schema-plugin | ⭐⭐⭐ (3-5s) | ⭐⭐⭐ (React bundle) | ⭐⭐ (Heavy infra) | ⭐⭐⭐⭐ (Interactive) | Too heavy for .pyz |
| @apidevtools + Custom HTML | ⭐⭐⭐⭐ (Fast) | ⭐⭐⭐⭐⭐ (Custom) | ⭐ (High dev cost) | ⭐⭐⭐ (Custom work) | Too much dev work |
| redoc-cli | ⭐⭐⭐⭐ (Fast) | ⭐⭐⭐⭐ (Self-contained) | ⭐⭐ (OpenAPI focus) | ⭐ (Wrong use case) | Poor fit |
| json-schema-static-docs | ⭐⭐⭐⭐ (Fast) | ⭐⭐⭐⭐ (Markdown) | ⭐⭐⭐⭐ (Simple npm) | ⭐⭐ (Basic output) | Limited interactivity |

## Recommended Solution: json-schema-for-humans

### Why this is the optimal choice:

**1. Perfect Technical Fit:**
- `js_offline` template creates fully self-contained HTML (no CDN dependencies)
- ~1-2 second build time addition (meets <2s target)
- Works completely offline for Tool Vault .pyz packaging
- Simple Python pip installation integrates cleanly with existing build system

**2. Excellent Maritime Domain Support:**
- Handles complex nested maritime schemas (tracks with coordinates, points with properties, annotation hierarchies)
- Professional, interactive documentation with expandable sections
- Direct anchor linking for schema navigation
- Clear visualization of discriminated unions (`dataType` patterns)

**3. Integration Path:**
```makefile
# Add to Makefile in libs/shared-types
generate-docs:
    pip install json-schema-for-humans
    generate-schema-doc derived/json-schema/ docs/html/ --config template=js_offline
```

**4. Sample Output Features:**
- Interactive collapsible schema sections
- Type definitions with examples
- Property descriptions and constraints
- Reference linking between related schemas
- Search functionality within documentation

## Alternative Options Considered:

**docusaurus-json-schema-plugin**: Excellent for comprehensive documentation sites but requires full Docusaurus infrastructure (too heavy for .pyz packaging)

**Custom Solution**: Maximum flexibility but requires significant development time for HTML generation

**redoc-cli**: Beautiful output but designed for OpenAPI/Swagger, not JSON Schema

## Next Steps:
1. **Decision needed**: Approve json-schema-for-humans as the chosen generator
2. **Implementation**: Integrate with existing conditional build system
3. **Examples**: Create TypeScript/Python usage examples for maritime schemas
4. **Testing**: Verify Tool Vault .pyz packaging compatibility

---
*Research completed as part of GitHub Issue #109 - Generate interactive HTML documentation for JSON schemas*