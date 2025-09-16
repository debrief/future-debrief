# Pydantic Migration Plan for shared-types

## Overview

This document outlines the plan to migrate Python type generation in `@debrief/shared-types` from quicktype to Pydantic models. This migration will enable clean model inheritance, better validation, and automatic JSON Schema generation.

## Current System Analysis

### TypeScript Generation
- **Tool**: `json-schema-to-typescript`
- **Output**: Proper TypeScript interfaces with discriminated unions
- **Status**: Working well, no changes needed

### Python Generation
- **Tool**: `quicktype`
- **Output**: Regular Python classes with `from_dict()` methods
- **Limitations**:
  - No inheritance support for model extension
  - No built-in validation
  - No automatic JSON Schema generation
  - Classes don't reference source schemas

### Build System
- **15 Schema Files**: Features (4), States (5), Tools (6)
- **Sophisticated Makefile**: Conditional builds, parallel generation
- **Class Mappings**: Explicit top-level class name mappings

## Migration Strategy

### Phase 1: Create Pydantic Generator (Replace quicktype)

**Goal**: Replace quicktype with a Pydantic-based generator

**Tool Selection**: `datamodel-code-generator`
- Mature library specifically for Pydantic from JSON Schema
- Actively maintained with good JSON Schema support
- Generates clean Pydantic v2 models
- Supports complex schema features (oneOf, allOf, $ref)

**Alternative Considered**: Custom generator using `pydantic-core`, but datamodel-code-generator is battle-tested.

### Phase 2: Update Build System

**Makefile Changes**:
```makefile
# Current quicktype command:
quicktype -s schema "$$schema" -o "$$output" --lang python --top-level "$$class_name"

# New datamodel-codegen command:
datamodel-codegen --input "$$schema" --output "$$output" --target-python-version 3.9 \
  --class-name "$$class_name" --use-schema-description --use-field-description
```

**Dependencies**:
- Add `datamodel-code-generator>=0.25.0` to requirements.txt
- Add `pydantic>=2.0.0` as core dependency
- Update pyproject.toml with new dependencies

### Phase 3: Generate Pure Pydantic Models

**No Backward Compatibility Needed**: Since we're not in production, we can generate clean Pydantic models:

```python
from pydantic import BaseModel
from typing import Dict, Any, Union, List

class TrackProperties(BaseModel):
    dataType: Literal["track"]
    timestamps: Optional[List[str]] = None
    name: Optional[str] = None
    description: Optional[str] = None

class TrackFeature(BaseModel):
    type: Literal["Feature"]
    id: Union[str, int]
    geometry: Dict[str, Any]  # LineString or MultiLineString
    properties: TrackProperties
```

### Phase 4: Enable Clean Inheritance

**The Goal**: Make this possible in tool-vault-packager:

```python
# Before (current workaround with validation wrapper):
class TrackFeatureWithSpeeds(BaseModel):
    track_data: Dict[str, Any] = Field(...)
    _validated_track: Optional[TrackFeature] = None
    # ... complex validation logic

# After (clean inheritance):
class TrackPropertiesWithSpeeds(TrackProperties):
    speeds: List[float] = Field(min_length=1)

class TrackFeatureWithSpeeds(TrackFeature):
    properties: TrackPropertiesWithSpeeds
```

## Detailed Implementation Steps

### Step 1: Install and Test Generator

```bash
# Install datamodel-code-generator
pip install 'datamodel-code-generator[http]>=0.25.0'

# Test on single schema
datamodel-codegen --input schemas/features/Track.schema.json \
  --output test_track.py --target-python-version 3.9 \
  --class-name TrackFeature
```

### Step 2: Update Build Process

1. **Update requirements.txt**:
   ```
   datamodel-code-generator>=0.25.0
   pydantic>=2.0.0
   python-dateutil>=2.8.0
   ```

2. **Modify Makefile Python generation section**:
   - Replace quicktype calls with datamodel-codegen
   - Add Pydantic imports to generated files
   - Ensure backward compatibility methods are included

3. **Update pyproject.toml dependencies**:
   ```toml
   dependencies = [
       "pydantic>=2.0.0",
       "python-dateutil>=2.8.0"
   ]
   ```

### Step 3: Handle Complex Schemas

Some schemas use advanced features that need special handling:

1. **oneOf/anyOf**: Ensure discriminated unions work correctly
2. **$ref**: Make sure cross-schema references resolve
3. **additionalProperties**: Handle flexible property schemas
4. **Custom validation**: Add field validators where needed

### Step 4: Test Integration

1. **Run existing tests**: Ensure backward compatibility
2. **Test tool-vault-packager**: Verify wheel integration works
3. **Test inheritance**: Create sample extended models
4. **Validate JSON Schema**: Ensure schema export works

### Step 5: Update Consumer Code

**tool-vault-packager changes**:
```python
# Before (current approach):
track_data = params.track_feature
base_track = TrackFeature.from_dict(track_data)

# After (clean inheritance):
class TrackFeatureWithSpeeds(TrackFeature):
    properties: TrackPropertiesWithSpeeds

# Direct Pydantic usage:
track_feature: TrackFeatureWithSpeeds = params.track_feature
```

## Benefits of Migration

### For Developers
1. **Clean inheritance**: Extend models naturally with `class Child(Parent)`
2. **Better validation**: Built-in Pydantic validation with clear error messages
3. **IDE support**: Full type hints and autocompletion
4. **JSON Schema export**: Generate schemas from models automatically

### For the Platform
1. **Consistency**: Both validation and type generation use Pydantic
2. **Maintainability**: Simpler constraint modeling in tools
3. **Extensibility**: Easy to add new constrained feature types
4. **Future-proof**: Pydantic is the Python standard for data modeling

## Risk Mitigation

### Clean Migration
- Generate pure Pydantic models without backward compatibility layers
- Update all consumers to use Pydantic patterns directly
- Remove quicktype dependency entirely

### Rollback Strategy
- Keep quicktype as fallback during transition
- Parallel generation during testing phase
- Feature flag to switch between generators

### Testing Strategy
1. **Unit tests**: Update tests to work with Pydantic models
2. **Integration tests**: Update tool-vault-packager and other consumers
3. **Schema validation**: Ensure JSON Schema roundtrip works
4. **Performance testing**: Verify performance with Pydantic validation

## Timeline

### Week 1: Setup and Proof of Concept
- Install datamodel-code-generator
- Generate Track schema with Pydantic
- Test inheritance patterns
- Validate backward compatibility

### Week 2: Build System Integration
- Update Makefile for all schemas
- Test parallel generation
- Update dependencies
- Run comprehensive tests

### Week 3: Consumer Testing
- Test tool-vault-packager integration
- Update track_speed_filter_fast to use inheritance
- Validate VS Code extension compatibility
- Performance testing

### Week 4: Production Deployment
- Final testing and validation
- Documentation updates
- Deploy to all environments
- Monitor for issues

## Success Criteria

1. **Pure Pydantic models generated** from all JSON schemas
2. **Clean inheritance works** in tool-vault-packager:
   ```python
   class TrackFeatureWithSpeeds(TrackFeature):
       properties: TrackPropertiesWithSpeeds
   ```
3. **JSON Schema generation** produces valid schemas from Pydantic models
4. **quicktype dependency removed** entirely from the build system
5. **All consumers updated** to use Pydantic patterns directly
6. **Performance maintained** or improved over quicktype

## Implementation Priority

**High Priority**: Enable clean inheritance for Issue #113 (Pydantic Tool Signatures)
**Medium Priority**: JSON Schema export from Pydantic models
**Low Priority**: Advanced validation features and custom field types

This migration directly supports the current work on Issue #113 by making constraint modeling much cleaner and more maintainable.