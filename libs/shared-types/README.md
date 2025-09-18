# @debrief/shared-types

Shared types for Debrief ecosystem with constrained GeoJSON FeatureCollections for maritime analysis.

## Overview

This package provides:

- **Pydantic model definitions** as the single source of truth for all data structures
- **Generated JSON Schema** automatically derived from Pydantic models
- **Generated TypeScript interfaces** from schemas using json-schema-to-typescript with proper discriminated unions
- **Generated Python models** distributed for runtime use
- **Manual validators** with cross-field validation logic for both TypeScript and Python
- **Comprehensive test suites** to ensure consistency across languages

## Features

### Pydantic-First Type Generation

**Important**: This package follows a **Pydantic-first approach** where Pydantic models are the single source of truth. All other artifacts are generated from these models:

```
Pydantic Models (python-src/debrief/types/) → JSON Schema (derived/json-schema/) → TypeScript Types (derived/typescript/ + src/types/)
```

**TypeScript Discriminated Unions**: TypeScript generation uses json-schema-to-typescript which properly handles oneOf schemas to create discriminated union types with literal discriminator properties (e.g., `featureType: "track"` instead of `featureType: string`), enabling automatic type narrowing.

```bash
npm run build        # Generate all types and prepare distribution
npm run build:ts     # Generate TypeScript types only
npm run build:python # Generate Python types only
```

### Pydantic Model-Driven Development

All types are derived from Pydantic model definitions in `python-src/debrief/types/`:

- `python-src/debrief/types/features/` - Maritime GeoJSON features (Track, Point, Annotation, FeatureCollection)
- `python-src/debrief/types/states/` - Application state models (TimeState, ViewportState, etc.)
- `python-src/debrief/types/tools/` - Tool metadata and index structures

### Cross-Field Validation

Manual validators provide critical validation logic not covered by JSON Schema:

- **Timestamps validation**: Array length must match coordinate points count
- **Time properties validation**: Point features support either single time OR time range
- **Geographic coordinate validation**: Coordinates within valid ranges
- **Annotation type validation**: Color formats, annotation types, etc.

## Usage

### TypeScript

**Note**: This is a source package. Import directly from the directories you need:

```typescript
// Import generated types directly
import { TrackFeature } from '@debrief/shared-types/src/types/track';
import { PointFeature } from '@debrief/shared-types/src/types/point';

// Import validators directly  
import { validateTrackFeature, validateTimestampsLength } from '@debrief/shared-types/src/validators/track-validator';

// Use generated types
const track: TrackFeature = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    coordinates: [[-1.0, 51.0], [-0.9, 51.1]]
  },
  properties: {
    timestamps: ['2024-01-01T10:00:00Z', '2024-01-01T10:01:00Z'],
    name: 'Sample Track'
  }
};

// Validate with cross-field rules
if (validateTrackFeature(track) && validateTimestampsLength(track)) {
  console.log('Valid track!');
}
```

### TypeScript Discriminated Union Example

```typescript
import { DebriefFeatureCollection, DebriefFeature } from '@debrief/shared-types';

function processFeature(feature: DebriefFeature) {
  // TypeScript automatically narrows the type based on discriminator
  if (feature.properties.featureType === 'track') {
    // feature is now typed as DebriefTrackFeature
    console.log(`Track with ${feature.properties.timestamps?.length} timestamps`);
  } else if (feature.properties.featureType === 'point') {
    // feature is now typed as DebriefPointFeature  
    console.log(`Point at time: ${feature.properties.time}`);
  } else if (feature.properties.featureType === 'annotation') {
    // feature is now typed as DebriefAnnotationFeature
    console.log(`Annotation: ${feature.properties.text}`);
  }
  // No manual type guards needed!
}

const collection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [/* ... */]
};

collection.features.forEach(processFeature);
```

### Python

```python
from debrief.validators import (
    validate_track_feature,
    validate_timestamps_length
)

# Validate track data
track_data = {
    'type': 'Feature',
    'id': 'track-001',
    'geometry': {
        'type': 'LineString',
        'coordinates': [[-1.0, 51.0], [-0.9, 51.1]]
    },
    'properties': {
        'timestamps': ['2024-01-01T10:00:00Z', '2024-01-01T10:01:00Z'],
        'name': 'Sample Track'
    }
}

if validate_track_feature(track_data) and validate_timestamps_length(track_data):
    print('Valid track!')
```

## Development

### Building

```bash
npm install              # Install dependencies
npm run build           # Generate types and prepare distribution
npm run test            # Run all tests
```

### Conditional Build System

For improved developer productivity, this package includes an intelligent conditional build system that only rebuilds what has changed:

```bash
npm run build:status    # Check what would be rebuilt and why
npm run build          # Smart conditional build (only builds what changed)
npm run build:ci       # Clean build for CI/CD environments
```

**Performance improvements:**
- **No changes**: ~1.4 seconds (85% improvement over unconditional build)
- **Schema changes**: Full regeneration + compile (~11 seconds)
- **Clean build**: Forces complete rebuild when needed

The system uses timestamp-based dependency tracking to determine when schemas are newer than generated files, dramatically improving development workflow speed.

### Testing

The package includes comprehensive test suites:

```bash
npm run test:generated  # Test that generated files exist and are valid
npm run test:validators # Test that validators work correctly  
npm run test:schemas    # Test JSON Schema validation
```

### Schema Validation

All schemas are validated using AJV and tested with sample data:

```bash
npm run test:schemas    # Validate schemas and test data
```

## Package Structure

```
libs/shared-types/
├── python-src/                # Python package structure
│   └── debrief/
│       ├── types/            # Pydantic model source files (source of truth)
│       │   ├── features/     # Maritime GeoJSON feature models
│       │   ├── states/       # Application state models
│       │   └── tools/        # Tool metadata and index models
│       ├── schemas/          # Python schema utilities
│       └── validators/       # Manual Python validators
├── derived/                   # Generated artifacts (not committed)
│   ├── json-schema/          # Generated JSON Schema files
│   └── typescript/           # Generated TypeScript types
├── src/                      # TypeScript package structure
│   ├── types/               # Generated TypeScript interfaces (not committed)
│   └── validators/          # Manual TypeScript validators
├── tests/                   # Test suites (typescript/, python/, json/)
├── examples/               # Usage examples and documentation
└── dist/                   # Distribution build output
```

## Key Design Principles

1. **Pydantic-First**: Pydantic models are the single source of truth
2. **Build-Generated Types**: Types generated by build process, not manually maintained
3. **Type Safety**: Pydantic provides runtime validation and type checking at the source
4. **Manual Validators**: Validation logic manually written and maintained
5. **Cross-Language Consistency**: Identical validation behavior in TS and Python
6. **Comprehensive Testing**: Tests ensure generated files exist and validators work

## Version Compatibility

- **Node.js**: >=16.0.0
- **Python**: >=3.8
- **TypeScript**: >=4.0

## License

MIT

## Contributing

1. Modify Pydantic models in `python-src/debrief/types/features/`, `python-src/debrief/types/states/`, or `python-src/debrief/types/tools/` directories
2. Run `npm run build` to regenerate JSON schemas and types
3. Update validators in `src/validators/` or `python-src/debrief/validators/` if needed (manual)
4. Run `npm run test` to ensure everything works
5. Submit PR

The Pydantic-first approach ensures type safety at the source and reduces maintenance overhead while allowing validators to mature over time.