import React from 'react';
import { Polyline, Marker } from 'react-leaflet';
import * as L from 'leaflet';
import { getFeatureColor, getFeatureStyle } from '../utils/featureUtils';
import { DebriefTrackFeature, TimeState } from '@debrief/shared-types';
import '../MapComponent.css';

interface TrackProps {
  feature: DebriefTrackFeature;
  selectedFeatureIds: (string | number)[];
  onSelectionChange?: (selectedFeatureIds: (string | number)[]) => void;
  timeState?: TimeState;
}

export const Track: React.FC<TrackProps> = (props) => {
  const { feature, selectedFeatureIds, onSelectionChange, timeState } = props;

  // Return early if track is not visible
  if (feature.properties?.visible === false) {
    return null;
  }

  // Check if this feature is selected by ID
  const isSelected = selectedFeatureIds.some(id => feature.id === id);
  
  const findClosestTimeIndex = (currentTime: string, timestamps: string[]): number => {
    const now = new Date(currentTime).getTime();
    let closestIndex = -1;
    let minDiff = Infinity;

    for (let i = 0; i < timestamps.length; i++) {
      const tsTime = new Date(timestamps[i]).getTime();
      const diff = Math.abs(tsTime - now);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    return closestIndex;
  };

  // Cast for utility functions that expect GeoJSONFeature (structurally compatible)
  const trackColor = getFeatureColor(feature as unknown as GeoJSON.Feature);

  const timeMarkerIcon = L.divIcon({
    className: 'time-marker',
    html: `<div style="background-color: ${trackColor}; border: 1px solid ${trackColor}; border-radius: 5px; width: 100%; height: 100%; opacity: 0.8;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

  // Return early if geometry is null or not a track geometry type
  if (!feature.geometry || (feature.geometry.type !== 'LineString' && feature.geometry.type !== 'MultiLineString')) {
    return null;
  }

  // After the check above, geometry is guaranteed to be non-null and either LineString or MultiLineString
  const geometry = feature.geometry;

  let markerPosition: [number, number] | null = null;
  const timestamps = feature.properties?.timestamps;
  if (timeState?.current && timestamps && Array.isArray(timestamps)) {
    const closestIndex = findClosestTimeIndex(timeState.current, timestamps);
    if (closestIndex !== -1) {
      if (geometry.type === 'LineString') {
        const coordinates = geometry.coordinates as number[][];
        // Handle case where timestamps and coordinates arrays have different lengths
        // Map timestamp index to coordinate index proportionally
        const coordIndex = Math.min(
          Math.round((closestIndex / (timestamps.length - 1)) * (coordinates.length - 1)),
          coordinates.length - 1
        );
        const coords = coordinates[coordIndex] as [number, number];
        markerPosition = [coords[1], coords[0]];
        console.warn('Time marker position:', {
          coordIndex,
          coords,
          markerPosition
        });
      } else if (geometry.type === 'MultiLineString') {
        // For MultiLineString, we need to handle the mapping differently
        const allCoords: number[][] = [];
        for (const line of (geometry.coordinates as number[][][])) {
          allCoords.push(...line);
        }
        const coordIndex = Math.min(
          Math.round((closestIndex / (timestamps.length - 1)) * (allCoords.length - 1)),
          allCoords.length - 1
        );
        const coords = allCoords[coordIndex] as [number, number];
        markerPosition = [coords[1], coords[0]];
      }
    }
  }

  // Simple event handler for selection
  const bindEventHandlers = (layer: L.Layer) => {
    // Bind popup if feature has name
    if (feature.properties?.name) {
      layer.bindPopup(feature.properties.name);
    }
    
    // Add click handler for selection
    layer.on('click', (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      
      if (!onSelectionChange) return;
      
      // feature.id can be string | number | null | undefined per DebriefTrackFeature type
      const featureId = (feature.id !== undefined && feature.id !== null) ? feature.id : Math.random();
      let newSelectedIds: (string | number)[];

      if (isSelected) {
        // Remove from selection - filter by the actual id (which might be null)
        newSelectedIds = selectedFeatureIds.filter(id => id !== feature.id);
      } else {
        // Add to selection - use the computed featureId (never null)
        newSelectedIds = [...selectedFeatureIds, featureId];
      }
      
      onSelectionChange(newSelectedIds);
    });
  };

  // Cast for utility functions that expect GeoJSONFeature (structurally compatible)
  const style = getFeatureStyle(feature as unknown as GeoJSON.Feature, isSelected);

  // For selected tracks, create white outline style
  const outlineStyle = isSelected ? {
    color: '#ffffff',
    weight: 9,
    opacity: 1,
    interactive: false,
  } as L.PolylineOptions : null;

  const coordinates = geometry.type === 'LineString'
    ? (geometry.coordinates as number[][]).map(coord => [coord[1], coord[0]] as [number, number])
    : (geometry.coordinates as number[][][]).map((lineString: number[][]) =>
        lineString.map((coord: number[]) => [coord[1], coord[0]] as [number, number])
      );

  const handlePathRef = (ref: L.Polyline | null) => {
    if (ref) {
      bindEventHandlers(ref);
    }
  };

  if (geometry.type === 'MultiLineString') {
    if (isSelected) {
      return (
        <>
          {/* Render both outline and main line when selected */}
          {(coordinates as [number, number][][]).map((lineCoords, index) => (
            <React.Fragment key={`track-${index}`}>
              {/* White outline first */}
              <Polyline
                positions={lineCoords}
                pathOptions={outlineStyle!}
              />
              {/* Main colored line second - appears on top */}
              <Polyline
                ref={index === 0 ? handlePathRef : undefined}
                positions={lineCoords}
                pathOptions={style}
              />
            </React.Fragment>
          ))}
          {markerPosition && <Marker position={markerPosition} icon={timeMarkerIcon} />}
        </>
      );
    }

    // Not selected - just render main line
    return (
      <>
        {(coordinates as [number, number][][]).map((lineCoords, index) => (
          <Polyline
            key={`track-${index}`}
            ref={index === 0 ? handlePathRef : undefined}
            positions={lineCoords}
            pathOptions={style}
          />
        ))}
        {markerPosition && <Marker position={markerPosition} icon={timeMarkerIcon} />}
      </>
    );
  }

  if (isSelected) {
    return (
      <>
        {/* White outline first */}
        <Polyline
          positions={coordinates as [number, number][]}
          pathOptions={outlineStyle!}
        />
        {/* Main colored line second - appears on top */}
        <Polyline
          ref={handlePathRef}
          positions={coordinates as [number, number][]}
          pathOptions={style}
        />
        {markerPosition && <Marker position={markerPosition} icon={timeMarkerIcon} />}
      </>
    );
  }

  // Not selected - just render main line
  return (
    <>
      <Polyline
        ref={handlePathRef}
        positions={coordinates as [number, number][]}
        pathOptions={style}
      />
      {markerPosition && <Marker position={markerPosition} icon={timeMarkerIcon} />}
    </>
  );
};