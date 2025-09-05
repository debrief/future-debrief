import React from 'react';
import { Polyline, Marker } from 'react-leaflet';
import * as L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { getFeatureStyle } from '../utils/featureUtils';
import { TimeState } from '@debrief/shared-types/derived/typescript/timestate';

interface TrackProps {
  feature: GeoJSONFeature;
  selectedFeatureIds: (string | number)[];
  onSelectionChange?: (selectedFeatureIds: (string | number)[]) => void;
  timeState?: TimeState;
}

export const Track: React.FC<TrackProps> = (props) => {
  const { feature, selectedFeatureIds, onSelectionChange, timeState } = props;
  
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

  const timeMarkerIcon = L.divIcon({
    className: 'time-marker',
    html: '<div />',
    iconSize: [12, 12],
  });

  let markerPosition: [number, number] | null = null;
  if (timeState?.current && feature.properties?.timestamps && Array.isArray(feature.properties.timestamps)) {
    const timestamps = feature.properties.timestamps as string[];
    const closestIndex = findClosestTimeIndex(timeState.current, timestamps);
    if (closestIndex !== -1) {
      if (feature.geometry.type === 'LineString') {
        const coords = (feature.geometry.coordinates as number[][])[closestIndex] as [number, number];
        markerPosition = [coords[1], coords[0]];
      } else if (feature.geometry.type === 'MultiLineString') {
        let pointCounter = 0;
        for (const line of (feature.geometry.coordinates as number[][][])) {
          if (closestIndex < pointCounter + line.length) {
            const coords = line[closestIndex - pointCounter] as [number, number];
            markerPosition = [coords[1], coords[0]];
            break;
          }
          pointCounter += line.length;
        }
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
      
      const featureId = feature.id !== undefined ? feature.id : Math.random();
      let newSelectedIds: (string | number)[];
      
      if (isSelected) {
        // Remove from selection
        newSelectedIds = selectedFeatureIds.filter(id => id !== feature.id);
      } else {
        // Add to selection
        newSelectedIds = [...selectedFeatureIds, featureId];
      }
      
      onSelectionChange(newSelectedIds);
    });
  };

  const style = getFeatureStyle(feature, isSelected);
  
  // Type guard and extract coordinates for LineString/MultiLineString
  if (feature.geometry.type !== 'LineString' && feature.geometry.type !== 'MultiLineString') {
    return null;
  }
  
  const coordinates = feature.geometry.type === 'LineString' 
    ? (feature.geometry.coordinates as number[][]).map(coord => [coord[1], coord[0]] as [number, number])
    : (feature.geometry.coordinates as number[][][]).map((lineString: number[][]) => 
        lineString.map((coord: number[]) => [coord[1], coord[0]] as [number, number])
      );

  const handlePathRef = (ref: L.Polyline | null) => {
    if (ref) {
      bindEventHandlers(ref);
    }
  };

  if (feature.geometry.type === 'MultiLineString') {
    return (
      <>
        {(coordinates as [number, number][][]).map((lineCoords, index) => (
          <Polyline
            key={index}
            ref={index === 0 ? handlePathRef : undefined}
            positions={lineCoords}
            pathOptions={style}
          />
        ))}
        {markerPosition && <Marker position={markerPosition} icon={timeMarkerIcon} />}
      </>
    );
  }

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