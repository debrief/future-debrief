# TimeController Component Usage Guide

## Overview

The TimeController component provides temporal navigation for maritime datasets through an interactive slider interface with live time display and adaptive tick marks. It enables analysts to scrub through time-based data with precise control and immediate visual feedback.

## Features

### Phase 1 (Current Implementation)

- **3-Row Layout**: Clear visual hierarchy with current time, slider, and range display
- **Adaptive Tick Marks**: Dynamic tick spacing based on dataset time span
- **Multiple Time Formats**: Support for Plain English, Unix timestamp, and Royal Navy formats
- **Keyboard Navigation**: Full keyboard accessibility (Arrow keys, Home/End, PageUp/Down)
- **Mouse Wheel Support**: Scrub through time using mouse wheel
- **VS Code Theme Integration**: Automatically adapts to light/dark themes
- **Performance Optimized**: Smooth 60fps scrubbing even with large datasets

## Basic Usage

### React Component

```typescript
import { TimeController } from '@debrief/web-components';
import { TimeState } from '@debrief/shared-types';

function MyComponent() {
  const [timeState, setTimeState] = useState<TimeState>({
    current: '2024-01-15T12:00:00Z',
    start: '2024-01-15T08:00:00Z',
    end: '2024-01-15T16:00:00Z',
  });

  const handleTimeChange = (newTime: string) => {
    setTimeState(prev => ({ ...prev, current: newTime }));
  };

  return (
    <TimeController
      timeState={timeState}
      timeFormat="plain"
      onTimeChange={handleTimeChange}
    />
  );
}
```

### Vanilla JavaScript

```javascript
const container = document.getElementById('time-controller-container');
const timeState = {
  current: '2024-01-15T12:00:00Z',
  start: '2024-01-15T08:00:00Z',
  end: '2024-01-15T16:00:00Z',
};

const controller = window.DebriefWebComponents.createTimeController(container, {
  timeState,
  timeFormat: 'plain',
  onTimeChange: (time) => {
    console.log('Time changed to:', time);
  },
});

// Update time programmatically
controller.updateProps({
  timeState: {
    ...timeState,
    current: '2024-01-15T14:00:00Z',
  },
});
```

## Props API

### TimeControllerProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `timeState` | `TimeState` | required | Current time and range boundaries |
| `timeFormat` | `'plain' \| 'unix' \| 'rn-short' \| 'rn-long'` | `'plain'` | Time display format |
| `onTimeChange` | `(time: string) => void` | optional | Callback when time changes |
| `className` | `string` | `''` | Additional CSS class names |

### TimeState Interface

```typescript
interface TimeState {
  current: string;  // ISO 8601 datetime string
  start: string;    // ISO 8601 datetime string
  end: string;      // ISO 8601 datetime string
}
```

## Time Formats

### Royal Navy Short (`rn-short`) - **Default**
**Format**: `DDHHMMZ`
**Example**: `151430Z`
**Use Case**: Compact military time notation (default format)

### Plain English (`plain`)
**Format**: `MMM DD, YYYY, HH:MM:SS UTC`
**Example**: `Jan 15, 2024, 14:30:00 UTC`
**Use Case**: General purpose, human-readable format

### ISO 8601 (`iso`)
**Format**: `YYYY-MM-DDTHH:MM:SS.sssZ`
**Example**: `2024-01-15T14:30:00.000Z`
**Use Case**: Technical debugging, system integration, API compatibility

### Royal Navy Long (`rn-long`)
**Format**: `MMM DDHHMMZ`
**Example**: `JAN 151430Z`
**Use Case**: Military time with month context

## Keyboard Navigation

| Key | Action |
|-----|--------|
| **Arrow Left/Down** | Move back 1% of time range |
| **Arrow Right/Up** | Move forward 1% of time range |
| **Page Down** | Move back 10% of time range |
| **Page Up** | Move forward 10% of time range |
| **Home** | Jump to start of range |
| **End** | Jump to end of range |

## Mouse Wheel Navigation

When the TimeController panel has focus, the mouse wheel can be used to scrub through time:
- **Scroll down**: Move backward in time (1% per notch)
- **Scroll up**: Move forward in time (1% per notch)

## Adaptive Tick Marks

The slider automatically adjusts tick mark spacing based on the dataset time span:

| Time Span | Tick Interval |
|-----------|--------------|
| < 1 hour | 5 minutes |
| 1-6 hours | 30 minutes |
| 6-24 hours | 2 hours |
| 1-7 days | 6 hours |
| 7-30 days | 1 day |
| 30-90 days | 7 days |
| > 90 days | 30 days |

## Performance Considerations

### Large Datasets

The TimeController is optimized for maritime datasets spanning days, months, or even years:

- **Throttled Updates**: State updates are throttled to 60fps (16ms intervals)
- **Efficient Rendering**: Tick marks are calculated once per range change
- **Smooth Scrubbing**: requestAnimationFrame ensures fluid interaction

### Best Practices

```typescript
// ✅ Good: Update only when necessary
const handleTimeChange = useCallback((time: string) => {
  if (time !== currentTime) {
    updateApplicationState(time);
  }
}, [currentTime]);

// ❌ Avoid: Heavy operations on every change
const handleTimeChange = (time: string) => {
  reloadEntireDataset();  // Too slow!
  recalculateAllFeatures();
};
```

## Integration with GlobalController

In the VS Code extension, TimeController integrates with the GlobalController state management system:

```typescript
// apps/vs-code/src/providers/panels/timeControllerProvider.ts
const timeState = this._globalController.getStateSlice(editorId, 'timeState');

// Update GlobalController when time changes
this._globalController.updateState(editorId, 'timeState', {
  ...timeState,
  current: newTime,
});
```

## Styling and Theming

### VS Code Theme Variables

The component automatically uses VS Code theme colors:

```css
--vscode-editor-background
--vscode-editor-foreground
--vscode-panel-border
--vscode-button-background
--vscode-button-hoverBackground
--vscode-descriptionForeground
--vscode-focusBorder
```

### Custom Styling

```css
/* Override default styles */
.time-controller {
  padding: 20px;
}

.time-current-row .current-time {
  font-size: 18px;
  font-weight: bold;
}

.time-slider {
  height: 8px;
}
```

## Edge Cases

### No Time Range Available

When timeState is missing or incomplete, the component displays a fallback message:

```typescript
<TimeController timeState={null} />
// Displays: "TimeController: No time range available"
```

### Single Timestamp

For datasets with no time range (start === end), the slider is disabled but displays the timestamp.

### Very Short Ranges

The component handles ranges as short as minutes with appropriate tick spacing.

### Very Long Ranges

For ranges spanning years, tick marks are spaced appropriately (30-day intervals).

## Testing

### Unit Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeController } from '@debrief/web-components';

test('handles keyboard navigation', () => {
  const onTimeChange = jest.fn();
  render(<TimeController timeState={mockState} onTimeChange={onTimeChange} />);

  const slider = screen.getByTestId('time-slider');
  fireEvent.keyDown(slider, { key: 'ArrowRight' });

  expect(onTimeChange).toHaveBeenCalled();
});
```

### Storybook Examples

Run Storybook to explore all TimeController variations:

```bash
cd libs/web-components
pnpm storybook
```

Navigate to: **Components → TimeController**

## Future Enhancements (Phase 2)

The following features are planned for future releases:

- Play/Pause button with auto-advancement
- Frame-by-frame step controls
- Range selection (in/out markers)
- Playback speed control (1x, 2x, 5x, 10x)
- Looping functionality
- Event density overlays on timeline

## Troubleshooting

### Time not updating

**Problem**: Slider moves but time doesn't change
**Solution**: Ensure `onTimeChange` callback is properly bound

### Tick marks not visible

**Problem**: No tick marks appear on slider
**Solution**: Check that time range is valid (start < end)

### Poor performance

**Problem**: Slider feels laggy during scrubbing
**Solution**: Ensure parent component isn't re-rendering unnecessarily. Use `React.memo` or `useCallback`.

### Mouse wheel not working

**Problem**: Mouse wheel doesn't scrub time
**Solution**: Ensure the TimeController panel has focus (click on it first)

## Related Components

- **MapComponent**: Displays maritime features that change with time
- **CurrentStateTable**: Shows time-based state information
- **PropertiesView**: Displays properties that may be time-dependent

## Support

For issues or questions:
- GitHub Issues: https://github.com/debrief/future-debrief/issues
- Documentation: `/libs/web-components/docs/`
