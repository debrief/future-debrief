// To parse this data:
//
//   import { Convert, DebriefFeatureCollection } from "./file";
//
//   const debriefFeatureCollection = Convert.toDebriefFeatureCollection(json);
//
// Manually created discriminated union version of FeatureCollection
// This creates proper TypeScript discriminated unions for features

import { TrackFeature } from './track';
import { PointFeature } from './point';
import { AnnotationFeature } from './annotation';

// Create a proper discriminated union based on featureType
export type DebriefFeature = TrackFeature | PointFeature | AnnotationFeature;

/**
 * A GeoJSON FeatureCollection containing mixed feature types for maritime analysis
 */
export interface DebriefFeatureCollection {
    /**
     * Bounding box of the feature collection
     */
    bbox?: number[];
    features: DebriefFeature[];
    properties?: DebriefFeatureCollectionProperties;
    type: "FeatureCollection";
}

export interface DebriefFeatureCollectionProperties {
    /**
     * When this collection was created
     */
    created?: Date;
    /**
     * Description of this feature collection
     */
    description?: string;
    /**
     * When this collection was last modified
     */
    modified?: Date;
    /**
     * Human readable name for this collection
     */
    name?: string;
    /**
     * Version of this collection
     */
    version?: string;
    [property: string]: any;
}

// Type guards for discriminated union
export function isTrackFeature(feature: DebriefFeature): feature is TrackFeature {
    return feature.properties.featureType === 'track';
}

export function isPointFeature(feature: DebriefFeature): feature is PointFeature {
    return feature.properties.featureType === 'point';
}

export function isAnnotationFeature(feature: DebriefFeature): feature is AnnotationFeature {
    return feature.properties.featureType === 'annotation';
}

// Converts JSON strings to/from your types
// Basic conversion support for DebriefFeatureCollection
export class Convert {
    public static toDebriefFeatureCollection(json: string): DebriefFeatureCollection {
        const data = JSON.parse(json);
        
        // Convert date strings to Date objects
        if (data.properties?.created) {
            data.properties.created = new Date(data.properties.created);
        }
        if (data.properties?.modified) {
            data.properties.modified = new Date(data.properties.modified);
        }
        
        // Convert timestamps for features
        data.features?.forEach((feature: any) => {
            if (feature.properties?.time) {
                feature.properties.time = new Date(feature.properties.time);
            }
            if (feature.properties?.timeStart) {
                feature.properties.timeStart = new Date(feature.properties.timeStart);
            }
            if (feature.properties?.timeEnd) {
                feature.properties.timeEnd = new Date(feature.properties.timeEnd);
            }
            if (feature.properties?.timestamps) {
                feature.properties.timestamps = feature.properties.timestamps.map((t: string) => new Date(t));
            }
        });
        
        return data as DebriefFeatureCollection;
    }

    public static debriefFeatureCollectionToJson(value: DebriefFeatureCollection): string {
        return JSON.stringify(value, null, 2);
    }
}