# @debrief/web-components

Reusable web components for the Debrief ecosystem with dual consumption support (React + Vanilla JS).

## Overview

This library provides UI components that can be consumed in two ways:
1. **React Components** - For integration with React applications (like Albatross)
2. **Vanilla JS Widgets** - For integration with VS Code webviews and other non-React environments

## Installation

```bash
# Install as workspace dependency in the monorepo
pnpm add @debrief/web-components

# Or for external projects
npm install @debrief/web-components
```

## Components

### TimeController

A component for controlling time-based data playback and navigation.

**Props:**
- `currentTime?: Date` - The current time being displayed
- `startTime?: Date` - The start time of the time range
- `endTime?: Date` - The end time of the time range  
- `isPlaying?: boolean` - Whether playback is currently active
- `onTimeChange?: (time: Date) => void` - Callback when time changes
- `onPlayPause?: () => void` - Callback when play/pause is clicked
- `className?: string` - Additional CSS classes

### PropertiesView

A component for displaying key-value property pairs with optional editing.

**Props:**
- `properties?: Property[]` - Array of properties to display
- `title?: string` - Title for the properties panel (default: "Properties")
- `onPropertyChange?: (key: string, value: string | number | boolean) => void` - Callback when property changes
- `readonly?: boolean` - Whether properties are read-only (default: false)
- `className?: string` - Additional CSS classes

**Property Interface:**
```typescript
interface Property {
  key: string;
  value: string | number | boolean;
  type?: 'string' | 'number' | 'boolean';
}
```

## Usage Examples

### React Component Consumption

For use in React applications like Albatross:

```typescript
import { TimeController, PropertiesView } from '@debrief/web-components';

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  
  const properties = [
    { key: 'name', value: 'HMS Victory' },
    { key: 'speed', value: 12.5 },
    { key: 'heading', value: 270 },
    { key: 'active', value: true },
  ];

  return (
    <div>
      <TimeController
        currentTime={currentTime}
        isPlaying={isPlaying}
        onTimeChange={setCurrentTime}
        onPlayPause={() => setIsPlaying(!isPlaying)}
      />
      
      <PropertiesView
        title="Track Properties"
        properties={properties}
        readonly={false}
        onPropertyChange={(key, value) => console.log('Property changed:', key, '=', value)}
      />
    </div>
  );
}
```

### Vanilla JS Widget Consumption

For use in VS Code webviews and other non-React environments:

```typescript
// Direct import in TypeScript (e.g., plotJsonEditor.ts)
import { createTimeController, createPropertiesView } from '@debrief/web-components/vanilla';

// HTML structure
// <div id="time-controller"></div>
// <div id="properties-view"></div>

// Mount TimeController
const timeControllerElement = document.getElementById('time-controller');
const timeController = createTimeController(timeControllerElement, {
  currentTime: new Date(),
  isPlaying: false,
  onTimeChange: (time) => console.log('Time changed to:', time),
  onPlayPause: () => console.log('Play/Pause clicked')
});

// Mount PropertiesView  
const propertiesViewElement = document.getElementById('properties-view');
const propertiesView = createPropertiesView(propertiesViewElement, {
  title: 'Plot Properties',
  properties: [
    { key: 'name', value: 'Sample Plot' },
    { key: 'features', value: 0 }
  ],
  readonly: false,
  onPropertyChange: (key, value) => {
    console.log('Property updated:', key, '=', value);
  }
});

// Cleanup when needed
timeController.destroy();
propertiesView.destroy();
```

## Build Outputs

The library builds dual outputs to support both consumption patterns:

```
dist/
├── react/
│   ├── index.js          # React components bundle
│   ├── index.d.ts        # React TypeScript definitions
│   └── ...
└── vanilla/
    ├── index.js          # Vanilla JS widgets bundle (includes React runtime)
    ├── index.d.ts        # Vanilla JS TypeScript definitions
    └── ...
```

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build

# Run Storybook for component development
pnpm storybook

# Run tests
pnpm test
```

### Scripts

- `pnpm build` - Build both React and Vanilla JS outputs with TypeScript definitions
- `pnpm build:react` - Build React components only
- `pnpm build:vanilla` - Build Vanilla JS widgets only
- `pnpm build:types` - Generate TypeScript definitions
- `pnpm clean` - Clean build outputs
- `pnpm dev` / `pnpm storybook` - Start Storybook development server
- `pnpm test` - Run Jest tests
- `pnpm test:watch` - Run Jest in watch mode
- `pnpm typecheck` - Run TypeScript compiler check

### Storybook

Component stories are available for development and testing:

```bash
pnpm storybook
```

This will start a Storybook server at `http://localhost:6006` where you can interactively develop and test components.

### Testing

Tests are written with Jest and React Testing Library:

```bash
pnpm test          # Run all tests
pnpm test:watch    # Run tests in watch mode
```

## Architecture

### Dual Build System

The library uses esbuild for fast bundling with two distinct outputs:

1. **React Build** (`dist/react/`):
   - Bundles TypeScript/React components
   - Externalizes React and ReactDOM as peer dependencies
   - Optimized for React application consumption

2. **Vanilla Build** (`dist/vanilla/`):
   - Bundles React runtime along with components
   - Provides wrapper functions for vanilla JS consumption
   - Optimized for webview and non-React environments

### Component Structure

```
src/
├── index.ts              # React component exports
├── vanilla.ts            # Vanilla JS wrapper exports
├── TimeController/
│   ├── TimeController.tsx
│   ├── TimeController.stories.tsx
│   └── TimeController.test.tsx
└── PropertiesView/
    ├── PropertiesView.tsx
    ├── PropertiesView.stories.tsx
    └── PropertiesView.test.tsx
```

## Integration Points

### VS Code Extension Integration

The library is designed to replace the existing `media/plotJsonEditor.js` file in the VS Code extension. Components are imported directly in TypeScript:

```typescript
// Before: Separate media/plotJsonEditor.js file
// After: Direct import and mounting

import { createTimeController, createPropertiesView } from '@debrief/web-components/vanilla';

// Components are mounted directly in webview HTML containers
const timeController = createTimeController(
  document.getElementById('time-controller'),
  { /* props */ }
);
```

### Monorepo Integration

The library follows the established `/libs` pattern for reusable code consumed by apps:
- `apps/albatross` - React component consumption
- `apps/replay` - React component consumption  
- `apps/stac` - React component consumption
- `apps/toolvault` - React component consumption
- `apps/vs-code` - Vanilla JS widget consumption

## Contributing

1. Follow existing TypeScript/React conventions in the codebase
2. Maintain consistency with the established pnpm workspace structure
3. Add comprehensive tests for new components
4. Update Storybook stories for component documentation
5. Ensure both React and Vanilla JS consumption patterns work correctly

## License

MIT - See [LICENSE](../../LICENSE) file for details.