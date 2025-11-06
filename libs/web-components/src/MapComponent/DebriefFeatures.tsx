import React from 'react';
import { GeoJSONFeatureCollection } from './MapComponent';
import { DebriefTrackFeature, TimeState } from '@debrief/shared-types';
import { Track } from './features/Track';
import { Point } from './features/Point';
import { Zone } from './features/Zone';
import { StandardGeoJSON } from './features/StandardGeoJSON';

interface DebriefFeaturesProps {
  /** GeoJSON feature collection data */
  geoJsonData: GeoJSONFeatureCollection;
  /** Array of feature IDs to select */
  selectedFeatureIds: (string | number)[];
  /** Callback when feature is selected/deselected */
  onSelectionChange?: (selectedFeatureIds: (string | number)[]) => void;
  /** Current time state */
  timeState?: TimeState;
}

/**
 * DebriefFeatures component manages the rendering of all features in a GeoJSON collection.
 * It routes features to appropriate specialized renderers based on dataType and geometry.
 * This component encapsulates all feature management logic, keeping MapComponent focused on map-level concerns.
 */
export const DebriefFeatures: React.FC<DebriefFeaturesProps> = ({
  geoJsonData,
  selectedFeatureIds,
  onSelectionChange,
  timeState
}) => {
  return (
    <>
      {geoJsonData.features
        .filter(feature => feature.properties?.dataType !== 'metadata')
        .map((feature, index) => {
          const dataType = feature.properties?.dataType;
          const commonProps = {
            feature,
            selectedFeatureIds,
            onSelectionChange,
            timeState
          };
          // Create a key that includes property changes to force re-render when properties change
          const markerColor = feature.properties?.marker_color || feature.properties?.color;
          const visible = feature.properties?.visible;
          const key = `${feature.id || index}-${markerColor || ''}-${visible !== undefined ? visible : 'true'}`;

          // Route features to appropriate specialized renderers
          if (dataType === 'track' && (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString')) {
            // Type assertion: we've validated this is a track feature with track geometry
            return <Track key={key} {...commonProps} feature={feature as unknown as DebriefTrackFeature} />;
          }

          if (dataType === 'reference-point' && (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint')) {
            return <Point key={key} {...commonProps} />;
          }

          if (dataType === 'annotation') {
            return <Zone key={key} {...commonProps} />;
          }

          // Fallback to standard GeoJSON rendering for unrecognized types
          return <StandardGeoJSON key={key} {...commonProps} />;
        })}
    </>
  );
};