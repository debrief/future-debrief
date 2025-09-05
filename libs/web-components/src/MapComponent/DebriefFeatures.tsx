import React from 'react';
import { GeoJSONFeature, GeoJSONFeatureCollection } from './MapComponent';
import { TrackPolyline } from './renderers/TrackPolyline';
import { PointMarker } from './renderers/PointMarker';
import { ZonePolygon } from './renderers/ZonePolygon';
import { StandardGeoJSON } from './renderers/StandardGeoJSON';

interface DebriefFeaturesProps {
  /** GeoJSON feature collection data */
  geoJsonData: GeoJSONFeatureCollection;
  /** Array of feature indices to select */
  selectedFeatureIndices: number[];
  /** Array of feature IDs to select */
  selectedFeatureIds: (string | number)[];
  /** Feature index to highlight */
  highlightFeatureIndex?: number;
  /** Callback when feature is selected/deselected */
  onSelectionChange?: (selectedFeatures: GeoJSONFeature[], selectedIndices: number[]) => void;
}

/**
 * DebriefFeatures component manages the rendering of all features in a GeoJSON collection.
 * It routes features to appropriate specialized renderers based on dataType and geometry.
 * This component encapsulates all feature management logic, keeping MapComponent focused on map-level concerns.
 */
export const DebriefFeatures: React.FC<DebriefFeaturesProps> = ({
  geoJsonData,
  selectedFeatureIndices,
  selectedFeatureIds,
  highlightFeatureIndex,
  onSelectionChange
}) => {
  return (
    <>
      {geoJsonData.features.map((feature, index) => {
        const dataType = feature.properties?.dataType;
        const commonProps = {
          feature,
          featureIndex: index,
          selectedFeatureIndices,
          selectedFeatureIds,
          highlightFeatureIndex,
          onSelectionChange,
          geoJsonData
        };
        const key = feature.id || index;

        // Route features to appropriate specialized renderers
        if (dataType === 'track' && (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString')) {
          return <TrackPolyline key={key} {...commonProps} />;
        }
        
        if (dataType === 'reference-point' && (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint')) {
          return <PointMarker key={key} {...commonProps} />;
        }
        
        if (dataType === 'zone') {
          return <ZonePolygon key={key} {...commonProps} />;
        }
        
        // Fallback to standard GeoJSON rendering for unrecognized types
        return <StandardGeoJSON key={key} {...commonProps} />;
      })}
    </>
  );
};