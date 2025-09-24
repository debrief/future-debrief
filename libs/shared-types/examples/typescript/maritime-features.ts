/**
 * TypeScript Usage Examples for Future Debrief Maritime Features
 *
 * This file demonstrates how to use the generated TypeScript types
 * from the JSON schemas for maritime data validation and manipulation.
 */

import {
    DebriefFeatureCollection,
    DebriefTrackFeature,
    DebriefPointFeature,
    DebriefAnnotationFeature
} from '../../src/types/features/debrief_feature_collection';
import { validateFeatureCollectionComprehensive } from '../../src/validators';

/**
 * Example 1: Creating a maritime vessel track
 */
export function createVesselTrack(): DebriefTrackFeature {
    const track: DebriefTrackFeature = {
        type: "Feature",
        dataType: "track",
        geometry: {
            type: "LineString",
            coordinates: [
                [-0.1276, 51.5074, 0], // London (lon, lat, depth)
                [-74.0060, 40.7128, 0], // New York
                [-122.4194, 37.7749, 0] // San Francisco
            ]
        },
        properties: {
            name: "Vessel Alpha",
            platform: "Merchant Vessel",
            timestamps: [
                "2024-09-24T08:00:00Z",
                "2024-09-24T14:00:00Z",
                "2024-09-24T20:00:00Z"
            ],
            course: [090, 270, 315],
            speed: [12.5, 18.3, 15.2],
            classification: "Friendly",
            color: "#00FF00"
        }
    };

    return track;
}

/**
 * Example 2: Creating a point of interest
 */
export function createPointOfInterest(): DebriefPointFeature {
    const point: DebriefPointFeature = {
        type: "Feature",
        dataType: "point",
        geometry: {
            type: "Point",
            coordinates: [-0.1276, 51.5074, 0] // London
        },
        properties: {
            name: "Port of London",
            platform: "Port Authority",
            timestamp: "2024-09-24T12:00:00Z",
            classification: "Neutral",
            color: "#0000FF"
        }
    };

    return point;
}

/**
 * Example 3: Creating an annotation
 */
export function createAnnotation(): DebriefAnnotationFeature {
    const annotation: DebriefAnnotationFeature = {
        type: "Feature",
        dataType: "annotation",
        geometry: {
            type: "Point",
            coordinates: [-74.0060, 40.7128, 0] // New York
        },
        properties: {
            name: "Critical Event",
            text: "Vessel Alpha entered territorial waters",
            timestamp: "2024-09-24T14:30:00Z",
            color: "#FF0000",
            classification: "Important"
        }
    };

    return annotation;
}

/**
 * Example 4: Creating a complete maritime feature collection
 */
export function createMaritimeScenario(): DebriefFeatureCollection {
    const featureCollection: DebriefFeatureCollection = {
        type: "FeatureCollection",
        dataType: "debrief",
        features: [
            createVesselTrack(),
            createPointOfInterest(),
            createAnnotation()
        ]
    };

    return featureCollection;
}

/**
 * Example 5: Validating maritime data
 */
export async function validateMaritimeData(): Promise<boolean> {
    const scenario = createMaritimeScenario();

    try {
        // Validate the complete feature collection
        const validationResult = validateFeatureCollectionComprehensive(scenario);

        if (validationResult.isValid) {
            console.log("✅ Maritime scenario is valid");
            console.log(`Features: ${scenario.features.length}`);
            console.log(`Track points: ${(scenario.features[0] as DebriefTrackFeature).geometry.coordinates.length}`);
            return true;
        } else {
            console.error("❌ Maritime scenario validation failed:");
            validationResult.errors.forEach(error => console.error(` - ${error}`));
            return false;
        }
    } catch (error) {
        console.error("❌ Validation error:", error);
        return false;
    }
}

/**
 * Example 6: Working with timestamps and coordinates
 */
export function analyzeMaritimeTimestampsAndCoordinates(track: DebriefTrackFeature): void {
    const { coordinates } = track.geometry;
    const { timestamps, course, speed } = track.properties;

    console.log(`Track Analysis for: ${track.properties.name}`);
    console.log(`Total waypoints: ${coordinates.length}`);

    // Validate timestamps match coordinates
    if (timestamps && timestamps.length === coordinates.length) {
        console.log("✅ Timestamps match coordinate count");

        coordinates.forEach((coord, index) => {
            const [lon, lat, depth = 0] = coord;
            const timestamp = timestamps[index];
            const heading = course ? course[index] : 'N/A';
            const velocity = speed ? speed[index] : 'N/A';

            console.log(`  ${index + 1}: ${timestamp} - [${lon}, ${lat}] ${depth}m - ${heading}° @ ${velocity}kts`);
        });
    } else {
        console.warn("⚠️ Timestamp and coordinate count mismatch");
    }
}

// Example usage
if (require.main === module) {
    console.log("🚢 Future Debrief Maritime TypeScript Examples");
    console.log("=" .repeat(50));

    const scenario = createMaritimeScenario();
    console.log(JSON.stringify(scenario, null, 2));

    validateMaritimeData();

    const track = createVesselTrack();
    analyzeMaritimeTimestampsAndCoordinates(track);
}