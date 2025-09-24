/**
 * TypeScript Usage Examples for Future Debrief State Management
 *
 * This file demonstrates how to use the generated TypeScript types
 * for application state management in maritime analysis scenarios.
 */

import {
    TimeState,
    ViewportState,
    SelectionState,
    EditorState,
    CurrentState
} from '../../src/types/states/current_state';

/**
 * Example 1: Managing time state for maritime analysis
 */
export function createTimeState(): TimeState {
    const timeState: TimeState = {
        currentTime: "2024-09-24T12:00:00Z",
        startTime: "2024-09-24T00:00:00Z",
        endTime: "2024-09-25T00:00:00Z",
        playbackRate: 1.0,
        isPlaying: false
    };

    return timeState;
}

/**
 * Example 2: Managing viewport state for maritime maps
 */
export function createViewportState(): ViewportState {
    const viewportState: ViewportState = {
        center: [-0.1276, 51.5074], // London coordinates
        zoom: 8,
        bearing: 0,
        pitch: 0
    };

    return viewportState;
}

/**
 * Example 3: Managing selection state for maritime features
 */
export function createSelectionState(): SelectionState {
    const selectionState: SelectionState = {
        selectedFeatureIds: ["vessel-alpha", "port-london"],
        hoveredFeatureId: "vessel-alpha"
    };

    return selectionState;
}

/**
 * Example 4: Managing editor state for maritime scenarios
 */
export function createEditorState(): EditorState {
    const editorState: EditorState = {
        mode: "select", // or "pan", "draw", "edit"
        tool: "pointer",
        isEditing: false,
        snapToGrid: false,
        gridSize: 100
    };

    return editorState;
}

/**
 * Example 5: Creating complete current state
 */
export function createCurrentState(): CurrentState {
    const currentState: CurrentState = {
        time: createTimeState(),
        viewport: createViewportState(),
        selection: createSelectionState(),
        editor: createEditorState()
    };

    return currentState;
}

/**
 * Example 6: State update handlers for maritime analysis
 */
export class MaritimeStateManager {
    private state: CurrentState;
    private listeners: Array<(state: CurrentState) => void> = [];

    constructor(initialState?: CurrentState) {
        this.state = initialState || createCurrentState();
    }

    /**
     * Get current state
     */
    getState(): CurrentState {
        return { ...this.state };
    }

    /**
     * Update time state - useful for playback control
     */
    updateTimeState(updates: Partial<TimeState>): void {
        this.state = {
            ...this.state,
            time: {
                ...this.state.time,
                ...updates
            }
        };
        this.notifyListeners();
    }

    /**
     * Update viewport state - useful for map navigation
     */
    updateViewportState(updates: Partial<ViewportState>): void {
        this.state = {
            ...this.state,
            viewport: {
                ...this.state.viewport,
                ...updates
            }
        };
        this.notifyListeners();
    }

    /**
     * Update selection state - useful for feature interaction
     */
    updateSelectionState(updates: Partial<SelectionState>): void {
        this.state = {
            ...this.state,
            selection: {
                ...this.state.selection,
                ...updates
            }
        };
        this.notifyListeners();
    }

    /**
     * Update editor state - useful for editing mode changes
     */
    updateEditorState(updates: Partial<EditorState>): void {
        this.state = {
            ...this.state,
            editor: {
                ...this.state.editor,
                ...updates
            }
        };
        this.notifyListeners();
    }

    /**
     * Subscribe to state changes
     */
    subscribe(listener: (state: CurrentState) => void): () => void {
        this.listeners.push(listener);

        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all listeners of state changes
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.state));
    }

    /**
     * Maritime-specific state operations
     */

    /**
     * Start/stop time playback
     */
    togglePlayback(): void {
        this.updateTimeState({
            isPlaying: !this.state.time.isPlaying
        });
    }

    /**
     * Jump to specific time
     */
    jumpToTime(timestamp: string): void {
        this.updateTimeState({
            currentTime: timestamp,
            isPlaying: false
        });
    }

    /**
     * Select vessel or maritime feature
     */
    selectFeature(featureId: string, addToSelection: boolean = false): void {
        const currentSelection = this.state.selection.selectedFeatureIds || [];

        let newSelection: string[];
        if (addToSelection) {
            newSelection = currentSelection.includes(featureId)
                ? currentSelection.filter(id => id !== featureId)
                : [...currentSelection, featureId];
        } else {
            newSelection = [featureId];
        }

        this.updateSelectionState({
            selectedFeatureIds: newSelection
        });
    }

    /**
     * Clear all selections
     */
    clearSelection(): void {
        this.updateSelectionState({
            selectedFeatureIds: [],
            hoveredFeatureId: undefined
        });
    }

    /**
     * Focus viewport on geographic location
     */
    focusOnLocation(longitude: number, latitude: number, zoom?: number): void {
        this.updateViewportState({
            center: [longitude, latitude],
            zoom: zoom || this.state.viewport.zoom
        });
    }

    /**
     * Enter track editing mode
     */
    enterTrackEditMode(): void {
        this.updateEditorState({
            mode: "edit",
            tool: "track",
            isEditing: true
        });
    }

    /**
     * Exit editing mode
     */
    exitEditMode(): void {
        this.updateEditorState({
            mode: "select",
            tool: "pointer",
            isEditing: false
        });
    }
}

/**
 * Example 7: Maritime scenario state management
 */
export function demonstrateMaritimeStateManagement(): void {
    console.log("🚢 Maritime State Management Demo");
    console.log("=" .repeat(40));

    // Create state manager
    const stateManager = new MaritimeStateManager();

    // Subscribe to state changes
    const unsubscribe = stateManager.subscribe((state) => {
        console.log("🔄 State updated:", {
            time: state.time.currentTime,
            center: state.viewport.center,
            selectedFeatures: state.selection.selectedFeatureIds?.length || 0,
            editorMode: state.editor.mode
        });
    });

    // Simulate maritime analysis workflow
    console.log("\n1. Starting time playback...");
    stateManager.togglePlayback();

    console.log("\n2. Focusing on London...");
    stateManager.focusOnLocation(-0.1276, 51.5074, 10);

    console.log("\n3. Selecting vessel...");
    stateManager.selectFeature("vessel-alpha");

    console.log("\n4. Adding port to selection...");
    stateManager.selectFeature("port-london", true);

    console.log("\n5. Jumping to specific time...");
    stateManager.jumpToTime("2024-09-24T14:30:00Z");

    console.log("\n6. Entering track editing mode...");
    stateManager.enterTrackEditMode();

    console.log("\n7. Clearing selection...");
    stateManager.clearSelection();

    console.log("\n8. Exiting edit mode...");
    stateManager.exitEditMode();

    // Clean up
    unsubscribe();
    console.log("\n✅ Demo completed successfully!");
}

// Example usage
if (require.main === module) {
    demonstrateMaritimeStateManagement();
}